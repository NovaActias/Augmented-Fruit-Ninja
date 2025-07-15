import * as vision from 'vision';
import * as THREE from 'three';

/**
 * Hand Detector Class
 * 
 * Advanced hand tracking system using Google's MediaPipe for real-time gesture recognition.
 * This class handles the complex process of detecting hand landmarks in video streams,
 * converting them to 3D world coordinates, and tracking finger movements for game interaction.
 * 
 * Key responsibilities:
 * - Initialize and configure MediaPipe HandLandmarker
 * - Process video frames for hand detection in real-time
 * - Convert 2D screen coordinates to 3D world coordinates
 * - Track index finger position and velocity for precise slicing
 * - Implement velocity smoothing for stable interaction
 * - Provide coordinate mapping between camera and 3D scene
 * - Handle multiple hands and fingertip tracking
 */
export class HandDetector {
    /**
     * Constructor for HandDetector
     * 
     * @param {HTMLVideoElement} videoElement - Video element providing camera feed
     * @param {THREE.Camera} camera - Three.js camera for coordinate transformations
     */
    constructor(videoElement, camera) {
        this.videoElement = videoElement;
        this.camera = camera;
        
        // MediaPipe components
        this.handLandmarker = null;     // MediaPipe hand detection instance
        this.isReady = false;           // Initialization status flag
        
        // Hand tracking state
        this.hands = [];                // Array of currently detected hands
        this.lastDetectionTime = 0;     // Timestamp of last successful detection
        
        /**
         * Velocity tracking system for gesture recognition
         * 
         * Tracks fingertip movement speed to differentiate between:
         * - Slow movements (positioning/hovering)
         * - Fast movements (slicing gestures)
         */
        this.previousFingertips = new Map();    // Previous positions for velocity calculation
        this.velocityHistory = new Map();       // Rolling velocity history for smoothing
        this.maxVelocityHistory = 5;            // Frames to average for smooth velocity
        
        /**
         * Precision slicing configuration
         * 
         * Only tracks index finger (landmark 8) for precise control.
         * This reduces false positives and improves accuracy compared to
         * tracking all fingertips which can cause accidental slices.
         */
        this.fingertipIndices = [8];    // MediaPipe index: 8 = index fingertip
        
        /**
         * Coordinate system parameters
         * 
         * MediaPipe returns normalized coordinates [0,1] that need conversion
         * to Three.js world coordinates for proper 3D interaction.
         */
        this.videoWidth = 1280;         // Reference video width for coordinate mapping
        this.videoHeight = 720;         // Reference video height for coordinate mapping
    }
    
    /**
     * Initialize MediaPipe hand detection system
     * 
     * Sets up the MediaPipe HandLandmarker with optimal configuration for
     * real-time hand tracking in a gaming environment. Configuration prioritizes
     * accuracy and responsiveness over detection of subtle gestures.
     */
    async initialize() {
        try {
            /**
             * Setup MediaPipe FilesetResolver
             * 
             * FilesetResolver provides access to MediaPipe WASM files hosted on CDN.
             * This enables client-side hand detection without requiring a server.
             */
            const filesetResolver = await vision.FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
            );
            
            /**
             * Create HandLandmarker with game-optimized settings
             * 
             * Configuration balances accuracy with performance:
             * - GPU acceleration for real-time processing
             * - Video mode for continuous frame processing
             * - Moderate confidence thresholds for reliable detection
             * - Up to 2 hands supported for flexible interaction
             */
            this.handLandmarker = await vision.HandLandmarker.createFromOptions(
                filesetResolver,
                {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                        delegate: "GPU"         // Use GPU acceleration for performance
                    },
                    runningMode: "VIDEO",       // Optimized for video streams vs single images
                    numHands: 2,                // Track up to 2 hands simultaneously
                    minHandDetectionConfidence: 0.5,    // Moderate threshold for initial detection
                    minHandPresenceConfidence: 0.5,     // Moderate threshold for tracking continuation
                    minTrackingConfidence: 0.5          // Moderate threshold for landmark accuracy
                }
            );
            
            this.isReady = true;
            
        } catch (error) {
            console.error('HandDetector initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Update hand detection for current video frame
     * 
     * Processes the current video frame through MediaPipe to detect hand landmarks.
     * This method should be called every frame to maintain real-time tracking.
     * Handles detection errors gracefully to prevent system crashes.
     */
    update() {
        if (!this.isReady || !this.handLandmarker) return;
        
        try {
            /**
             * Process current video frame for hand detection
             * 
             * MediaPipe processes the video frame and returns hand landmarks
             * if hands are detected. Uses current timestamp for tracking continuity.
             */
            const results = this.handLandmarker.detectForVideo(
                this.videoElement, 
                performance.now()
            );
            
            // Process and store detection results
            this.processHandResults(results);
            this.lastDetectionTime = performance.now();
            
        } catch (error) {
            console.error('Hand detection error:', error);
        }
    }
    
    /**
     * Process MediaPipe detection results into game-usable format
     * 
     * Converts raw MediaPipe landmark data into structured hand information
     * with world coordinates and fingertip tracking. Handles multiple hands
     * and maintains hand identification across frames.
     * 
     * @param {Object} results - MediaPipe detection results containing landmarks and handedness
     */
    processHandResults(results) {
        this.hands = [];    // Clear previous frame's hand data
        
        if (results.landmarks && results.landmarks.length > 0) {
            /**
             * Process each detected hand
             * 
             * MediaPipe can detect multiple hands simultaneously. Each hand
             * has landmarks (joint positions) and handedness (left/right classification).
             */
            for (let i = 0; i < results.landmarks.length; i++) {
                const landmarks = results.landmarks[i];
                const handedness = results.handednesses[i];
                
                // Convert landmarks to world coordinates
                const worldLandmarks = this.convertLandmarksToWorld(landmarks);
                
                // Extract and process fingertip positions
                const fingertips = this.extractFingertips(worldLandmarks, i);
                
                /**
                 * Store comprehensive hand data
                 * 
                 * Includes all information needed for game interaction:
                 * - Hand identification and classification
                 * - Confidence scores for filtering unreliable detections
                 * - World coordinate landmarks for 3D interaction
                 * - Processed fingertip data with velocity tracking
                 */
                this.hands.push({
                    id: i,
                    handedness: handedness[0].categoryName,     // "Left" or "Right"
                    confidence: handedness[0].score,            // Detection confidence [0,1]
                    landmarks: worldLandmarks,                  // All hand joint positions
                    fingertips: fingertips                      // Processed fingertip data
                });
            }
        }
        
        // Clean up tracking data for hands no longer detected
        this.cleanupVelocityHistory();
    }
    
    /**
     * Convert MediaPipe normalized coordinates to Three.js world coordinates
     * 
     * MediaPipe returns landmarks in normalized screen space [0,1]. This method
     * converts them to Three.js world coordinates that match the 3D scene scale.
     * Includes horizontal mirroring for natural interaction.
     * 
     * @param {Array} landmarks - Array of MediaPipe landmark objects with x,y,z coordinates
     * @returns {Array} Array of THREE.Vector3 objects in world coordinates
     */
    convertLandmarksToWorld(landmarks) {
        const worldLandmarks = [];
        
        for (const landmark of landmarks) {
            // Convert normalized coordinates [0,1] to screen coordinates
            const screenX = landmark.x * this.videoWidth;
            const screenY = landmark.y * this.videoHeight;
            
            /**
             * Convert screen coordinates to Three.js world coordinates
             * 
             * Coordinate transformations:
             * - X: Flipped horizontally for mirror effect, scaled to [-4,+4] range
             * - Y: Flipped vertically to match Three.js coordinate system, scaled to [-3,+3]
             * - Z: MediaPipe relative depth scaled for scene depth
             */
            const worldX = -((screenX / this.videoWidth) * 2 - 1) * 4;      // Mirrored X: -4 to +4
            const worldY = -((screenY / this.videoHeight) * 2 - 1) * 3;     // Flipped Y: -3 to +3
            const worldZ = -landmark.z * 2;                                 // Scaled depth
            
            worldLandmarks.push(new THREE.Vector3(worldX, worldY, worldZ));
        }
        
        return worldLandmarks;
    }
    
    /**
     * Extract fingertip positions and calculate velocities
     * 
     * Processes specific landmark indices to extract fingertip positions,
     * calculates movement velocities, and applies smoothing for stable interaction.
     * Currently focused on index finger for precision slicing.
     * 
     * @param {Array} landmarks - World coordinate landmarks for this hand
     * @param {number} handId - Unique identifier for this hand instance
     * @returns {Array} Array of fingertip objects with position and velocity data
     */
    extractFingertips(landmarks, handId) {
        const fingertips = [];
        const currentTime = performance.now();
        
        for (const index of this.fingertipIndices) {
            if (landmarks[index]) {
                const fingertipId = `${handId}_${index}`;
                const currentPosition = landmarks[index].clone();
                
                /**
                 * Calculate fingertip velocity for gesture recognition
                 * 
                 * Velocity is crucial for distinguishing between:
                 * - Hovering/positioning (low velocity)
                 * - Slicing gestures (high velocity)
                 */
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
    
    /**
     * Calculate fingertip velocity with smoothing
     * 
     * Computes velocity based on position change over time, applies smoothing
     * to reduce jitter, and maintains history for consistent measurements.
     * 
     * @param {string} fingertipId - Unique identifier for fingertip tracking
     * @param {THREE.Vector3} currentPosition - Current fingertip position
     * @param {number} currentTime - Current timestamp in milliseconds
     * @returns {number} Smoothed velocity magnitude
     */
    calculateFingertipVelocity(fingertipId, currentPosition, currentTime) {
        // Get previous position and time for this fingertip
        const previousData = this.previousFingertips.get(fingertipId);
        
        if (!previousData) {
            /**
             * First frame for this fingertip
             * 
             * Initialize tracking data and return zero velocity since
             * we need at least two points to calculate velocity.
             */
            this.previousFingertips.set(fingertipId, {
                position: currentPosition.clone(),
                time: currentTime
            });
            return 0;
        }
        
        /**
         * Calculate velocity from position change
         * 
         * Velocity = distance / time
         * Uses 3D distance for accurate movement measurement in world space.
         */
        const deltaTime = (currentTime - previousData.time) / 1000;    // Convert to seconds
        const deltaPosition = currentPosition.distanceTo(previousData.position);
        const velocity = deltaTime > 0 ? deltaPosition / deltaTime : 0;
        
        // Update previous position for next frame
        this.previousFingertips.set(fingertipId, {
            position: currentPosition.clone(),
            time: currentTime
        });
        
        // Apply velocity smoothing and return result
        this.updateVelocityHistory(fingertipId, velocity);
        return this.getSmoothedVelocity(fingertipId);
    }
    
    /**
     * Update velocity history for smoothing
     * 
     * Maintains a rolling history of velocity measurements to enable
     * smoothing that reduces noise and jitter in gesture recognition.
     * 
     * @param {string} fingertipId - Unique fingertip identifier
     * @param {number} velocity - New velocity measurement to add
     */
    updateVelocityHistory(fingertipId, velocity) {
        if (!this.velocityHistory.has(fingertipId)) {
            this.velocityHistory.set(fingertipId, []);
        }
        
        const history = this.velocityHistory.get(fingertipId);
        history.push(velocity);
        
        // Maintain fixed history size for consistent smoothing
        if (history.length > this.maxVelocityHistory) {
            history.shift();    // Remove oldest measurement
        }
    }
    
    /**
     * Calculate smoothed velocity from history
     * 
     * Applies simple moving average to reduce noise and provide
     * stable velocity measurements for reliable gesture recognition.
     * 
     * @param {string} fingertipId - Unique fingertip identifier
     * @returns {number} Smoothed velocity value
     */
    getSmoothedVelocity(fingertipId) {
        const history = this.velocityHistory.get(fingertipId);
        if (!history || history.length === 0) return 0;
        
        // Calculate simple moving average
        const sum = history.reduce((a, b) => a + b, 0);
        return sum / history.length;
    }
    
    /**
     * Clean up tracking data for no-longer-detected fingertips
     * 
     * Prevents memory leaks by removing tracking data for fingertips
     * that are no longer detected in the current frame.
     */
    cleanupVelocityHistory() {
        // Collect all currently detected fingertip IDs
        const currentFingertipIds = new Set();
        
        for (const hand of this.hands) {
            for (const fingertip of hand.fingertips) {
                currentFingertipIds.add(fingertip.id);
            }
        }
        
        /**
         * Remove tracking data for fingertips no longer detected
         * 
         * Iterates through stored tracking data and removes entries
         * for fingertips not present in the current frame.
         */
        for (const [fingertipId] of this.previousFingertips) {
            if (!currentFingertipIds.has(fingertipId)) {
                this.previousFingertips.delete(fingertipId);
                this.velocityHistory.delete(fingertipId);
            }
        }
    }
    
    /**
     * Get fingertip type from MediaPipe landmark index
     * 
     * Converts MediaPipe landmark indices to semantic fingertip names.
     * Currently only tracks index finger for precision slicing.
     * 
     * @param {number} index - MediaPipe landmark index
     * @returns {string} Semantic fingertip name
     */
    getFingertipType(index) {
        // Only index finger is tracked for precision slicing
        if (index === 8) return 'index';
        return 'unknown';
    }
    
    /**
     * Get all active fingertip positions for collision detection
     * 
     * Aggregates fingertips from all detected hands into a single array
     * for easy processing by collision detection systems.
     * 
     * @returns {Array} Array of all active fingertips with comprehensive data
     */
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
    
    /**
     * Get fingertips filtered by type
     * 
     * Useful for implementing different gestures or interaction modes
     * based on specific finger types.
     * 
     * @param {string} type - Fingertip type to filter ('index', 'thumb', etc.)
     * @returns {Array} Array of fingertips matching the specified type
     */
    getFingertipsByType(type) {
        return this.getAllFingertips().filter(ft => ft.type === type);
    }
    
    /**
     * Check if any hands are currently detected
     * 
     * @returns {boolean} True if at least one hand is detected
     */
    hasHands() {
        return this.hands.length > 0;
    }
    
    /**
     * Get number of currently detected hands
     * 
     * @returns {number} Count of detected hands (0-2)
     */
    getHandCount() {
        return this.hands.length;
    }
    
    /**
     * Get average detection confidence across all hands
     * 
     * Provides quality metric for hand tracking reliability.
     * Higher confidence indicates more reliable tracking.
     * 
     * @returns {number} Average confidence score [0,1]
     */
    getAverageConfidence() {
        if (this.hands.length === 0) return 0;
        
        const totalConfidence = this.hands.reduce((sum, hand) => sum + hand.confidence, 0);
        return totalConfidence / this.hands.length;
    }
    
    /**
     * Get maximum velocity among all fingertips
     * 
     * Useful for detecting rapid movements and gesture intensity.
     * 
     * @returns {number} Maximum velocity among all tracked fingertips
     */
    getMaxVelocity() {
        const fingertips = this.getAllFingertips();
        if (fingertips.length === 0) return 0;
        
        return Math.max(...fingertips.map(ft => ft.velocity));
    }
    
    /**
     * Get comprehensive debug information
     * 
     * Provides detailed system status for debugging, performance monitoring,
     * and system health assessment.
     * 
     * @returns {Object} Comprehensive debug information
     */
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