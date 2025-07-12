import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'cannon';

// Import modules
import { CameraManager } from './modules/camera-manager.js';
import { SceneManager } from './modules/scene-manager.js';
import { FruitSpawner } from './modules/fruit-spawner.js';
import { GameLogic } from './modules/game-logic.js';

class AugmentedFruitNinja {
    constructor() {
        this.isInitialized = false;
        this.lastTime = 0;
        this.gameState = 'loading'; // loading, playing, paused
        
        // Core components
        this.cameraManager = null;
        this.sceneManager = null;
        this.fruitSpawner = null;
        this.gameLogic = null;
        
        // DOM elements
        this.videoElement = document.getElementById('videoElement');
        this.canvas = document.getElementById('gameCanvas');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.scoreElement = document.getElementById('scoreValue');
        this.fruitCountElement = document.getElementById('fruitCount');
        this.debugElement = document.getElementById('debugInfo');
    }
    
    async initialize() {
        try {
            console.log('Initializing Augmented Fruit Ninja...');
            
            // Initialize camera manager
            this.cameraManager = new CameraManager(this.videoElement);
            await this.cameraManager.initialize();
            
            // Initialize scene manager
            this.sceneManager = new SceneManager(this.canvas, this.videoElement);
            await this.sceneManager.initialize();
            
            // Initialize fruit spawner
            this.fruitSpawner = new FruitSpawner(this.sceneManager);
            await this.fruitSpawner.initialize();
            
            // Initialize game logic
            this.gameLogic = new GameLogic();
            
            // Hide loading screen
            this.loadingScreen.style.display = 'none';
            
            console.log('Initialization complete!');
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
        
        // Update fruit spawner
        this.fruitSpawner.update(deltaTime);
        
        // Update game logic
        this.gameLogic.update(deltaTime);
        
        // Update UI
        this.updateUI();
    }
    
    render() {
        this.sceneManager.render();
    }
    
    updateUI() {
        this.scoreElement.textContent = this.gameLogic.score;
        this.fruitCountElement.textContent = this.fruitSpawner.getActiveFruitCount();
        
        // Debug info
        if (this.sceneManager) {
            const fps = Math.round(1000 / (performance.now() - this.lastTime + 1));
            this.debugElement.innerHTML = `FPS: ${fps}`;
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new AugmentedFruitNinja();
    game.initialize();
});