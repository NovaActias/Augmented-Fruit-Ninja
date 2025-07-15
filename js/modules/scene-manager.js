import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

/**
 * Scene Manager Class
 * 
 * Central orchestrator for 3D scene management, rendering pipeline, and physics simulation.
 * This class integrates Three.js for 3D graphics with Cannon.js for realistic physics,
 * creating the foundation for the augmented reality fruit ninja game.
 * 
 * Key responsibilities:
 * - Initialize and configure Three.js renderer with optimal settings
 * - Set up 3D scene with proper camera and lighting for AR experience
 * - Integrate physics simulation with visual rendering
 * - Manage video background for augmented reality effect
 * - Coordinate between visual objects and their physics bodies
 * - Provide unified interface for adding/removing game objects
 */
export class SceneManager {
    /**
     * Constructor for SceneManager
     * 
     * @param {HTMLCanvasElement} canvas - Canvas element where Three.js will render
     * @param {HTMLVideoElement} videoElement - Video element providing camera feed
     */
    constructor(canvas, videoElement) {
        this.canvas = canvas;
        this.videoElement = videoElement;
        
        // Three.js core components
        this.renderer = null;              // WebGL renderer for 3D graphics
        this.scene = null;                 // Container for all 3D objects
        this.camera = null;                // Virtual camera defining viewpoint
        
        // Physics simulation
        this.physicsWorld = null;          // Cannon.js physics world
        this.physicsObjects = [];          // Array tracking visual-physics object pairs
        
        // Visual enhancement systems
        this.lights = [];                  // Array of light objects for scene illumination
        
        // Background rendering
        this.backgroundTexture = null;     // Video texture for AR background
    }
    
    /**
     * Initialize all scene components and rendering systems
     * 
     * Sets up the complete 3D environment with proper rendering settings,
     * physics simulation, lighting, and video background for augmented reality.
     * The initialization order is critical for proper system integration.
     */
    async initialize() {
        
        /**
         * Configure canvas dimensions based on video stream
         * 
         * Matches canvas size to video resolution to prevent aspect ratio distortion
         * and ensure accurate coordinate mapping between video and 3D space.
         */
        this.canvas.width = this.videoElement.videoWidth || 1280;
        this.canvas.height = this.videoElement.videoHeight || 720;
        
        /**
         * Initialize Three.js WebGL renderer with optimal settings
         * 
         * Configuration prioritizes:
         * - High quality antialiasing for smooth edges
         * - Shadow mapping for realistic depth perception
         * - Proper alpha handling for transparency effects
         */
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true,              // Smooth edge rendering
            alpha: false                  // No transparency needed for main canvas
        });

        this.renderer.setSize(this.canvas.width, this.canvas.height);
        
        /**
         * Enable shadow mapping for realistic depth cues
         * 
         * Shadows help users perceive 3D object positions relative to each other,
         * which is crucial for accurate hand-object interaction in AR.
         */
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows for realism
        this.renderer.shadowMap.autoUpdate = true;
        this.renderer.shadowMap.needsUpdate = true; 

        // Create main scene container
        this.scene = new THREE.Scene();
        
        /**
         * Setup perspective camera for natural 3D viewing
         * 
         * Camera configuration matches human vision characteristics:
         * - 60° FOV approximates natural human vision
         * - Aspect ratio matches video stream to prevent distortion
         * - Near/far planes optimized for game object scale
         */
        this.camera = new THREE.PerspectiveCamera(
            60,                                              // Field of view in degrees
            this.canvas.width / this.canvas.height,         // Aspect ratio matching video
            0.1,                                            // Near clipping plane
            100                                             // Far clipping plane
        );
        this.camera.position.set(0, 0, 5);                 // Position camera for good game view
        this.scene.add(this.camera);
        
        // Initialize scene components
        this.setupVideoBackground();
        this.setupLighting();
        this.setupPhysics();
        
    }
    
    /**
     * Configure video background for augmented reality effect
     * 
     * Creates a video texture from the camera feed and applies it as the scene background.
     * The texture is horizontally flipped to create a mirror effect, which feels more
     * natural for users as it matches their expectation from selfie cameras.
     */
    setupVideoBackground() {
        // Create video texture for AR background
        this.backgroundTexture = new THREE.VideoTexture(this.videoElement);
        this.backgroundTexture.colorSpace = THREE.SRGBColorSpace; // Accurate color reproduction

        /**
         * Mirror the camera feed horizontally
         * 
         * This creates a natural mirror effect where user movements correspond
         * intuitively to on-screen actions (moving right hand makes virtual hand move right).
         */
        this.backgroundTexture.wrapS = THREE.RepeatWrapping;
        this.backgroundTexture.repeat.x = -1; // Horizontal flip

        // Set as scene background
        this.scene.background = this.backgroundTexture;
    }
    
    /**
     * Configure lighting system for realistic object appearance
     * 
     * Sets up a two-light system optimized for food object visibility:
     * - Ambient light provides overall illumination
     * - Directional light creates shadows and depth perception
     */
    setupLighting() {
        /**
         * Ambient light for general scene illumination
         * 
         * Provides base lighting so that no areas are completely black,
         * ensuring all food objects remain visible even in shadow areas.
         */
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Soft white light
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        /**
         * Directional light for shadows and depth perception
         * 
         * Positioned to cast shadows that help users perceive object depth and position.
         * Shadow mapping is enabled to create realistic depth cues for better interaction.
         */
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 5);    // Position for natural shadow angles
        directionalLight.castShadow = true;          // Enable shadow casting
        
        // Configure shadow map quality and coverage
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.updateProjectionMatrix();
        
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
    }
    
    /**
     * Initialize physics simulation with Cannon.js
     * 
     * Creates a physics world that simulates realistic falling behavior for food objects.
     * The physics simulation runs independently of the visual rendering but is synchronized
     * each frame to maintain visual-physics consistency.
     */
    setupPhysics() {

        // Initialize Cannon.js physics world
        this.physicsWorld = new CANNON.World();

        /**
         * Configure gravity for pleasant game feel
         * 
         * Gravity is reduced from real-world values (-9.8) to (-2.2) to:
         * - Give players more time to react to falling objects
         * - Create a more game-like, less frantic experience
         * - Allow for better tracking accuracy with current hand detection
         */
        this.physicsWorld.gravity.set(0, -2.2, 0); 
        
        /**
         * Configure collision detection system
         * 
         * SAP (Sweep and Prune) broadphase is efficient for scenarios with
         * many moving objects that need collision detection optimization.
         */
        this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);
        
        /**
         * Create invisible ground plane to catch fallen objects
         * 
         * This prevents objects from falling infinitely and provides a cleanup
         * mechanism for objects that weren't sliced by the player.
         */
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ 
            mass: 0,                     // Static body (immovable)
            material: new CANNON.Material({
                friction: 0.1,           // Low friction for natural sliding
                restitution: 0.0         // No bounce - objects stop when hitting ground
            })
        });
        groundBody.addShape(groundShape);
        
        // Orient ground plane horizontally and position below visible area
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        groundBody.position.set(0, -10, 0);
        
        this.physicsWorld.addBody(groundBody);
    }
    
    /**
     * Add a synchronized physics-visual object pair to the scene
     * 
     * This method creates the binding between a Three.js visual mesh and its
     * corresponding Cannon.js physics body. Both are added to their respective
     * systems and tracked together for synchronized updates.
     * 
     * @param {THREE.Mesh} mesh - Visual representation of the object
     * @param {CANNON.Body} body - Physics body for collision and movement simulation
     * @returns {Object} Reference to the physics object pair for later manipulation
     */
    addPhysicsObject(mesh, body) {
        // Add visual mesh to Three.js scene
        this.scene.add(mesh);
        
        // Add physics body to Cannon.js world
        this.physicsWorld.addBody(body);
        
        // Create tracking object that binds visual and physics representations
        const physicsObject = { mesh, body };
        this.physicsObjects.push(physicsObject);
        
        // Return direct reference to the object instead of array index
        // This prevents issues with array manipulation affecting references
        return physicsObject;
    }
    
    /**
     * Remove a physics object from both visual and physics systems
     * 
     * Safely removes an object from the scene, physics world, and tracking array.
     * This is used when food objects are sliced or fall off screen.
     * 
     * @param {Object} physicsObject - The physics object pair to remove
     * @returns {boolean} True if removal was successful, false if object not found
     */
    removePhysicsObject(physicsObject) {
        if (!physicsObject) return false;
        
        // Find the object's index in the tracking array
        const index = this.physicsObjects.indexOf(physicsObject);
        
        if (index !== -1) {
            // Remove visual mesh from Three.js scene
            this.scene.remove(physicsObject.mesh);
            
            // Remove physics body from Cannon.js world
            this.physicsWorld.removeBody(physicsObject.body);
            
            // Remove from tracking array
            this.physicsObjects.splice(index, 1);
            
            return true;
        }
        
        console.warn('Physics object not found in array');
        return false;
    }
        
    /**
     * Update physics simulation and synchronize with visual objects
     * 
     * This method runs every frame to:
     * 1. Advance the physics simulation by one time step
     * 2. Copy physics body positions/rotations to visual meshes
     * 
     * Uses fixed timestep for stable physics regardless of framerate variations.
     * 
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    update(deltaTime) {
        /**
         * Advance physics simulation with fixed timestep
         * 
         * Fixed timestep (1/60 second) ensures consistent physics behavior
         * regardless of rendering framerate. maxSubSteps prevents spiral of death
         * when frame rate drops below physics rate.
         */
        const fixedTimeStep = 1/60;     // 60 FPS physics rate
        const maxSubSteps = 3;          // Maximum physics sub-steps per frame
        this.physicsWorld.step(fixedTimeStep, deltaTime, maxSubSteps);

        /**
         * Synchronize visual objects with physics bodies
         * 
         * Copy position and rotation from physics simulation to visual meshes.
         * This ensures that what the user sees matches the physics simulation exactly.
         */
        this.physicsObjects.forEach(obj => {
            obj.mesh.position.copy(obj.body.position);       // Sync position
            obj.mesh.quaternion.copy(obj.body.quaternion);   // Sync rotation
        });
    }
    
    /**
     * Render the current frame
     * 
     * Executes the Three.js rendering pipeline to draw the current scene state
     * to the canvas. This should be called once per frame after all updates.
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Get reference to the Three.js scene
     * 
     * Provides access to the scene for other systems that need to add/remove objects
     * or perform scene-level operations.
     * 
     * @returns {THREE.Scene} The main Three.js scene
     */
    getScene() {
        return this.scene;
    }
    
    /**
     * Get reference to the scene camera
     * 
     * Provides access to the camera for systems that need camera properties
     * like position, projection matrix, or coordinate transformations.
     * 
     * @returns {THREE.PerspectiveCamera} The main scene camera
     */
    getCamera() {
        return this.camera;
    }
}