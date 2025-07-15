import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Food Spawner Class
 * 
 * Manages the procedural generation and lifecycle of falling food objects in the game.
 * This class handles loading 3D food models, spawning them at random intervals and positions,
 * and managing their physics-based movement through the scene.
 * 
 * Key responsibilities:
 * - Load and cache 3D food models from GLTF files
 * - Implement weighted random spawning system for game balance
 * - Configure food object physics and visual properties
 * - Manage spawning timing and maximum object limits
 * - Update food object physics and cleanup off-screen objects
 * - Provide interface for collision detection and game logic integration
 */
export class FoodSpawner {
    /**
     * Constructor for FoodSpawner
     * 
     * @param {SceneManager} sceneManager - Reference to scene manager for object placement
     */
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.foods = [];                    // Array of currently active food objects
        this.spawnTimer = 0;                // Timer for spawn interval management
        this.spawnInterval = 0.8;           // Base spawn interval in seconds
        this.maxFoods = 15;                 // Maximum concurrent food objects (performance limit)
        
        /**
         * Weighted spawn system configuration
         * 
         * Each food type has a weight that determines spawn probability:
         * - Higher weight = more frequent spawning
         * - Fruits: 85% total chance (common, low points)
         * - Donut: 10% chance (uncommon, medium points)
         * - Burger: 3% chance (rare, high points)
         * - Plate: 2% chance (rare bonus item)
         * 
         * Scale values are tuned for optimal visual size and collision detection.
         * Category classification enables different scoring rules.
         */
        this.foodTypes = [
            // Fruits - HIGH SPAWN RATE (common items for consistent gameplay)
            { name: 'apple', file: 'cute_apple.glb', scale: 28.0, category: 'fruit', weight: 25 },
            { name: 'apple_red', file: 'apple_001.glb', scale: 8.5, category: 'fruit', weight: 20 },
            { name: 'banana', file: 'banana_001.glb', scale: 6.5, category: 'fruit', weight: 20 },
            { name: 'peach', file: 'peach_001.glb', scale: 8.0, category: 'fruit', weight: 20 },
            
            // Special items - MEDIUM SPAWN RATE (occasional treats)
            { name: 'donut', file: 'donut_001.glb', scale: 8.0, category: 'dessert', weight: 10 },
            
            // Rare items - LOW SPAWN RATE (high value rewards)
            { name: 'burger', file: 'burger_001.glb', scale: 5.0, category: 'main', weight: 3 },
            { name: 'plate', file: 'Plate_001.glb', scale: 4.0, category: 'tableware', weight: 2 }
        ];
        
        // Model loading and management
        this.foodModels = new Map();        // Cache for loaded 3D models
        this.loader = new GLTFLoader();     // Three.js GLTF loader instance
        this.modelsLoaded = false;          // Flag indicating if all models are ready
        this.loadedCount = 0;               // Counter for loaded models (loading progress)
    }
    
    /**
     * Initialize the food spawner by loading all 3D models
     * 
     * Loads all food models asynchronously and prepares them for spawning.
     * This must complete before spawning can begin to ensure all models are available.
     */
    async initialize() {
        try {
            await this.loadAllFoodModels();
            this.modelsLoaded = true;
        } catch (error) {
            console.error('Failed to load food models:', error);
            throw error;
        }
    }
    
    /**
     * Load all food models from GLTF files
     * 
     * Asynchronously loads each food model, applies proper scaling and centering,
     * and configures materials for optimal lighting and performance.
     * Uses Promise.all to load models in parallel for faster initialization.
     */
    async loadAllFoodModels() {
        // Create array of loading promises for parallel loading
        const loadPromises = this.foodTypes.map(foodType => {
            return new Promise((resolve, reject) => {
                this.loader.load(
                    `assets/${foodType.file}`,     // Model file path
                    (gltf) => {
                        const model = gltf.scene;
                        
                        /**
                         * Apply proper scaling for game balance
                         * 
                         * Each food type has a carefully tuned scale value that balances:
                         * - Visual appeal and recognizability
                         * - Collision detection accuracy
                         * - Game difficulty (larger objects easier to hit)
                         */
                        model.scale.setScalar(foodType.scale);
                        
                        /**
                         * Center the model at origin
                         * 
                         * Ensures consistent positioning regardless of how the original
                         * 3D model was positioned during creation. This makes spawning
                         * and collision detection more predictable.
                         */
                        const box = new THREE.Box3().setFromObject(model);
                        const center = box.getCenter(new THREE.Vector3());
                        model.position.sub(center);
                        
                        // Configure model materials and properties
                        this.configureModel(model, foodType);
                        
                        // Store configured model in cache
                        this.foodModels.set(foodType.name, model);
                        this.loadedCount++;
                        resolve();
                    },
                    (progress) => {
                        // Optional: loading progress tracking for UI feedback
                    },
                    (error) => {
                        console.error(`Error loading ${foodType.file}:`, error);
                        reject(error);
                    }
                );
            });
        });
        
        // Wait for all models to load before proceeding
        await Promise.all(loadPromises);
    }
    
    /**
     * Configure 3D model properties for optimal game rendering
     * 
     * Sets up shadows, materials, and special model-specific configurations.
     * This ensures consistent visual quality and performance across all food types.
     * 
     * @param {THREE.Group} model - The loaded 3D model
     * @param {Object} foodType - Food type configuration object
     */
    configureModel(model, foodType) {
        model.traverse((child) => {
            if (child.isMesh) {
                /**
                 * Enable shadow casting and receiving
                 * 
                 * Shadows provide important depth cues that help players
                 * judge object positions in 3D space for accurate slicing.
                 */
                child.castShadow = true;
                child.receiveShadow = true;
                
                /**
                 * Special handling for cute_apple model
                 * 
                 * This model contains multiple mesh parts including pre-cut sections.
                 * We only show the whole apple part initially, hiding cut parts
                 * until slicing occurs (handled by collision detection).
                 */
                if (foodType.file === 'cute_apple.glb') {
                    if (child.name === 'apple_whole_m_apple_outer_0') {
                        child.visible = true;   // Show whole apple
                    } else {
                        child.visible = false;  // Hide cut pieces initially
                    }
                }
                
                /**
                 * Optimize material properties for game lighting
                 * 
                 * Adjusts material properties to work well with the game's lighting setup
                 * while maintaining visual appeal and performance.
                 */
                if (child.material) {
                    // Remove emissive lighting for consistent appearance
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0x000000);
                    }
                    if (child.material.emissiveIntensity !== undefined) {
                        child.material.emissiveIntensity = 0.0;
                    }
                    
                    // Adjust surface properties for realistic lighting response
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
    
    /**
     * Spawn a new food object using weighted random selection
     * 
     * Creates a new food instance by:
     * 1. Selecting food type based on weighted probabilities
     * 2. Cloning the cached model for this instance
     * 3. Positioning at random spawn location
     * 4. Adding to scene and tracking arrays
     * 
     * Respects maximum food limit and model loading status.
     */
    spawnFood() {
        // Prevent spawning if at capacity or models not ready
        if (this.foods.length >= this.maxFoods || !this.modelsLoaded) return;
        
        /**
         * Weighted random selection algorithm
         * 
         * Implements fair weighted selection by:
         * 1. Calculating total weight of all food types
         * 2. Generating random number in range [0, totalWeight]
         * 3. Iterating through types, subtracting weights until reaching 0
         * 4. Selected type is where the counter reaches/crosses 0
         */
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
        
        // Fallback safety - should never occur with correct weights
        if (!selectedFoodType) {
            selectedFoodType = this.foodTypes[0];
        }
        
        // Get the cached model for cloning
        const foodModel = this.foodModels.get(selectedFoodType.name);
        
        if (!foodModel) {
            return; // Model not loaded yet
        }
        
        /**
         * Clone model for this instance
         * 
         * Creates independent copy of the cached model so multiple instances
         * can exist simultaneously without interfering with each other.
         */
        const mesh = foodModel.clone();
        
        /**
         * Clone materials to prevent shared material issues
         * 
         * Ensures each food instance has independent materials, preventing
         * visual artifacts when one instance is modified (e.g., during slicing).
         */
        mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
            }
        });
        
        /**
         * Random spawn positioning
         * 
         * Spawns objects at random horizontal positions across screen width
         * with slight depth variation for visual interest. Vertical position
         * is above screen to allow natural falling motion.
         */
        const spawnX = (Math.random() - 0.5) * 8;   // Horizontal range: -4 to +4
        const spawnY = 6;                           // Above visible screen area
        const spawnZ = (Math.random() - 0.5) * 2;   // Depth variation: -1 to +1
        
        mesh.position.set(spawnX, spawnY, spawnZ);
        
        // Add mesh to the 3D scene
        this.sceneManager.getScene().add(mesh);
        
        /**
         * Create food tracking object
         * 
         * Stores all necessary information for managing this food instance:
         * - Type and category for scoring
         * - Mesh reference for visual updates
         * - Spawn time for age-based cleanup
         * - Velocity for physics simulation
         */
        this.foods.push({
            type: selectedFoodType.name,
            category: selectedFoodType.category,
            mesh: mesh,
            spawnTime: performance.now(),
            velocity: {
                x: (Math.random() - 0.5) * 0.1,    // Slight horizontal drift
                y: 0,                              // No initial vertical velocity (gravity applies)
                z: (Math.random() - 0.5) * 0.1     // Slight depth movement
            }
        });
    }
    
    /**
     * Update all food objects and manage spawning
     * 
     * Called every frame to:
     * 1. Handle spawn timing and create new food objects
     * 2. Update physics simulation for all active foods
     * 3. Clean up objects that have fallen off screen or expired
     * 
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    update(deltaTime) {
        /**
         * Manage spawn timing with randomization
         * 
         * Uses variable spawn intervals to create unpredictable timing
         * that keeps players engaged and prevents monotonous patterns.
         */
        this.spawnTimer += deltaTime;
        
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnFood();
            this.spawnTimer = 0;
            
            // Randomize next spawn interval (0.5-1.3 seconds)
            this.spawnInterval = 0.5 + Math.random() * 0.8;
        }
        
        /**
         * Update physics and perform cleanup for all active foods
         * 
         * Iterates backwards through array to safely remove items during iteration.
         * This prevents index shifting issues when removing multiple items.
         */
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            const pos = food.mesh.position;
            
            /**
             * Apply gravity acceleration
             * 
             * Gravity value (1.8) is tuned to feel natural while giving players
             * sufficient time to react and perform slicing gestures.
             */
            food.velocity.y -= 1.8 * deltaTime;
            
            /**
             * Update position based on velocity
             * 
             * Simple Euler integration for position updates.
             * Sufficient accuracy for game objects with this time scale.
             */
            pos.x += food.velocity.x * deltaTime;
            pos.y += food.velocity.y * deltaTime;
            pos.z += food.velocity.z * deltaTime;
            
            /**
             * Add natural rotation during fall
             * 
             * Slow rotation makes falling objects look more natural and organic.
             * Different rotation speeds on different axes create varied motion.
             */
            food.mesh.rotation.x += 0.8 * deltaTime;
            food.mesh.rotation.z += 0.4 * deltaTime;
            
            /**
             * Cleanup conditions for off-screen or expired objects
             * 
             * Objects are removed if they:
             * - Fall below visible screen area (y < -5)
             * - Exceed maximum lifetime (15 seconds)
             * 
             * This prevents memory leaks and maintains performance.
             */
            const age = performance.now() - food.spawnTime;
            const shouldRemove = (
                pos.y < -5 ||          // Below screen boundary
                age > 15000            // Maximum lifetime reached
            );
            
            if (shouldRemove) {
                // Remove from 3D scene
                this.sceneManager.getScene().remove(food.mesh);
                // Remove from tracking array
                this.foods.splice(i, 1);
            }
        }
    }
    
    /**
     * Get current number of active food objects
     * 
     * @returns {number} Count of active food objects
     */
    getActiveFoodCount() {
        return this.foods.length;
    }
    
    /**
     * Get array of all active food objects
     * 
     * Provides access to food array for other systems like collision detection.
     * 
     * @returns {Array} Array of active food objects
     */
    getFoods() {
        return this.foods;
    }
    
    /**
     * Get food objects filtered by category
     * 
     * Useful for category-specific game mechanics or scoring rules.
     * 
     * @param {string} category - Food category to filter ('fruit', 'dessert', etc.)
     * @returns {Array} Array of food objects matching the specified category
     */
    getFoodsByCategory(category) {
        return this.foods.filter(food => food.category === category);
    }
}