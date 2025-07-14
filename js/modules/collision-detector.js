import * as THREE from 'three';

export class CollisionDetector {
    constructor(handDetector, foodSpawner, gameLogic, fingerVisualizer = null) { // NEW: Add fingerVisualizer parameter
        this.handDetector = handDetector;
        this.foodSpawner = foodSpawner;
        this.gameLogic = gameLogic;
        this.fingerVisualizer = fingerVisualizer; // NEW: Store fingerVisualizer reference
        
        // Collision parameters - tuned for index finger precision
        this.velocityThreshold = 0; // Lower threshold for precise index finger control (was 0.5)
        this.slicedFoods = new Map(); // Track sliced foods with timestamps
        this.collisionCooldown = 200; // ms between collisions on same food
        
        // Visual feedback
        this.recentSlices = []; // Store recent slice positions for effects
        this.maxRecentSlices = 10;
        
        // Debug info
        this.lastCollisionTime = 0;
        this.lastCollisionInfo = null;
        this.totalCollisions = 0;
        this.collisionsByFingertip = new Map();
        
        // Performance optimization
        this.boundingBoxCache = new Map();
        this.cacheTimeout = 100; // ms to cache bounding boxes
    }
    
    update() {
        if (!this.handDetector.hasHands()) {
            this.clearCollisionStatus();
            return;
        }
        
        // Get all fingertips from hand detector
        const fingertips = this.handDetector.getAllFingertips();
        
        // Get all active foods
        const foods = this.foodSpawner.getFoods();
        
        // Check collisions between fingertips and foods
        this.checkCollisions(fingertips, foods);
        
        // Clean up old data
        this.cleanupSlicedFoods();
        this.cleanupRecentSlices();
        this.cleanupBoundingBoxCache();
    }
    
    checkCollisions(fingertips, foods) {
        let collisionDetected = false;
        
        for (const food of foods) {
            // Skip if food was recently sliced
            const sliceData = this.slicedFoods.get(food.mesh.uuid);
            if (sliceData && (performance.now() - sliceData.time) < this.collisionCooldown) {
                continue;
            }
            
            // Get or calculate food bounding box
            const boundingBox = this.getFoodBoundingBox(food);
            
            // Check each fingertip against this food
            for (const fingertip of fingertips) {
                if (this.isPointInBoundingBox(fingertip.position, boundingBox)) {
                    collisionDetected = true;
                    
                    // Check if velocity is sufficient for slicing
                    if (fingertip.velocity >= this.velocityThreshold) {
                        this.handleFoodSlice(food, fingertip);
                        break; // Food is sliced, no need to check other fingertips
                    } else {
                        // Update collision status for touch (but no slice)
                        this.updateCollisionStatus(food, fingertip, false);
                    }
                }
            }
        }
        
        if (!collisionDetected) {
            this.clearCollisionStatus();
        }
    }
    
    getFoodBoundingBox(food) {
        const foodId = food.mesh.uuid;
        const currentTime = performance.now();
        
        // Check cache first
        const cached = this.boundingBoxCache.get(foodId);
        if (cached && (currentTime - cached.time) < this.cacheTimeout) {
            return cached.boundingBox;
        }
        
        // Calculate new bounding box
        const box = new THREE.Box3().setFromObject(food.mesh);

        // Expand bounding box for easier interaction
        const expansion = this.getFoodExpansion(food.type);
        box.expandByScalar(expansion);
        
        // Cache the result
        this.boundingBoxCache.set(foodId, {
            boundingBox: box,
            time: currentTime
        });
        
        return box;
    }
    

    getFoodExpansion(foodType) {
    const expansions = {
        'apple': 0.1,
        'apple_red': 0.01,
        'banana': 0.4,
        'peach': 0.4,
        'donut': 0.4,
        'burger': 0.3,
        'plate': 0.25
    };
    
    return expansions[foodType] || 0.3;
}
    
    isPointInBoundingBox(point, boundingBox) {
        return boundingBox.containsPoint(point);
    }
    
    handleFoodSlice(food, fingertip) {
        const currentTime = performance.now();
        
        // Mark food as sliced
        this.slicedFoods.set(food.mesh.uuid, {
            time: currentTime,
            fingertip: fingertip.type,
            handedness: fingertip.handedness
        });
        
        // Update collision status for successful slice
        this.updateCollisionStatus(food, fingertip, true);
        
        // Track statistics
        this.totalCollisions++;
        const fingertipKey = `${fingertip.handedness}_${fingertip.type}`;
        this.collisionsByFingertip.set(
            fingertipKey,
            (this.collisionsByFingertip.get(fingertipKey) || 0) + 1
        );
        
        // Remove food from spawner
        const foodIndex = this.foodSpawner.getFoods().indexOf(food);
        if (foodIndex !== -1) {
            // Remove from scene
            this.foodSpawner.sceneManager.getScene().remove(food.mesh);
            
            // Remove from foods array
            this.foodSpawner.getFoods().splice(foodIndex, 1);
            
            // Update game logic with score
            const sliceResult = this.gameLogic.sliceFood(food.type, food.category);
            
            // Store slice position for visual effects
            this.addRecentSlice(fingertip.position.clone(), food.type, sliceResult.points);
            
            // NEW: Trigger visual effects with FingerVisualizer
            this.spawnSliceEffects(fingertip.position, food.type, sliceResult);
            
            console.log(`Sliced ${food.type} with ${fingertip.type} finger (${fingertip.velocity.toFixed(2)} vel)! +${sliceResult.points} points`);
        }
    }
    
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
    
    addRecentSlice(position, foodType, points) {
        this.recentSlices.push({
            position: position,
            foodType: foodType,
            points: points,
            time: performance.now()
        });
        
        // Keep only recent slices
        if (this.recentSlices.length > this.maxRecentSlices) {
            this.recentSlices.shift();
        }
    }
    
    spawnSliceEffects(position, foodType, sliceResult) {
        // NEW: Create particle effects using FingerVisualizer
        if (this.fingerVisualizer) {
            this.fingerVisualizer.createSliceEffect(position, foodType);
        }
        
        // Log combo effects
        if (sliceResult.combo > 1) {
            console.log(` COMBO x${sliceResult.combo}! Effects at`, position);
        }
    }
    
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
    
    cleanupRecentSlices() {
        const currentTime = performance.now();
        const sliceLifetime = 2000; // 2 seconds
        
        this.recentSlices = this.recentSlices.filter(
            slice => (currentTime - slice.time) < sliceLifetime
        );
    }
    
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
    
    clearCollisionStatus() {
        // Don't clear immediately - keep status visible for a short time
        if (this.lastCollisionInfo && 
            (performance.now() - this.lastCollisionTime) > 300) {
            this.lastCollisionInfo = null;
        }
    }
    
    // Debug and tuning methods
    setVelocityThreshold(threshold) {
        this.velocityThreshold = Math.max(0, Math.min(3.0, threshold));
        console.log(`Velocity threshold set to: ${this.velocityThreshold}`);
    }
    
    // Get collision statistics
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
    
    // Get current collision status for UI
    getCollisionStatus() {
        if (!this.lastCollisionInfo) return "None";
        
        const timeSinceCollision = performance.now() - this.lastCollisionTime;
        if (timeSinceCollision < 500) {
            const info = this.lastCollisionInfo;
            const sliceIndicator = info.wasSliced ? "" : "";
            return `${sliceIndicator} ${info.foodType} (${info.fingertipType}, ${info.velocity.toFixed(1)}v)`;
        }
        
        return "None";
    }
    
    // Get recent slices for visual effects
    getRecentSlices() {
        return this.recentSlices;
    }
    
    // Performance monitoring
    getPerformanceInfo() {
        return {
            boundingBoxCacheSize: this.boundingBoxCache.size,
            slicedFoodsTracked: this.slicedFoods.size,
            recentSlicesTracked: this.recentSlices.length,
            avgCollisionsPerSecond: this.totalCollisions / (performance.now() / 1000)
        };
    }
}