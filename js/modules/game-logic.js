export class GameLogic {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.fruitsSliced = 0;
        this.gameTime = 0;
        
        // Game balance
        this.pointsPerFruit = {
            apple: 10,
            orange: 15,
            banana: 20,
            watermelon: 25
        };
    }
    
    update(deltaTime) {
        this.gameTime += deltaTime;
        
        // Level progression based on time
        this.level = Math.floor(this.gameTime / 30) + 1; // New level every 30 seconds
    }
    
    sliceFruit(fruitType) {
        const points = this.pointsPerFruit[fruitType] || 10;
        this.score += points * this.level; // Multiplier based on level
        this.fruitsSliced++;
        
        console.log(`Sliced ${fruitType}! +${points * this.level} points`);
        return points * this.level;
    }
    
    getScore() {
        return this.score;
    }
    
    getLevel() {
        return this.level;
    }
}


