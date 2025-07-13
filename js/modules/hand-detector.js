import * as vision from 'vision';
import * as THREE from 'three';

export class HandDetector {
    constructor(videoElement, camera) {
        this.videoElement = videoElement;
        this.camera = camera;
        this.handLandmarker = null;
        this.isReady = false;
        
        // Hand tracking data
        this.hands = [];
        this.lastDetectionTime = 0;
        
        // Velocity tracking
        this.previousFingertips = new Map(); // Store previous positions for velocity calculation
        this.velocityHistory = new Map(); // Store velocity history for smoothing
        this.maxVelocityHistory = 5; // Number of frames to average
        
        // Fingertip indices in MediaPipe hand landmarks - ONLY INDEX FINGER for precision
        this.fingertipIndices = [8]; // Only index fingertip for precise slicing
        
        // Coordinate conversion parameters
        this.videoWidth = 1280;
        this.videoHeight = 720;
    }
    
    async initialize() {
        try {
            // Setup MediaPipe FilesetResolver
            const filesetResolver = await vision.FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
            );
            
            // Create HandLandmarker
            this.handLandmarker = await vision.HandLandmarker.createFromOptions(
                filesetResolver,
                {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 2, // Track up to 2 hands
                    minHandDetectionConfidence: 0.5,
                    minHandPresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5
                }
            );
            
            this.isReady = true;
            
        } catch (error) {
            console.error('HandDetector initialization failed:', error);
            throw error;
        }
    }
    
    update() {
        if (!this.isReady || !this.handLandmarker) return;
        
        try {
            // Detect hands in current video frame
            const results = this.handLandmarker.detectForVideo(
                this.videoElement, 
                performance.now()
            );
            
            // Process detection results
            this.processHandResults(results);
            this.lastDetectionTime = performance.now();
            
        } catch (error) {
            console.error('Hand detection error:', error);
        }
    }
    
    processHandResults(results) {
        this.hands = [];
        
        if (results.landmarks && results.landmarks.length > 0) {
            for (let i = 0; i < results.landmarks.length; i++) {
                const landmarks = results.landmarks[i];
                const handedness = results.handednesses[i];
                
                // Convert landmarks to world coordinates
                const worldLandmarks = this.convertLandmarksToWorld(landmarks);
                
                // Extract fingertip positions
                const fingertips = this.extractFingertips(worldLandmarks, i);
                
                // Store hand data
                this.hands.push({
                    id: i,
                    handedness: handedness[0].categoryName, // "Left" or "Right"
                    confidence: handedness[0].score,
                    landmarks: worldLandmarks,
                    fingertips: fingertips
                });
            }
        }
        
        // Clean up velocity history for hands no longer detected
        this.cleanupVelocityHistory();
    }
    
    convertLandmarksToWorld(landmarks) {
        const worldLandmarks = [];
        
        for (const landmark of landmarks) {
            // Convert normalized coordinates [0,1] to screen coordinates
            const screenX = landmark.x * this.videoWidth;
            const screenY = landmark.y * this.videoHeight;
            
            // Convert screen coordinates to Three.js world coordinates
            // Camera feed is horizontally flipped, so flip X coordinate
            const worldX = -((screenX / this.videoWidth) * 2 - 1) * 4; // Flipped and -4 to +4 range
            const worldY = -((screenY / this.videoHeight) * 2 - 1) * 3; // -3 to +3 range (flipped Y)
            const worldZ = -landmark.z * 2; // MediaPipe Z is relative depth
            
            worldLandmarks.push(new THREE.Vector3(worldX, worldY, worldZ));
        }
        
        return worldLandmarks;
    }
    
    extractFingertips(landmarks, handId) {
        const fingertips = [];
        const currentTime = performance.now();
        
        for (const index of this.fingertipIndices) {
            if (landmarks[index]) {
                const fingertipId = `${handId}_${index}`;
                const currentPosition = landmarks[index].clone();
                
                // Calculate velocity
                const velocity = this.calculateFingertipVelocity(
                    fingertipId, 
                    currentPosition, 
                    currentTime
                );
                
                fingertips.push({
                    position: currentPosition,
                    type: this.getFingertipType(index),
                    velocity: velocity,
                    id: fingertipId
                });
            }
        }
        
        return fingertips;
    }
    
    calculateFingertipVelocity(fingertipId, currentPosition, currentTime) {
        // Get previous position and time
        const previousData = this.previousFingertips.get(fingertipId);
        
        if (!previousData) {
            // First frame for this fingertip
            this.previousFingertips.set(fingertipId, {
                position: currentPosition.clone(),
                time: currentTime
            });
            return 0;
        }
        
        // Calculate velocity
        const deltaTime = (currentTime - previousData.time) / 1000; // Convert to seconds
        const deltaPosition = currentPosition.distanceTo(previousData.position);
        const velocity = deltaTime > 0 ? deltaPosition / deltaTime : 0;
        
        // Update previous position
        this.previousFingertips.set(fingertipId, {
            position: currentPosition.clone(),
            time: currentTime
        });
        
        // Store velocity in history for smoothing
        this.updateVelocityHistory(fingertipId, velocity);
        
        // Return smoothed velocity
        return this.getSmoothedVelocity(fingertipId);
    }
    
    updateVelocityHistory(fingertipId, velocity) {
        if (!this.velocityHistory.has(fingertipId)) {
            this.velocityHistory.set(fingertipId, []);
        }
        
        const history = this.velocityHistory.get(fingertipId);
        history.push(velocity);
        
        // Keep only recent history
        if (history.length > this.maxVelocityHistory) {
            history.shift();
        }
    }
    
    getSmoothedVelocity(fingertipId) {
        const history = this.velocityHistory.get(fingertipId);
        if (!history || history.length === 0) return 0;
        
        // Calculate average velocity
        const sum = history.reduce((a, b) => a + b, 0);
        return sum / history.length;
    }
    
    cleanupVelocityHistory() {
        // Remove velocity data for fingertips no longer detected
        const currentFingertipIds = new Set();
        
        for (const hand of this.hands) {
            for (const fingertip of hand.fingertips) {
                currentFingertipIds.add(fingertip.id);
            }
        }
        
        // Clean up old fingertip data
        for (const [fingertipId] of this.previousFingertips) {
            if (!currentFingertipIds.has(fingertipId)) {
                this.previousFingertips.delete(fingertipId);
                this.velocityHistory.delete(fingertipId);
            }
        }
    }
    
    getFingertipType(index) {
        // Only index finger is tracked now
        if (index === 8) return 'index';
        return 'unknown';
    }
    
    // Get all active fingertip positions for collision detection
    getAllFingertips() {
        const allFingertips = [];
        
        for (const hand of this.hands) {
            for (const fingertip of hand.fingertips) {
                allFingertips.push({
                    position: fingertip.position,
                    type: fingertip.type,
                    handedness: hand.handedness,
                    velocity: fingertip.velocity,
                    id: fingertip.id
                });
            }
        }
        
        return allFingertips;
    }
    
    // Get specific fingertip types (useful for different gestures)
    getFingertipsByType(type) {
        return this.getAllFingertips().filter(ft => ft.type === type);
    }
    
    // Check if hands are detected
    hasHands() {
        return this.hands.length > 0;
    }
    
    // Get number of detected hands
    getHandCount() {
        return this.hands.length;
    }
    
    // Get detection confidence
    getAverageConfidence() {
        if (this.hands.length === 0) return 0;
        
        const totalConfidence = this.hands.reduce((sum, hand) => sum + hand.confidence, 0);
        return totalConfidence / this.hands.length;
    }
    
    // Get maximum velocity among all fingertips
    getMaxVelocity() {
        const fingertips = this.getAllFingertips();
        if (fingertips.length === 0) return 0;
        
        return Math.max(...fingertips.map(ft => ft.velocity));
    }
    
    // Debug information
    getDebugInfo() {
        return {
            handsDetected: this.hands.length,
            averageConfidence: this.getAverageConfidence().toFixed(2),
            totalFingertips: this.getAllFingertips().length,
            maxVelocity: this.getMaxVelocity().toFixed(2),
            lastDetection: performance.now() - this.lastDetectionTime,
            trackingDataSize: this.previousFingertips.size
        };
    }
}