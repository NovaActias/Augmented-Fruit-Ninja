export class GameLogic {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.foodsSliced = 0;
        this.gameTime = 0;
        
        // Points by category - only for the remaining food types
        this.pointsByCategory = {
            fruit: 15,        // Apples, banana, peach (increased from 10)
            main: 50,         // Burger (kept high value)
            dessert: 30,      // Donut (kept same)
            tableware: 5      // Plate (bonus item)
        };
        
        // Special bonuses for specific items
        this.specialBonuses = {
            burger: 60,       // Popular food
            donut: 25,        // Sweet treat
            apple: 20,        // Bonus for cute apple
            // Standard fruits use category points
        };
        
        // Combo system
        this.combo = 0;
        this.lastSliceTime = 0;
        this.comboTimeout = 2000; // 2 seconds to maintain combo
    }
    
    update(deltaTime) {
        this.gameTime += deltaTime;
        
        // Level progression based on time
        this.level = Math.floor(this.gameTime / 30) + 1; // New level every 30 seconds
        
        // Reset combo if too much time passed
        if (performance.now() - this.lastSliceTime > this.comboTimeout) {
            this.combo = 0;
        }
    }
    
    sliceFood(foodType, foodCategory) {
        // Get base points
        let basePoints = this.pointsByCategory[foodCategory] || 15;
        
        // Check for special bonuses
        if (this.specialBonuses[foodType]) {
            basePoints = this.specialBonuses[foodType];
        }
        
        // Apply level multiplier
        let points = basePoints * this.level;
        
        // Apply combo multiplier
        this.combo++;
        this.lastSliceTime = performance.now();
        
        if (this.combo > 1) {
            const comboMultiplier = Math.min(1 + (this.combo - 1) * 0.1, 2.0); // Max 2x combo
            points = Math.floor(points * comboMultiplier);
        }
        
        // Add to total score
        this.score += points;
        this.foodsSliced++;
        
        // Log the action
        let message = `Sliced ${foodType} (${foodCategory})! +${points} points`;
        if (this.combo > 1) {
            message += ` (COMBO x${this.combo}!)`;
        }
        console.log(message);
        
        return {
            points: points,
            combo: this.combo,
            category: foodCategory,
            level: this.level
        };
    }
    
    getScore() {
        return this.score;
    }
    
    getLevel() {
        return this.level;
    }
    
    getCombo() {
        return this.combo;
    }
    
    getFoodsSliced() {
        return this.foodsSliced;
    }
    
    getGameTime() {
        return this.gameTime;
    }
    
    // Get statistics by category
    getStatsByCategory() {
        return {
            totalScore: this.score,
            totalSliced: this.foodsSliced,
            currentLevel: this.level,
            currentCombo: this.combo,
            avgPointsPerSlice: this.foodsSliced > 0 ? Math.round(this.score / this.foodsSliced) : 0
        };
    }
    
    // Reset game
    reset() {
        this.score = 0;
        this.level = 1;
        this.foodsSliced = 0;
        this.gameTime = 0;
        this.combo = 0;
        this.lastSliceTime = 0;
    }
    
    // Get next level progress (0-1)
    getLevelProgress() {
        const timeInCurrentLevel = this.gameTime % 30;
        return timeInCurrentLevel / 30;
    }
}