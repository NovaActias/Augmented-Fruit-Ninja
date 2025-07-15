import * as THREE from 'three';

/**
 * Collision Detector Class
 * 
 * Advanced collision detection system that bridges hand tracking and game mechanics.
 * This class implements precise 3D collision detection between finger positions and
 * food objects, with velocity-based slice recognition and visual feedback integration.
 * 
 * Key responsibilities:
 * - Detect 3D collisions between fingertips and food bounding boxes
 * - Implement velocity-based slicing mechanics for realistic interaction
 * - Manage collision cooldowns to prevent duplicate slice events
 * - Coordinate with game logic for scoring and progression
 * - Trigger visual effects through finger visualizer integration
 * - Provide performance optimization through bounding box caching
 * - Track comprehensive collision statistics for debugging and analytics
 */
export class CollisionDetector {
    /**
     * Constructor for CollisionDetector
     * 
     * @param {HandDetector} handDetector - Hand tracking system providing fingertip data
     * @param {FoodSpawner} foodSpawner - Food management system providing active food objects
     * @param {GameLogic} gameLogic - Game mechanics system for scoring and progression
     * @param {FingerVisualizer} fingerVisualizer - Visual effects system for slice feedback
     */
    constructor(handDetector, foodSpawner, gameLogic, fingerVisualizer = null) {
        this.handDetector = handDetector;
        this.foodSpawner = foodSpawner;
        this.gameLogic = gameLogic;
        this.fingerVisualizer = fingerVisualizer;   // Optional visual effects integration
        
        /**
         * Collision detection parameters
         * 
         * Tuned for precision index finger control:
         * - Low velocity threshold enables slicing with gentle movements
         * - Cooldown prevents rapid duplicate slices on same object
         */
        this.velocityThreshold = 0;         // Minimum velocity for slice recognition (lowered for accessibility)
        this.slicedFoods = new Map();       // Tracks recently sliced foods with timestamps
        this.collisionCooldown = 200;       // Milliseconds between collisions on same food
        
        // Visual feedback system
        this.recentSlices = [];             // Recent slice positions for effect spawning
        this.maxRecentSlices = 10;          // Maximum stored slice positions
        
        /**
         * Debug and analytics tracking
         * 
         * Comprehensive tracking for performance optimization and debugging:
         * - Collision timing and frequency
         * - Success/failure ratios by fingertip type
         * - Performance metrics for optimization
         */
        this.lastCollisionTime = 0;
        this.lastCollisionInfo = null;
        this.totalCollisions = 0;
        this.collisionsByFingertip = new Map();
        
        /**
         * Performance optimization system
         * 
         * Bounding box caching reduces computational overhead by storing
         * calculated collision volumes and reusing them across frames.
         */
        this.boundingBoxCache = new Map();
        this.cacheTimeout = 100;            // Milliseconds to cache bounding boxes
    }
    
    /**
     * Main collision detection update loop
     * 
     * Called every frame to check for collisions between all fingertips and food objects.
     * Implements early exit strategies for performance and handles collision state management.
     */
    update() {
        // Skip processing if no hands are detected
        if (!this.handDetector.hasHands()) {
            this.clearCollisionStatus();
            return;
        }
        
        // Get current fingertips and active food objects
        const fingertips = this.handDetector.getAllFingertips();
        const foods = this.foodSpawner.getFoods();
        
        // Perform collision detection between fingertips and foods
        this.checkCollisions(fingertips, foods);
        
        // Maintain system cleanliness and performance
        this.cleanupSlicedFoods();
        this.cleanupRecentSlices();
        this.cleanupBoundingBoxCache();
    }
    
    /**
     * Check collisions between all fingertips and food objects
     * 
     * Implements comprehensive collision detection with:
     * - Cooldown period management for recently sliced foods
     * - Bounding box collision testing for efficiency
     * - Velocity-based slice validation for realistic interaction
     * 
     * @param {Array} fingertips - Array of active fingertip positions and data
     * @param {Array} foods - Array of active food objects in the scene
     */
    checkCollisions(fingertips, foods) {
        let collisionDetected = false;
        
        for (const food of foods) {
            /**
             * Skip recently sliced foods to prevent duplicate scoring
             * 
             * Collision cooldown ensures each food can only be sliced once
             * and prevents rapid duplicate slice events from single gesture.
             */
            const sliceData = this.slicedFoods.get(food.mesh.uuid);
            if (sliceData && (performance.now() - sliceData.time) < this.collisionCooldown) {
                continue;
            }
            
            // Get optimized bounding box for this food object
            const boundingBox = this.getFoodBoundingBox(food);
            
            /**
             * Test each fingertip against current food object
             * 
             * Uses early exit when slice is detected to prevent multiple
             * fingertips from slicing the same food simultaneously.
             */
            for (const fingertip of fingertips) {
                if (this.isPointInBoundingBox(fingertip.position, boundingBox)) {
                    collisionDetected = true;
                    
                    /**
                     * Velocity-based slice validation
                     * 
                     * Distinguishes between:
                     * - High velocity: Slicing gesture (triggers slice)
                     * - Low velocity: Hovering/positioning (collision without slice)
                     */
                    if (fingertip.velocity >= this.velocityThreshold) {
                        this.handleFoodSlice(food, fingertip);
                        break; // Food is sliced, stop checking other fingertips
                    } else {
                        // Update collision status for touch without slice
                        this.updateCollisionStatus(food, fingertip, false);
                    }
                }
            }
        }
        
        // Clear collision status if no collisions detected this frame
        if (!collisionDetected) {
            this.clearCollisionStatus();
        }
    }
    
    /**
     * Get or calculate food object bounding box with caching
     * 
     * Implements performance optimization by caching calculated bounding boxes
     * and reusing them for multiple frames. This reduces computational overhead
     * for complex 3D models with many vertices.
     * 
     * @param {Object} food - Food object with mesh and type information
     * @returns {THREE.Box3} Bounding box for collision detection
     */
    getFoodBoundingBox(food) {
        const foodId = food.mesh.uuid;
        const currentTime = performance.now();
        
        // Check cache for recent bounding box calculation
        const cached = this.boundingBoxCache.get(foodId);
        if (cached && (currentTime - cached.time) < this.cacheTimeout) {
            return cached.boundingBox;
        }
        
        /**
         * Calculate new bounding box from mesh geometry
         * 
         * Three.js Box3.setFromObject() calculates tight bounding box
         * around all mesh vertices in world coordinates.
         */
        const box = new THREE.Box3().setFromObject(food.mesh);

        /**
         * Expand bounding box for easier interaction
         * 
         * Slight expansion makes collision detection more forgiving,
         * accounting for hand tracking accuracy and improving user experience.
         */
        const expansion = this.getFoodExpansion(food.type);
        box.expandByScalar(expansion);
        
        // Cache the calculated bounding box for future frames
        this.boundingBoxCache.set(foodId, {
            boundingBox: box,
            time: currentTime
        });
        
        return box;
    }
    
    /**
     * Get food-specific bounding box expansion values
     * 
     * Different food types have different expansion values based on:
     * - Model complexity and collision accuracy needs
     * - Visual size and user expectations
     * - Game balance considerations (harder vs easier targets)
     * 
     * @param {string} foodType - Type of food object
     * @returns {number} Expansion value for bounding box
     */
    getFoodExpansion(foodType) {
        const expansions = {
            'apple': 0.1,           // Minimal expansion for precise slicing
            'apple_red': 0.01,      // Very tight collision for small apple
            'banana': 0.4,          // Generous expansion for elongated shape
            'peach': 0.4,           // Similar to banana for consistency
            'donut': 0.4,           // Medium expansion for torus shape
            'burger': 0.3,          // Moderate expansion for layered model
            'plate': 0.25           // Smaller expansion for bonus item
        };
        
        return expansions[foodType] || 0.3; // Default expansion if type not found
    }
    
    /**
     * Test if a point is inside a bounding box
     * 
     * Simple and efficient point-in-box test using Three.js built-in method.
     * This is the core collision detection test that determines if a fingertip
     * is touching a food object.
     * 
     * @param {THREE.Vector3} point - Point to test (fingertip position)
     * @param {THREE.Box3} boundingBox - Bounding box to test against
     * @returns {boolean} True if point is inside bounding box
     */
    isPointInBoundingBox(point, boundingBox) {
        return boundingBox.containsPoint(point);
    }
    
    /**
     * Handle successful food slice event
     * 
     * Processes a confirmed slice by:
     * 1. Marking food as sliced to prevent duplicates
     * 2. Updating collision tracking and statistics
     * 3. Removing food from scene and spawner
     * 4. Updating game logic with score
     * 5. Triggering visual effects
     * 
     * @param {Object} food - Food object that was sliced
     * @param {Object} fingertip - Fingertip that performed the slice
     */
    handleFoodSlice(food, fingertip) {
        const currentTime = performance.now();
        
        /**
         * Mark food as sliced with comprehensive tracking data
         * 
         * Stores slice information for cooldown management and analytics.
         */
        this.slicedFoods.set(food.mesh.uuid, {
            time: currentTime,
            fingertip: fingertip.type,
            handedness: fingertip.handedness
        });
        
        // Update collision status for successful slice
        this.updateCollisionStatus(food, fingertip, true);
        
        /**
         * Update collision statistics for analytics
         * 
         * Tracks performance metrics for debugging and game balance.
         */
        this.totalCollisions++;
        const fingertipKey = `${fingertip.handedness}_${fingertip.type}`;
        this.collisionsByFingertip.set(
            fingertipKey,
            (this.collisionsByFingertip.get(fingertipKey) || 0) + 1
        );
        
        /**
         * Remove food from game scene and tracking
         * 
         * Safely removes the food object from both visual scene and
         * spawner's tracking array to prevent memory leaks.
         */
        const foodIndex = this.foodSpawner.getFoods().indexOf(food);
        if (foodIndex !== -1) {
            // Remove visual mesh from Three.js scene
            this.foodSpawner.sceneManager.getScene().remove(food.mesh);
            
            // Remove from spawner's tracking array
            this.foodSpawner.getFoods().splice(foodIndex, 1);
            
            /**
             * Update game logic with scoring information
             * 
             * Game logic handles all scoring calculations including:
             * - Base points by food type/category
             * - Level multipliers
             * - Combo bonuses
             */
            const sliceResult = this.gameLogic.sliceFood(food.type, food.category);
            
            // Store slice position for visual effects
            this.addRecentSlice(fingertip.position.clone(), food.type, sliceResult.points);
            
            // Trigger visual effects if finger visualizer is available
            this.spawnSliceEffects(fingertip.position, food.type, sliceResult);
            
            // Log successful slice for debugging
            console.log(`Sliced ${food.type} with ${fingertip.type} finger (${fingertip.velocity.toFixed(2)} vel)! +${sliceResult.points} points`);
        }
    }
    
    /**
     * Update collision status for UI feedback
     * 
     * Maintains current collision state information for display in UI
     * and debugging interfaces. Tracks both successful slices and touches.
     * 
     * @param {Object} food - Food object involved in collision
     * @param {Object} fingertip - Fingertip involved in collision
     * @param {boolean} wasSliced - Whether the collision resulted in a slice
     */
    updateCollisionStatus(food, fingertip, wasSliced) {
        this.lastCollisionTime = performance.now();
        this.lastCollisionInfo = {
            foodType: food.type,
            fingertipType: fingertip.type,
            handedness: fingertip.handedness,
            position: fingertip.position.clone(),
            velocity: fingertip.velocity,
            wasSliced: wasSliced
        };
    }
    
    /**
     * Add slice position to recent slices tracking
     * 
     * Maintains a record of recent slice positions for visual effects
     * and analytics. Used by effects systems to spawn particles and animations.
     * 
     * @param {THREE.Vector3} position - World position where slice occurred
     * @param {string} foodType - Type of food that was sliced
     * @param {number} points - Points awarded for the slice
     */
    addRecentSlice(position, foodType, points) {
        this.recentSlices.push({
            position: position,
            foodType: foodType,
            points: points,
            time: performance.now()
        });
        
        // Maintain maximum slice history to prevent memory growth
        if (this.recentSlices.length > this.maxRecentSlices) {
            this.recentSlices.shift();
        }
    }
    
    /**
     * Spawn visual effects for successful slice
     * 
     * Coordinates with finger visualizer to create particle effects and
     * other visual feedback for successful slices. Enhances game feel
     * and provides clear feedback to players.
     * 
     * @param {THREE.Vector3} position - World position for effect spawn
     * @param {string} foodType - Type of food sliced (affects effect style)
     * @param {Object} sliceResult - Comprehensive slice data from game logic
     */
    spawnSliceEffects(position, foodType, sliceResult) {
        // Create particle effects using finger visualizer if available
        if (this.fingerVisualizer) {
            this.fingerVisualizer.createSliceEffect(position, foodType);
        }
        
        // Special logging for combo effects
        if (sliceResult.combo > 1) {
            console.log(`🔥 COMBO x${sliceResult.combo}! Effects at`, position);
        }
    }
    
    /**
     * Clean up expired slice tracking data
     * 
     * Removes old slice records to prevent memory leaks and ensure
     * collision cooldowns work correctly. Called every frame to maintain
     * system cleanliness.
     */
    cleanupSlicedFoods() {
        const currentTime = performance.now();
        const toRemove = [];
        
        for (const [foodUuid, sliceData] of this.slicedFoods) {
            if (currentTime - sliceData.time > this.collisionCooldown) {
                toRemove.push(foodUuid);
            }
        }
        
        toRemove.forEach(uuid => this.slicedFoods.delete(uuid));
    }
    
    /**
     * Clean up expired recent slice records
     * 
     * Removes old slice position data to prevent memory growth while
     * maintaining recent data for visual effects.
     */
    cleanupRecentSlices() {
        const currentTime = performance.now();
        const sliceLifetime = 2000; // 2 seconds retention for effects
        
        this.recentSlices = this.recentSlices.filter(
            slice => (currentTime - slice.time) < sliceLifetime
        );
    }
    
    /**
     * Clean up expired bounding box cache entries
     * 
     * Removes old cached bounding boxes to prevent memory leaks while
     * maintaining performance benefits of caching.
     */
    cleanupBoundingBoxCache() {
        const currentTime = performance.now();
        const toRemove = [];
        
        for (const [foodId, cached] of this.boundingBoxCache) {
            if (currentTime - cached.time > this.cacheTimeout) {
                toRemove.push(foodId);
            }
        }
        
        toRemove.forEach(id => this.boundingBoxCache.delete(id));
    }
    
    /**
     * Clear collision status with timeout
     * 
     * Maintains collision status visibility for a brief period after
     * collision ends to provide smooth UI feedback.
     */
    clearCollisionStatus() {
        // Keep status visible for brief period for smooth UI transitions
        if (this.lastCollisionInfo && 
            (performance.now() - this.lastCollisionTime) > 300) {
            this.lastCollisionInfo = null;
        }
    }
    
    /**
     * Set collision velocity threshold for debugging/tuning
     * 
     * Allows runtime adjustment of slice sensitivity for testing
     * and accessibility customization.
     * 
     * @param {number} threshold - New velocity threshold (0.0 to 3.0)
     */
    setVelocityThreshold(threshold) {
        this.velocityThreshold = Math.max(0, Math.min(3.0, threshold));
        console.log(`Velocity threshold set to: ${this.velocityThreshold}`);
    }
    
    /**
     * Get comprehensive collision statistics
     * 
     * Provides detailed analytics data for debugging, performance monitoring,
     * and game balance analysis.
     * 
     * @returns {Object} Complete collision statistics
     */
    getCollisionStats() {
        return {
            totalCollisions: this.totalCollisions,
            lastCollisionTime: this.lastCollisionTime,
            lastCollisionInfo: this.lastCollisionInfo,
            slicedFoodsCount: this.slicedFoods.size,
            velocityThreshold: this.velocityThreshold,
            recentSlicesCount: this.recentSlices.length,
            collisionsByFingertip: Object.fromEntries(this.collisionsByFingertip),
            cacheSize: this.boundingBoxCache.size
        };
    }
    
    /**
     * Get current collision status for UI display
     * 
     * Formats collision information for user interface display with
     * appropriate icons and timing.
     * 
     * @returns {string} Formatted collision status string
     */
    getCollisionStatus() {
        if (!this.lastCollisionInfo) return "None";
        
        const timeSinceCollision = performance.now() - this.lastCollisionTime;
        if (timeSinceCollision < 500) {
            const info = this.lastCollisionInfo;
            const sliceIndicator = info.wasSliced ? "✂️" : "👆";
            return `${sliceIndicator} ${info.foodType} (${info.fingertipType}, ${info.velocity.toFixed(1)}v)`;
        }
        
        return "None";
    }
    
    /**
     * Get recent slices for visual effects systems
     * 
     * Provides access to recent slice data for external effects systems
     * and analytics tracking.
     * 
     * @returns {Array} Array of recent slice objects
     */
    getRecentSlices() {
        return this.recentSlices;
    }
    
    /**
     * Get performance monitoring information
     * 
     * Provides system performance metrics for optimization and debugging.
     * 
     * @returns {Object} Performance monitoring data
     */
    getPerformanceInfo() {
        return {
            boundingBoxCacheSize: this.boundingBoxCache.size,
            slicedFoodsTracked: this.slicedFoods.size,
            recentSlicesTracked: this.recentSlices.length,
            avgCollisionsPerSecond: this.totalCollisions / (performance.now() / 1000)
        };
    }
}