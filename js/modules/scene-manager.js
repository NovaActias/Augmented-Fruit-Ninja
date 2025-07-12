import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

export class SceneManager {
    constructor(canvas, videoElement) {
        this.canvas = canvas;
        this.videoElement = videoElement;
        
        // Three.js components
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        
        // Physics world
        this.physicsWorld = null;
        this.physicsObjects = [];
        
        // Lighting
        this.lights = [];
        
        // Background
        this.backgroundTexture = null;
    }
    
    async initialize() {
        console.log('Initializing scene...');
        
        // Setup canvas dimensions
        this.canvas.width = this.videoElement.videoWidth || 1280;
        this.canvas.height = this.videoElement.videoHeight || 720;
        
        // Initialize Three.js renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Setup camera (perspective for 3D objects)
        this.camera = new THREE.PerspectiveCamera(
            60, // FOV
            this.canvas.width / this.canvas.height, // Aspect ratio
            0.1, // Near plane
            100 // Far plane
        );
        this.camera.position.set(0, 0, 5);
        this.scene.addBody(this.camera);
        
        // Setup video background
        this.setupVideoBackground();
        
        // Setup lighting
        this.setupLighting();
        
        // Initialize physics world
        this.setupPhysics();
        
        console.log('Scene initialization complete');
    }
    
    setupVideoBackground() {
        // Create video texture for background
        this.backgroundTexture = new THREE.VideoTexture(this.videoElement);
        this.backgroundTexture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = this.backgroundTexture;
    }
    
    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.addBody(ambientLight);
        this.lights.push(ambientLight);
        
        // Directional light for shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.addBody(directionalLight);
        this.lights.push(directionalLight);
    }
    
    setupPhysics() {

        console.log('🔧 CANNON object:', CANNON);
        console.log('🔧 CANNON.World:', CANNON.World);

        // Initialize Cannon.js physics world
        this.physicsWorld = new CANNON.World();

        console.log('Physics world created:', this.physicsWorld);
        console.log('Physics world add method:', typeof this.physicsWorld.add);
        
        this.physicsWorld.gravity.set(0, -9.82, 0); // Gravity pointing down
        this.physicsWorld.broadphase = new CANNON.NaiveBroadphase();
        
        // Create ground plane (invisible)
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        groundBody.position.set(0, -10, 0);
        this.physicsWorld.addBody(groundBody);
    }
    x
    addPhysicsObject(mesh, body) {
        this.scene.addBody(mesh);
        this.physicsWorld.addBody(body);
        
        this.physicsObjects.push({ mesh, body });
        return this.physicsObjects.length - 1;
    }
    
    removePhysicsObject(index) {
        if (index >= 0 && index < this.physicsObjects.length) {
            const obj = this.physicsObjects[index];
            this.scene.remove(obj.mesh);
            this.physicsWorld.remove(obj.body);
            this.physicsObjects.splice(index, 1);
        }
    }
    
    update(deltaTime) {
        // Update physics simulation
        this.physicsWorld.step(deltaTime);
        
        // Sync Three.js objects with physics bodies
        this.physicsObjects.forEach(obj => {
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        });
        
        // Remove objects that fell too far
        for (let i = this.physicsObjects.length - 1; i >= 0; i--) {
            if (this.physicsObjects[i].body.position.y < -15) {
                this.removePhysicsObject(i);
            }
        }
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    getScene() {
        return this.scene;
    }
    
    getCamera() {
        return this.camera;
    }
}
