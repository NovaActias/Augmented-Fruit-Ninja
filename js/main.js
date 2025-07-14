// Import modules
import { CameraManager } from './modules/camera-manager.js';
import { SceneManager } from './modules/scene-manager.js';
import { FoodSpawner } from './modules/food-spawner.js';
import { GameLogic } from './modules/game-logic.js';
import { HandDetector } from './modules/hand-detector.js';
import { CollisionDetector } from './modules/collision-detector.js';
import { FingerVisualizer } from './modules/finger-visualizer.js';

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
        this.handDetector = null;
        this.collisionDetector = null;
        this.fingerVisualizer = null;
        
        // DOM elements
        this.videoElement = document.getElementById('videoElement');
        this.canvas = document.getElementById('gameCanvas');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.scoreElement = document.getElementById('scoreValue');
        this.debugElement = document.getElementById('debugInfo');
        
        // Hand tracking UI elements
        this.handCountElement = document.getElementById('handCount');
        this.collisionStatusElement = document.getElementById('collisionStatus');
    }
    
    async initialize() {
        try {
            this.updateLoadingStatus('Initializing camera...');
            
            // Initialize camera manager
            this.cameraManager = new CameraManager(this.videoElement);
            await this.cameraManager.initialize();
            
            this.updateLoadingStatus('Setting up 3D scene...');
            
            // Initialize scene manager
            this.sceneManager = new SceneManager(this.canvas, this.videoElement);
            await this.sceneManager.initialize();
            
            this.updateLoadingStatus('Loading food models...');
            
            // Initialize food spawner
            this.foodSpawner = new FoodSpawner(this.sceneManager);
            await this.foodSpawner.initialize();
            
            this.updateLoadingStatus('Initializing hand tracking...');
            
            // Initialize hand detector
            this.handDetector = new HandDetector(this.videoElement, this.sceneManager.getCamera());
            await this.handDetector.initialize();
            
            this.updateLoadingStatus('Setting up finger visualization...'); // NEW: Loading message
            
            // NEW: Initialize finger visualizer
            this.fingerVisualizer = new FingerVisualizer(this.sceneManager);
            
            this.updateLoadingStatus('Setting up collision detection...');
            
            // Initialize game logic
            this.gameLogic = new GameLogic();
            
            // Initialize collision detector (pass fingerVisualizer for particles)
            this.collisionDetector = new CollisionDetector(
                this.handDetector, 
                this.foodSpawner, 
                this.gameLogic,
                this.fingerVisualizer
            );
            
            this.updateLoadingStatus('Ready to play!');
            
            // Hide loading screen
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
            
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
    
    updateLoadingStatus(message) {
        this.loadingScreen.innerHTML = message;
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
        
        // Update hand detection
        this.handDetector.update();
        
        // NEW: Update finger visualization with current fingertips
        if (this.fingerVisualizer) {
            const fingertips = this.handDetector.getAllFingertips();
            this.fingerVisualizer.update(deltaTime, fingertips);
        }
        
        // Update collision detection
        this.collisionDetector.update();
        
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
        
        // Hand tracking UI
        this.handCountElement.textContent = this.handDetector.getHandCount();
        this.collisionStatusElement.textContent = this.collisionDetector.getCollisionStatus();
        
        // Enhanced debug info
        if (this.sceneManager) {
            const fps = Math.round(1000 / (performance.now() - this.lastTime + 1));
            const stats = this.gameLogic.getStatsByCategory();
            const handDebug = this.handDetector.getDebugInfo();
            
            this.debugElement.innerHTML = `
                FPS: ${fps} | 
                Level: ${stats.currentLevel} | 
                Combo: ${stats.currentCombo > 1 ? 'x' + stats.currentCombo : 'None'} |
                Sliced: ${stats.totalSliced} |
                Confidence: ${handDebug.averageConfidence}
            `;
        }
    }
    
    // Get current game state (enhanced with hand tracking)
    getGameState() {
        return {
            score: this.gameLogic.getScore(),
            level: this.gameLogic.getLevel(),
            combo: this.gameLogic.getCombo(),
            foodsSliced: this.gameLogic.getFoodsSliced(),
            gameTime: this.gameLogic.getGameTime(),
            handsDetected: this.handDetector.getHandCount(),
            handConfidence: this.handDetector.getAverageConfidence(),
            collisionStats: this.collisionDetector.getCollisionStats()
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
        
        // Reset collision detection
        this.collisionDetector.slicedFoods.clear();
        this.collisionDetector.totalCollisions = 0;
    }
    
    // Debug methods for development
    toggleBoundingBoxes() {
        if (this.collisionDetector) {
            this.collisionDetector.toggleBoundingBoxes();
        }
    }
    
    adjustCollisionSensitivity(sensitivity) {
        if (this.collisionDetector) {
            this.collisionDetector.setVelocityThreshold(sensitivity);
        }
    }
    
    // NEW: Toggle finger visualization
    toggleFingerVisualization() {
        if (this.fingerVisualizer) {
            this.fingerVisualizer.setEnabled(!this.fingerVisualizer.isEnabled);
        }
    }
    
    // Get detailed debug information
    getDebugInfo() {
        return {
            camera: this.cameraManager ? 'Ready' : 'Not Ready',
            scene: this.sceneManager ? 'Ready' : 'Not Ready',
            foodSpawner: this.foodSpawner ? 'Ready' : 'Not Ready',
            handDetector: this.handDetector ? (this.handDetector.isReady ? 'Ready' : 'Loading') : 'Not Ready',
            collisionDetector: this.collisionDetector ? 'Ready' : 'Not Ready',
            fingerVisualizer: this.fingerVisualizer ? 'Ready' : 'Not Ready', // NEW: Debug info
            gameState: this.gameState,
            totalFingertips: this.handDetector ? this.handDetector.getAllFingertips().length : 0
        };
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new AugmentedFoodNinja();
    game.initialize();
    
    // Make game globally accessible for debugging
    window.foodNinjaGame = game;
    
    // Add keyboard shortcuts for debugging
    window.addEventListener('keydown', (event) => {
        switch(event.key) {
            case 'b':
                // Toggle bounding boxes
                game.toggleBoundingBoxes();
                break;
            case 'r':
                // Reset game
                game.resetGame();
                break;
            case 'f': // NEW: Toggle finger visualization
                game.toggleFingerVisualization();
                break;
            case '1':
                // Very low collision sensitivity (precise index finger)
                game.adjustCollisionSensitivity(0.1);
                break;
            case '2':
                // Normal collision sensitivity (default)
                game.adjustCollisionSensitivity(0.3);
                break;
            case '3':
                // High collision sensitivity (easier slicing)
                game.adjustCollisionSensitivity(0.6);
                break;
        }
    });
});