/**
 * Game Logic Class
 * 
 * Central manager for all game mechanics, scoring, and progression systems.
 * This class implements the core gameplay rules that make the fruit ninja experience
 * engaging and rewarding, including dynamic scoring, combo systems, and level progression.
 * 
 * Key responsibilities:
 * - Manage scoring system with category-based points and special bonuses
 * - Implement combo multiplier system for consecutive hits
 * - Handle level progression based on game time
 * - Track comprehensive game statistics
 * - Provide game state management (reset, progression tracking)
 * - Calculate performance metrics and achievements
 */
export class GameLogic {
    /**
     * Constructor for GameLogic
     * 
     * Initializes all game state variables and scoring configuration.
     * The scoring system is designed to reward skill and encourage continued play.
     */
    constructor() {
        // Core game state
        this.score = 0;                 // Total accumulated score
        this.level = 1;                 // Current difficulty level
        this.foodsSliced = 0;           // Total number of foods successfully sliced
        this.gameTime = 0;              // Total elapsed game time in seconds
        
        /**
         * Points by food category system
         * 
         * Different food categories award different base points to create
         * a risk/reward balance matching their spawn frequency:
         * - Fruits: Common (high spawn rate) = lower points
         * - Main dishes: Rare (low spawn rate) = higher points
         * - Desserts: Medium rarity = medium points
         * - Tableware: Bonus items = small points
         */
        this.pointsByCategory = {
            fruit: 15,          // Apples, banana, peach (common items)
            main: 50,           // Burger (rare, high value)
            dessert: 30,        // Donut (medium rarity)
            tableware: 5        // Plate (bonus/filler item)
        };
        
        /**
         * Special bonus point system
         * 
         * Specific food items can override category points for fine-tuned balance.
         * This allows for special items with unique point values regardless of category.
         */
        this.specialBonuses = {
            burger: 60,         // Premium food item
            donut: 25,          // Sweet treat bonus
            apple: 20,          // Bonus for iconic fruit ninja item
            // Other fruits use standard category points
        };
        
        /**
         * Combo system configuration
         * 
         * Rewards players for consecutive successful slices within a time window.
         * Encourages aggressive play and skillful hand movements.
         */
        this.combo = 0;                 // Current combo streak count
        this.lastSliceTime = 0;         // Timestamp of last successful slice
        this.comboTimeout = 2000;       // Time window to maintain combo (2 seconds)
    }
    
    /**
     * Update game logic state each frame
     * 
     * Handles time-based game mechanics like level progression and combo timeouts.
     * Called every frame to ensure smooth progression and responsive feedback.
     * 
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    update(deltaTime) {
        // Accumulate total game time
        this.gameTime += deltaTime;
        
        /**
         * Time-based level progression
         * 
         * Levels increase every 30 seconds to provide:
         * - Sense of progression and achievement
         * - Increasing score multipliers for longer play sessions
         * - Natural difficulty curve as spawn rates can be adjusted per level
         */
        this.level = Math.floor(this.gameTime / 30) + 1;
        
        /**
         * Combo timeout management
         * 
         * Reset combo if too much time has passed since last slice.
         * This encourages continuous action and prevents combo abuse.
         */
        if (performance.now() - this.lastSliceTime > this.comboTimeout) {
            this.combo = 0;
        }
    }
    
    /**
     * Process a successful food slice and calculate score
     * 
     * This is the core scoring function that handles all point calculations,
     * combo management, and bonus applications. The scoring system is designed
     * to reward both accuracy and speed while providing clear feedback.
     * 
     * @param {string} foodType - Specific type of food sliced (e.g., 'apple', 'burger')
     * @param {string} foodCategory - Category of food sliced (e.g., 'fruit', 'main')
     * @returns {Object} Detailed scoring result for UI feedback and effects
     */
    sliceFood(foodType, foodCategory) {
        /**
         * Calculate base points using hierarchy system
         * 
         * 1. Check for special bonus points for specific food types
         * 2. Fall back to category-based points if no special bonus
         * 3. Use default points if category not found (error recovery)
         */
        let basePoints = this.pointsByCategory[foodCategory] || 15;
        
        // Override with special bonus if available
        if (this.specialBonuses[foodType]) {
            basePoints = this.specialBonuses[foodType];
        }
        
        /**
         * Apply level multiplier for progression reward
         * 
         * Higher levels multiply the base score to reward longer play sessions
         * and provide meaningful progression. Linear scaling keeps growth manageable.
         */
        let points = basePoints * this.level;
        
        /**
         * Combo system implementation
         * 
         * Consecutive slices within the time window build a combo multiplier:
         * - First slice: No combo bonus (1x multiplier)
         * - Subsequent slices: +10% per combo level, capped at 2x
         * - Updates combo counter and timestamp for next calculation
         */
        this.combo++;
        this.lastSliceTime = performance.now();
        
        if (this.combo > 1) {
            // Calculate combo multiplier: 1.1x, 1.2x, 1.3x, etc., max 2.0x
            const comboMultiplier = Math.min(1 + (this.combo - 1) * 0.1, 2.0);
            points = Math.floor(points * comboMultiplier);
        }
        
        /**
         * Update game statistics
         * 
         * Track cumulative statistics for progress tracking and achievements.
         */
        this.score += points;
        this.foodsSliced++;
        
        /**
         * Provide detailed feedback for UI and effects
         * 
         * Log the action with rich information for debugging and player feedback.
         */
        let message = `Sliced ${foodType} (${foodCategory})! +${points} points`;
        if (this.combo > 1) {
            message += ` (COMBO x${this.combo}!)`;
        }
        console.log(message);
        
        /**
         * Return comprehensive slice result
         * 
         * Provides all information needed for:
         * - UI updates and score display
         * - Visual effects and animations
         * - Audio feedback systems
         * - Achievement tracking
         */
        return {
            points: points,
            combo: this.combo,
            category: foodCategory,
            level: this.level
        };
    }
    
    /**
     * Get current total score
     * 
     * @returns {number} Current accumulated score
     */
    getScore() {
        return this.score;
    }
    
    /**
     * Get current level
     * 
     * @returns {number} Current game level
     */
    getLevel() {
        return this.level;
    }
    
    /**
     * Get current combo streak
     * 
     * @returns {number} Current combo count (0 if no active combo)
     */
    getCombo() {
        return this.combo;
    }
    
    /**
     * Get total foods sliced count
     * 
     * @returns {number} Total number of foods successfully sliced
     */
    getFoodsSliced() {
        return this.foodsSliced;
    }
    
    /**
     * Get total game time
     * 
     * @returns {number} Total elapsed game time in seconds
     */
    getGameTime() {
        return this.gameTime;
    }
    
    /**
     * Get comprehensive game statistics
     * 
     * Provides aggregated statistics for UI display, analytics, and performance tracking.
     * Includes calculated metrics like average points per slice for skill assessment.
     * 
     * @returns {Object} Complete statistics summary
     */
    getStatsByCategory() {
        return {
            totalScore: this.score,
            totalSliced: this.foodsSliced,
            currentLevel: this.level,
            currentCombo: this.combo,
            avgPointsPerSlice: this.foodsSliced > 0 ? Math.round(this.score / this.foodsSliced) : 0
        };
    }
    
    /**
     * Reset game to initial state
     * 
     * Clears all progress and statistics for a fresh game session.
     * Useful for restart functionality and game state management.
     */
    reset() {
        this.score = 0;
        this.level = 1;
        this.foodsSliced = 0;
        this.gameTime = 0;
        this.combo = 0;
        this.lastSliceTime = 0;
    }
    
    /**
     * Get current level progress as percentage
     * 
     * Calculates how close the player is to the next level for progress bars
     * and UI elements that show level advancement.
     * 
     * @returns {number} Progress toward next level (0.0 to 1.0)
     */
    getLevelProgress() {
        const timeInCurrentLevel = this.gameTime % 30;
        return timeInCurrentLevel / 30;
    }
}