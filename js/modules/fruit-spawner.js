import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as CANNON from 'cannon-es'

export class FruitSpawner {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.fruits = [];
        this.spawnTimer = 0;
        this.spawnInterval = 2.0; // Spawn every 2 seconds
        this.maxFruits = 8; // Maximum fruits on screen
        
        // Fruit types and models
        this.fruitTypes = ['apple', 'orange', 'banana', 'watermelon'];
        this.fruitModels = new Map();
        this.loader = new FBXLoader();
        this.modelsLoaded = false;
        
        // Scale factors per each fruit type (to match original geometry sizes)
        this.fruitScales = {
            apple: 0.006,     // Scale down significantly (FBX models are usually large)
            orange: 0.005,
            banana: 0.004,
            watermelon: 0.008
        };
    }
    
    async initialize() {
        console.log('Initializing fruit spawner with FBX models...');
        
        try {
            await this.loadFBXModels();
            this.modelsLoaded = true;
            console.log('All FBX models loaded successfully');
        } catch (error) {
            console.error('Failed to load FBX models:', error);
            // Fallback to geometric shapes if FBX loading fails
            this.createGeometricFruits();
            this.modelsLoaded = true;
        }
        
        console.log('Fruit spawner ready');
    }
    
    async loadFBXModels() {
        const loadPromises = this.fruitTypes.map(fruitType => {
            return new Promise((resolve, reject) => {
                this.loader.load(
                    `assets/${fruitType}.fbx`,
                    (fbx) => {
                        // Scale the model to appropriate size
                        const scale = this.fruitScales[fruitType];
                        fbx.scale.setScalar(scale);
                        
                        // Center the model
                        const box = new THREE.Box3().setFromObject(fbx);
                        const center = box.getCenter(new THREE.Vector3());
                        fbx.position.sub(center);
                        
                        // Enable shadows
                        fbx.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                
                                // Color space fix
                                if (child.material && child.material.map) {
                                    child.material.map.colorSpace = THREE.SRGBColorSpace;
                                    }
                                }
                        });
                        
                        // Store the loaded model
                        this.fruitModels.set(fruitType, fbx.clone());
                        console.log(`Loaded ${fruitType}.fbx`);
                        resolve();
                    },
                    (progress) => {
                        console.log(`Loading ${fruitType}: ${Math.round(progress.loaded / progress.total * 100)}%`);
                    },
                    (error) => {
                        console.error(`Error loading ${fruitType}.fbx:`, error);
                        reject(error);
                    }
                );
            });
        });
        
        await Promise.all(loadPromises);
    }
    
    // Fallback method (keep the original geometric method)
    createGeometricFruits() {
        console.log('Using fallback geometric fruits');
        const materials = {
            apple: new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.7, metalness: 0.1 }),
            orange: new THREE.MeshStandardMaterial({ color: 0xff8844, roughness: 0.8, metalness: 0.1 }),
            banana: new THREE.MeshStandardMaterial({ color: 0xffff44, roughness: 0.6, metalness: 0.1 }),
            watermelon: new THREE.MeshStandardMaterial({ color: 0x44ff44, roughness: 0.7, metalness: 0.1 })
        };
        
        this.fruitTypes.forEach(type => {
            let geometry;
            switch(type) {
                case 'apple':
                    geometry = new THREE.SphereGeometry(0.3, 16, 16);
                    break;
                case 'orange':
                    geometry = new THREE.SphereGeometry(0.25, 16, 16);
                    break;
                case 'banana':
                    geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
                    break;
                case 'watermelon':
                    geometry = new THREE.SphereGeometry(0.4, 16, 16);
                    break;
            }
            
            this.fruitModels.set(type, { geometry, material: materials[type] });
        });
    }
    
    spawnFruit() {
        if (this.fruits.length >= this.maxFruits || !this.modelsLoaded) return;
        
        const fruitType = this.fruitTypes[Math.floor(Math.random() * this.fruitTypes.length)];
        const fruitModel = this.fruitModels.get(fruitType);
        
        let mesh;
        if (fruitModel.geometry) {
            mesh = new THREE.Mesh(fruitModel.geometry, fruitModel.material);
        } else {

        mesh = fruitModel.clone();
        
        mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.emissiveIntensity = 0.0;
            }
        });
    }
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Dopo aver creato il mesh, aggiungi:
        console.log(`Spawning ${fruitType}:`, {
            isGeometric: !!fruitModel.geometry,
            materialType: mesh.material?.type,
            roughness: mesh.material?.roughness,
            metalness: mesh.material?.metalness,
            emissive: mesh.material?.emissive,
            emissiveIntensity: mesh.material?.emissiveIntensity
        });

        if (!fruitModel.geometry) {
        mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                console.log(`  Child material for ${fruitType}:`, {
                    materialType: child.material.type,
                    roughness: child.material.roughness,
                    metalness: child.material.metalness,
                    emissive: child.material.emissive,
                    emissiveIntensity: child.material.emissiveIntensity
                });
            }
        });
    }

        // Random spawn position (top of screen, random X)
        const spawnX = (Math.random() - 0.5) * 8; // -4 to 4
        const spawnY = 6; // Above screen
        const spawnZ = (Math.random() - 0.5) * 2; // -1 to 1
        
        mesh.position.set(spawnX, spawnY, spawnZ);
        
        // Create physics body based on fruit type
        let shape;
        switch(fruitType) {
            case 'banana':
                shape = new CANNON.Cylinder(0.1, 0.1, 0.6, 8);
                break;
            default:
                const radius = fruitType === 'watermelon' ? 0.4 : 
                              fruitType === 'apple' ? 0.3 : 0.25;
                shape = new CANNON.Sphere(radius);
        }
        
        const body = new CANNON.Body({ mass: 1 });
        body.addShape(shape);
        body.position.set(spawnX, spawnY, spawnZ);
        
        // Add random rotation
        body.angularVelocity.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );
        
        // Add to scene
        const physicsObject = this.sceneManager.addPhysicsObject(mesh, body);
        
        // Store fruit data
        this.fruits.push({
            type: fruitType,
            mesh: mesh,
            body: body,
            physicsObject: physicsObject,
            spawnTime: performance.now()
        });
        
        console.log(`Spawned ${fruitType} fruit (FBX model)`);
    }
    
    update(deltaTime) {
        // Update spawn timer
        this.spawnTimer += deltaTime;
        
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnFruit();
            this.spawnTimer = 0;
            
            // Slightly randomize next spawn time
            this.spawnInterval = 1.5 + Math.random() * 1.0; // 1.5-2.5 seconds
        }
        
        // Clean up fruits with tighter bounds
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const fruit = this.fruits[i];
            const pos = fruit.body.position;
            
            // Limiti più stretti per eliminazione rapida
            const shouldRemove = (
                pos.x < -8 || pos.x > 8 ||      // Fuori dai lati
                pos.y < -5 || pos.y > 8 ||      // Sotto o troppo sopra
                pos.z < -3 || pos.z > 3 ||      // Troppo avanti/dietro
                performance.now() - fruit.spawnTime > 8000  // Max 8 secondi di vita
            );
            
            if (shouldRemove) {
                this.sceneManager.removePhysicsObject(fruit.physicsObject);
                this.fruits.splice(i, 1);
                console.log(`Removed fruit ${fruit.type}, remaining: ${this.fruits.length}`);
            }
        }
    }
    
    getActiveFruitCount() {
        return this.fruits.length;
    }
    
    getFruits() {
        return this.fruits;
    }
}