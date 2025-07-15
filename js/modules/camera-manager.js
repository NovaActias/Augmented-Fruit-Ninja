import * as THREE from 'three';

/**
 * Camera Manager Class
 * 
 * Handles WebRTC camera access and video stream management for augmented reality applications.
 * This class abstracts the complexity of browser camera APIs and provides a clean interface
 * for accessing video streams that can be used as textures in Three.js scenes.
 * 
 * Key responsibilities:
 * - Request camera permissions from user
 * - Configure optimal camera settings for AR applications
 * - Handle camera initialization errors gracefully
 * - Provide video texture for Three.js background rendering
 * - Manage camera resource cleanup
 */
export class CameraManager {
    /**
     * Constructor for CameraManager
     * 
     * @param {HTMLVideoElement} videoElement - The HTML video element that will display the camera feed
     */
    constructor(videoElement) {
        this.videoElement = videoElement;  // Reference to HTML video element
        this.stream = null;                // MediaStream object from getUserMedia
        this.isReady = false;             // Flag indicating if camera is ready for use
    }
    
    /**
     * Initialize camera access and configure video stream
     * 
     * This method requests camera access from the user and configures the video stream
     * with optimal settings for augmented reality applications. It handles the async
     * nature of camera initialization and provides fallback options if camera access fails.
     * 
     * The method waits for video metadata to load to ensure the video dimensions
     * are available before marking the camera as ready.
     */
    async initialize() {
        try {      
            /**
             * Setup webcam constraints for optimal AR performance
             * 
             * These constraints are designed to balance image quality with performance:
             * - HD resolution (1280x720) provides good detail for hand tracking
             * - Front-facing camera ('user') is preferred for natural interaction
             * - Audio disabled to reduce bandwidth and improve performance
             */
            const constraints = {
                audio: false,                    // No audio needed for AR game
                video: {
                    width: { ideal: 1280 },     // HD width for good hand tracking accuracy
                    height: { ideal: 720 },     // HD height for good hand tracking accuracy
                    facingMode: 'user'          // Front-facing camera for natural user interaction
                }
            };
            
            /**
             * Request camera access from browser
             * 
             * getUserMedia is an async API that requests camera permissions from the user.
             * Modern browsers require HTTPS or localhost for camera access for security reasons.
             */
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            
            /**
             * Wait for video metadata to load
             * 
             * This ensures that video dimensions and other properties are available
             * before we mark the camera as ready. This is crucial for Three.js texture
             * creation which needs to know the video dimensions.
             */
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.isReady = true;
                    resolve();
                };
            });
            
        } catch (error) {
            /**
             * Handle camera initialization failures
             * 
             * Common failure scenarios:
             * - User denied camera permissions
             * - No camera available on device
             * - Camera already in use by another application
             * - Browser security restrictions (non-HTTPS)
             */
            console.error('Camera initialization failed:', error);
            
            // Optional fallback to demo video (useful for development/testing)
            this.videoElement.src = 'demo-video.mp4';
            
            // Throw descriptive error for caller to handle
            throw new Error('Camera access denied or not available');
        }
    }
    
    /**
     * Get the video element reference
     * 
     * Provides access to the underlying HTML video element for direct manipulation
     * or integration with other systems that need direct video element access.
     * 
     * @returns {HTMLVideoElement} The video element displaying the camera feed
     */
    getVideoElement() {
        return this.videoElement;
    }
    
    /**
     * Create Three.js video texture from camera feed
     * 
     * Converts the camera video stream into a Three.js texture that can be used
     * as a background or material in 3D scenes. The texture is properly configured
     * for optimal rendering performance and color accuracy.
     * 
     * @returns {THREE.VideoTexture|null} Video texture for Three.js or null if not ready
     */
    getVideoTexture() {
        // Return null if camera is not ready to prevent errors
        if (!this.isReady) return null;
        
        // Create video texture with proper color space configuration
        const texture = new THREE.VideoTexture(this.videoElement);
        texture.colorSpace = THREE.SRGBColorSpace; // Ensures accurate color representation
        return texture;
    }
    
    /**
     * Clean up camera resources
     * 
     * Properly releases camera resources when no longer needed. This is important
     * for user privacy (stops camera indicator light) and system performance.
     * Should be called when the application is closing or switching away from camera use.
     */
    dispose() {
        if (this.stream) {
            // Stop all tracks in the media stream to release camera
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
}