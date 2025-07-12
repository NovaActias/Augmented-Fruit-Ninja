import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class FoodSpawner {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.foods = [];
        this.spawnTimer = 0;
        this.spawnInterval = 0.8; // Spawn every 0.8 seconds
        this.maxFoods = 15; // Maximum foods on screen
        
        // All available food types with their files and scales
        this.foodTypes = [
            // Fruits
            { name: 'apple', file: 'cute_apple.glb', scale: 16.0, category: 'fruit' },
            { name: 'apple_red', file: 'apple_001.glb', scale: 12.0, category: 'fruit' },
            { name: 'banana', file: 'banana_001.glb', scale: 10.0, category: 'fruit' },
            { name: 'peach', file: 'peach_001.glb', scale: 12.0, category: 'fruit' },
            
            // Vegetables
            { name: 'carrot', file: 'carrot_001.glb', scale: 8.0, category: 'vegetable' },
            { name: 'eggplant', file: 'eggplant_001.glb', scale: 10.0, category: 'vegetable' },
            { name: 'tomato', file: 'tomato_001.glb', scale: 12.0, category: 'vegetable' },
            
            // Main dishes
            { name: 'burger', file: 'burger_001.glb', scale: 15.0, category: 'main' },
            { name: 'sandwich', file: 'sandwich_001.glb', scale: 12.0, category: 'main' },
            { name: 'sushi', file: 'sushi_dish_001.glb', scale: 10.0, category: 'main' },
            { name: 'fish', file: 'fish_001.glb', scale: 8.0, category: 'main' },
            
            // Snacks & Desserts
            { name: 'donut', file: 'donut_001.glb', scale: 12.0, category: 'dessert' },
            { name: 'ice_cream', file: 'ice_cream_dish_001.glb', scale: 8.0, category: 'dessert' },
            { name: 'yogurt', file: 'yogurt_001.glb', scale: 8.0, category: 'snack' },
            
            // Drinks
            { name: 'coffee1', file: 'coffee_001.glb', scale: 8.0, category: 'drink' },
            { name: 'coffee2', file: 'coffee_002.glb', scale: 8.0, category: 'drink' },
            
            // Tableware
            { name: 'plate', file: 'Plate_001.glb', scale: 12.0, category: 'tableware' }
        ];
        
        this.foodModels = new Map();
        this.loader = new GLTFLoader();
        this.modelsLoaded = false;
        this.loadedCount = 0;
    }
    
    async initialize() {
        console.log('Initializing food spawner with', this.foodTypes.length, 'GLB models...');
        
        try {
            await this.loadAllFoodModels();
            this.modelsLoaded = true;
            console.log('All food models loaded successfully!');
        } catch (error) {
            console.error('Failed to load food models:', error);
            throw error;
        }
        
        console.log('Food spawner ready with', this.foodTypes.length, 'different foods');
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
                        console.log(`Loaded ${foodType.name} (${this.loadedCount}/${this.foodTypes.length})`);
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
        
        // Pick a random food type
        const randomIndex = Math.floor(Math.random() * this.foodTypes.length);
        const foodType = this.foodTypes[randomIndex];
        const foodModel = this.foodModels.get(foodType.name);
        
        if (!foodModel) {
            console.error(`Food model ${foodType.name} not loaded`);
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
            type: foodType.name,
            category: foodType.category,
            mesh: mesh,
            spawnTime: performance.now(),
            velocity: {
                x: (Math.random() - 0.5) * 0.1,  // Small horizontal movement
                y: 0,                            // Start without vertical velocity
                z: (Math.random() - 0.5) * 0.1   // Small depth movement
            }
        });
        
        console.log(`Spawned ${foodType.name} (${foodType.category}), total: ${this.foods.length}`);
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
        
        // Simple physics and cleanup
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            const pos = food.mesh.position;
            
            // Simple gravity (adjustable speed)
            food.velocity.y -= 2.5 * deltaTime; // Slower gravity
            
            // Update position
            pos.x += food.velocity.x * deltaTime;
            pos.y += food.velocity.y * deltaTime;
            pos.z += food.velocity.z * deltaTime;
            
            // Simple rotation for natural look
            food.mesh.rotation.x += 1.0 * deltaTime;
            food.mesh.rotation.z += 0.5 * deltaTime;
            
            // Remove if out of bounds or too old
            const age = performance.now() - food.spawnTime;
            const shouldRemove = (
                pos.y < -5 ||          // Below screen
                age > 15000            // Max 15 seconds life
            );
            
            if (shouldRemove) {
                this.sceneManager.getScene().remove(food.mesh);
                this.foods.splice(i, 1);
                console.log(`Removed food ${food.type}, remaining: ${this.foods.length}`);
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