import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class FoodSpawner {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.foods = [];
        this.spawnTimer = 0;
        this.spawnInterval = 0.8; // Spawn every 0.8 seconds
        this.maxFoods = 15; // Maximum foods on screen
        
        // Weighted spawn system: higher weight = more frequent spawning
        // Fruits: 85% total chance, Donut: 10%, Burger: 3%, Plate: 2%
        
        // Only fruits + plate, burger, donut - cute_apple much bigger, plate & burger much smaller
        // Added weight system: fruits common, donut uncommon, burger/plate rare
        this.foodTypes = [
            // Fruits - HIGH SPAWN RATE
            { name: 'apple', file: 'cute_apple.glb', scale: 32.0, category: 'fruit', weight: 25 }, // DOUBLED from 16.0
            { name: 'apple_red', file: 'apple_001.glb', scale: 8.0, category: 'fruit', weight: 20 }, // Reduced from 12.0
            { name: 'banana', file: 'banana_001.glb', scale: 7.0, category: 'fruit', weight: 20 }, // Reduced from 10.0
            { name: 'peach', file: 'peach_001.glb', scale: 8.0, category: 'fruit', weight: 20 }, // Reduced from 12.0
            
            // Special items - MEDIUM SPAWN RATE
            { name: 'donut', file: 'donut_001.glb', scale: 8.0, category: 'dessert', weight: 10 }, // Reduced from 12.0
            
            // Rare items - LOW SPAWN RATE
            { name: 'burger', file: 'burger_001.glb', scale: 5.0, category: 'main', weight: 3 }, // HALVED from 10.0
            { name: 'plate', file: 'Plate_001.glb', scale: 4.0, category: 'tableware', weight: 2 } // HALVED from 8.0
        ];
        
        this.foodModels = new Map();
        this.loader = new GLTFLoader();
        this.modelsLoaded = false;
        this.loadedCount = 0;
    }
    
    async initialize() {
        try {
            await this.loadAllFoodModels();
            this.modelsLoaded = true;
        } catch (error) {
            console.error('Failed to load food models:', error);
            throw error;
        }
    }
    
    async loadAllFoodModels() {
        const loadPromises = this.foodTypes.map(foodType => {
            return new Promise((resolve, reject) => {
                this.loader.load(
                    `assets/${foodType.file}`,
                    (gltf) => {
                        const model = gltf.scene;
                        
                        // Set appropriate scale
                        model.scale.setScalar(foodType.scale);
                        
                        // Center the model
                        const box = new THREE.Box3().setFromObject(model);
                        const center = box.getCenter(new THREE.Vector3());
                        model.position.sub(center);
                        
                        // Configure model based on type
                        this.configureModel(model, foodType);
                        
                        // Store the configured model
                        this.foodModels.set(foodType.name, model);
                        this.loadedCount++;
                        resolve();
                    },
                    (progress) => {
                        // Optional: show loading progress
                    },
                    (error) => {
                        console.error(`Error loading ${foodType.file}:`, error);
                        reject(error);
                    }
                );
            });
        });
        
        await Promise.all(loadPromises);
    }
    
    configureModel(model, foodType) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Special handling for cute_apple (hide cut parts)
                if (foodType.file === 'cute_apple.glb') {
                    if (child.name === 'apple_whole_m_apple_outer_0') {
                        child.visible = true;
                    } else {
                        child.visible = false;
                    }
                }
                
                if (child.material) {
                    // Safe handling of material properties
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0x000000);
                    }
                    if (child.material.emissiveIntensity !== undefined) {
                        child.material.emissiveIntensity = 0.0;
                    }
                    
                    // Adjust material properties for better lighting
                    if (child.material.roughness !== undefined) {
                        child.material.roughness = Math.max(child.material.roughness, 0.2);
                    }
                    if (child.material.metalness !== undefined) {
                        child.material.metalness = Math.min(child.material.metalness, 0.1);
                    }
                }
            }
        });
    }
    
    spawnFood() {
        if (this.foods.length >= this.maxFoods || !this.modelsLoaded) return;
        
        // Weighted random selection
        const totalWeight = this.foodTypes.reduce((sum, type) => sum + type.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        
        let selectedFoodType = null;
        for (const foodType of this.foodTypes) {
            randomWeight -= foodType.weight;
            if (randomWeight <= 0) {
                selectedFoodType = foodType;
                break;
            }
        }
        
        // Fallback to first type if something went wrong
        if (!selectedFoodType) {
            selectedFoodType = this.foodTypes[0];
        }
        
        const foodModel = this.foodModels.get(selectedFoodType.name);
        
        if (!foodModel) {
            console.error(`Food model ${selectedFoodType.name} not loaded`);
            return;
        }
        
        // Clone the model for this instance
        const mesh = foodModel.clone();
        
        // Clone materials to prevent shared material issues
        mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
            }
        });
        
        // Random spawn position at top of screen
        const spawnX = (Math.random() - 0.5) * 8; // -4 to 4 (safe range)
        const spawnY = 6; // Above screen
        const spawnZ = (Math.random() - 0.5) * 2; // -1 to 1 for depth variation
        
        mesh.position.set(spawnX, spawnY, spawnZ);
        
        // Add to scene
        this.sceneManager.getScene().add(mesh);
        
        // Store food data
        this.foods.push({
            type: selectedFoodType.name,
            category: selectedFoodType.category,
            mesh: mesh,
            spawnTime: performance.now(),
            velocity: {
                x: (Math.random() - 0.5) * 0.1,  // Small horizontal movement
                y: 0,                            // Start without vertical velocity
                z: (Math.random() - 0.5) * 0.1   // Small depth movement
            }
        });
        
    }
    
    update(deltaTime) {
        // Update spawn timer
        this.spawnTimer += deltaTime;
        
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnFood();
            this.spawnTimer = 0;
            
            // Randomize next spawn time slightly
            this.spawnInterval = 0.5 + Math.random() * 0.8; // 0.5-1.3 seconds
        }
        
        // Simple physics and cleanup - SLOWER GRAVITY
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            const pos = food.mesh.position;
            
            // Slower gravity (reduced from 2.5 to 1.8)
            food.velocity.y -= 1.8 * deltaTime;
            
            // Update position
            pos.x += food.velocity.x * deltaTime;
            pos.y += food.velocity.y * deltaTime;
            pos.z += food.velocity.z * deltaTime;
            
            // Simple rotation for natural look (slightly slower)
            food.mesh.rotation.x += 0.8 * deltaTime; // Reduced from 1.0
            food.mesh.rotation.z += 0.4 * deltaTime; // Reduced from 0.5
            
            // Remove if out of bounds or too old
            const age = performance.now() - food.spawnTime;
            const shouldRemove = (
                pos.y < -5 ||          // Below screen
                age > 15000            // Max 15 seconds life
            );
            
            if (shouldRemove) {
                this.sceneManager.getScene().remove(food.mesh);
                this.foods.splice(i, 1);
            }
        }
    }
    
    getActiveFoodCount() {
        return this.foods.length;
    }
    
    getFoods() {
        return this.foods;
    }
    
    // Get food by category for scoring
    getFoodsByCategory(category) {
        return this.foods.filter(food => food.category === category);
    }
}