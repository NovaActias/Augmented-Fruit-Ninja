import * as THREE from 'three';


export class CameraManager {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.stream = null;
        this.isReady = false;
    }
    
    async initialize() {
        try {
            console.log('Initializing camera...');
            
            // Setup webcam constraints (similar to course examples)
            const constraints = {
                audio: false,
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            };
            
            // Get user media stream
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            
            // Wait for video metadata to load
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    console.log(`Camera initialized: ${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`);
                    this.isReady = true;
                    resolve();
                };
            });
            
        } catch (error) {
            console.error('Camera initialization failed:', error);
            // Fallback to a demo video if available
            this.videoElement.src = 'demo-video.mp4'; // Optional fallback
            throw new Error('Camera access denied or not available');
        }
    }
    
    getVideoElement() {
        return this.videoElement;
    }
    
    getVideoTexture() {
        if (!this.isReady) return null;
        
        const texture = new THREE.VideoTexture(this.videoElement);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }
    
    dispose() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
}
