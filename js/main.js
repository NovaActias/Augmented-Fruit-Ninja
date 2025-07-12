import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

// Import modules
import { CameraManager } from './modules/camera-manager.js';
import { SceneManager } from './modules/scene-manager.js';
import { FoodSpawner } from './modules/food-spawner.js';
import { GameLogic } from './modules/game-logic.js';

class AugmentedFoodNinja {
    constructor() {
        this.isInitialized = false;
        this.lastTime = 0;
        this.gameState = 'loading'; // loading, playing, paused
        
        // Core components
        this.cameraManager = null;
        this.sceneManager = null;
        this.foodSpawner = null;
        this.gameLogic = null;
        
        // DOM elements
        this.videoElement = document.getElementById('videoElement');
        this.canvas = document.getElementById('gameCanvas');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.scoreElement = document.getElementById('scoreValue');
        this.foodCountElement = document.getElementById('fruitCount'); // Keep existing HTML element
        this.debugElement = document.getElementById('debugInfo');
    }
    
    async initialize() {
        try {
            console.log('Initializing Augmented Food Ninja...');
            
            // Initialize camera manager
            this.cameraManager = new CameraManager(this.videoElement);
            await this.cameraManager.initialize();
            
            // Initialize scene manager
            this.sceneManager = new SceneManager(this.canvas, this.videoElement);
            await this.sceneManager.initialize();
            
            // Initialize food spawner
            this.foodSpawner = new FoodSpawner(this.sceneManager);
            await this.foodSpawner.initialize();
            
            // Initialize game logic
            this.gameLogic = new GameLogic();
            
            // Hide loading screen
            this.loadingScreen.style.display = 'none';
            
            console.log('Food Ninja initialization complete!');
            this.isInitialized = true;
            this.gameState = 'playing';
            
            // Start game loop
            this.startGameLoop();
            
        } catch (error) {
            console.error('Initialization failed:', error);
            this.loadingScreen.innerHTML = `
                <div>
                    <h3>Initialization Failed</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }
    
    startGameLoop() {
        const gameLoop = (currentTime) => {
            if (!this.isInitialized || this.gameState !== 'playing') {
                requestAnimationFrame(gameLoop);
                return;
            }
            
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            // Update all systems
            this.update(deltaTime);
            
            // Render frame
            this.render();
            
            // Continue loop
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
    
    update(deltaTime) {
        // Update scene manager (physics)
        this.sceneManager.update(deltaTime);
        
        // Update food spawner
        this.foodSpawner.update(deltaTime);
        
        // Update game logic
        this.gameLogic.update(deltaTime);
        
        // Update UI
        this.updateUI();
    }
    
    render() {
        this.sceneManager.render();
    }
    
    updateUI() {
        // Basic score display
        this.scoreElement.textContent = this.gameLogic.getScore();
        this.foodCountElement.textContent = this.foodSpawner.getActiveFoodCount();
        
        // Enhanced debug info with food system stats
        if (this.sceneManager) {
            const fps = Math.round(1000 / (performance.now() - this.lastTime + 1));
            const stats = this.gameLogic.getStatsByCategory();
            
            this.debugElement.innerHTML = `
                FPS: ${fps} | 
                Level: ${stats.currentLevel} | 
                Combo: ${stats.currentCombo > 1 ? 'x' + stats.currentCombo : 'None'} |
                Foods: ${stats.totalSliced}
            `;
        }
    }
    
    // Method to handle food slicing (for future collision detection)
    sliceFood(food) {
        const result = this.gameLogic.sliceFood(food.type, food.category);
        
        // Remove the food from spawner
        const foodIndex = this.foodSpawner.getFoods().indexOf(food);
        if (foodIndex !== -1) {
            this.sceneManager.getScene().remove(food.mesh);
            this.foodSpawner.getFoods().splice(foodIndex, 1);
        }
        
        // Could add visual effects here (particles, sound, etc.)
        console.log(`Sliced ${food.type}! +${result.points} points`);
        
        return result;
    }
    
    // Get current game state
    getGameState() {
        return {
            score: this.gameLogic.getScore(),
            level: this.gameLogic.getLevel(),
            combo: this.gameLogic.getCombo(),
            foodsSliced: this.gameLogic.getFoodsSliced(),
            activeFoods: this.foodSpawner.getActiveFoodCount(),
            gameTime: this.gameLogic.getGameTime()
        };
    }
    
    // Reset game
    resetGame() {
        // Clear all active foods
        const foods = this.foodSpawner.getFoods();
        foods.forEach(food => {
            this.sceneManager.getScene().remove(food.mesh);
        });
        foods.length = 0;
        
        // Reset game logic
        this.gameLogic.reset();
        
        console.log('Game reset complete!');
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new AugmentedFoodNinja();
    game.initialize();
    
    // Make game globally accessible for debugging
    window.foodNinjaGame = game;
});