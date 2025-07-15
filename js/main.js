import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

// Import all game modules - modular architecture for maintainability
import { CameraManager } from './modules/camera-manager.js';
import { SceneManager } from './modules/scene-manager.js';
import { FoodSpawner } from './modules/food-spawner.js';
import { GameLogic } from './modules/game-logic.js';
import { HandDetector } from './modules/hand-detector.js';
import { CollisionDetector } from './modules/collision-detector.js';
import { FingerVisualizer } from './modules/finger-visualizer.js';

/**
 * Main application class for Augmented Fruit Ninja
 * 
 * This class orchestrates all game systems and manages the overall application lifecycle.
 * It follows a component-based architecture where each major functionality is handled
 * by a specialized manager class.
 * 
 * Key responsibilities:
 * - Initialize all game systems in correct order
 * - Coordinate the main game loop
 * - Handle application state transitions
 * - Provide unified interface for debugging and control
 */
class AugmentedFoodNinja {
    constructor() {
        // Application state management
        this.isInitialized = false;
        this.lastTime = 0; // Used for delta time calculations in game loop
        this.gameState = 'loading'; // Possible states: loading, playing, paused
        
        // Core game systems - each handles a specific aspect of the game
        this.cameraManager = null;        // Manages WebRTC camera access and video stream
        this.sceneManager = null;         // Handles Three.js scene setup and rendering
        this.foodSpawner = null;          // Spawns and manages falling food objects
        this.gameLogic = null;            // Handles scoring, levels, and game rules
        this.handDetector = null;         // MediaPipe-based hand tracking system
        this.collisionDetector = null;    // Detects when hands collide with food objects
        this.fingerVisualizer = null;     // Visual feedback for finger tracking
        
        // DOM element references - cached for performance
        this.videoElement = document.getElementById('videoElement');
        this.canvas = document.getElementById('gameCanvas');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.scoreElement = document.getElementById('scoreValue');
        this.debugElement = document.getElementById('debugInfo');
        
        // Hand tracking UI elements for real-time feedback
        this.handCountElement = document.getElementById('handCount');
        this.collisionStatusElement = document.getElementById('collisionStatus');
    }
    
    /**
     * Initialize all game systems in the correct order
     * 
     * The initialization order is critical:
     * 1. Camera first (required for video texture)
     * 2. Scene setup (requires video dimensions)
     * 3. Food models loading (asynchronous)
     * 4. Hand tracking (requires video stream)
     * 5. Collision and game systems (require all previous components)
     * 
     * Each step is awaited to ensure proper initialization before proceeding.
     */
    async initialize() {
        try {
            this.updateLoadingStatus('Initializing camera...');
            
            // Initialize camera manager - must be first as other systems depend on video stream
            this.cameraManager = new CameraManager(this.videoElement);
            await this.cameraManager.initialize();
            
            this.updateLoadingStatus('Setting up 3D scene...');
            
            // Initialize scene manager - creates Three.js scene, camera, renderer, and physics world
            this.sceneManager = new SceneManager(this.canvas, this.videoElement);
            await this.sceneManager.initialize();
            
            this.updateLoadingStatus('Loading food models...');
            
            // Initialize food spawner - loads 3D models and sets up spawning system
            this.foodSpawner = new FoodSpawner(this.sceneManager);
            await this.foodSpawner.initialize();
            
            this.updateLoadingStatus('Initializing hand tracking...');
            
            // Initialize hand detector - sets up MediaPipe for real-time hand tracking
            this.handDetector = new HandDetector(this.videoElement, this.sceneManager.getCamera());
            await this.handDetector.initialize();
            
            this.updateLoadingStatus('Setting up finger visualization...');
            
            // Initialize finger visualizer - provides visual feedback for hand tracking
            this.fingerVisualizer = new FingerVisualizer(this.sceneManager);
            
            this.updateLoadingStatus('Setting up collision detection...');
            
            // Initialize game logic - handles scoring, combos, and level progression
            this.gameLogic = new GameLogic();
            
            // Initialize collision detector - connects hand tracking with game mechanics
            // Passes fingerVisualizer for particle effects when slicing occurs
            this.collisionDetector = new CollisionDetector(
                this.handDetector, 
                this.foodSpawner, 
                this.gameLogic,
                this.fingerVisualizer
            );
            
            this.updateLoadingStatus('Ready to play!');
            
            // Hide loading screen with a brief delay for smooth transition
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
            
            // Mark initialization complete and start the game
            this.isInitialized = true;
            this.gameState = 'playing';
            
            // Start the main game loop
            this.startGameLoop();
            
        } catch (error) {
            // Handle initialization failures gracefully
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
    
    /**
     * Update the loading screen with current initialization status
     * 
     * @param {string} message - Status message to display to user
     */
    updateLoadingStatus(message) {
        this.loadingScreen.innerHTML = message;
    }
    
    /**
     * Start the main game loop using requestAnimationFrame
     * 
     * This creates a smooth 60fps game loop that:
     * - Calculates delta time for frame-rate independent updates
     * - Updates all game systems
     * - Renders the current frame
     * - Schedules the next frame
     * 
     * The loop only runs when the game is properly initialized and in playing state.
     */
    startGameLoop() {
        const gameLoop = (currentTime) => {
            // Skip update if not ready or paused
            if (!this.isInitialized || this.gameState !== 'playing') {
                requestAnimationFrame(gameLoop);
                return;
            }
            
            // Calculate delta time in seconds for consistent game speed
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            // Update all game systems with delta time
            this.update(deltaTime);
            
            // Render the current frame
            this.render();
            
            // Schedule next frame
            requestAnimationFrame(gameLoop);
        };
        
        // Start the loop
        requestAnimationFrame(gameLoop);
    }
    
    /**
     * Update all game systems for the current frame
     * 
     * Update order is important:
     * 1. Scene manager (physics simulation)
     * 2. Food spawner (object management)
     * 3. Hand detector (input processing)
     * 4. Finger visualizer (visual feedback)
     * 5. Collision detector (game mechanics)
     * 6. Game logic (scoring and state)
     * 7. UI updates (display current state)
     * 
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    update(deltaTime) {
        // Update scene manager - advances physics simulation and syncs objects
        this.sceneManager.update(deltaTime);
        
        // Update food spawner - spawns new food and updates existing food physics
        this.foodSpawner.update(deltaTime);
        
        // Update hand detection - processes current video frame for hand landmarks
        this.handDetector.update();
        
        // Update finger visualization with current fingertip positions
        if (this.fingerVisualizer) {
            const fingertips = this.handDetector.getAllFingertips();
            this.fingerVisualizer.update(deltaTime, fingertips);
        }
        
        // Update collision detection - checks for finger-food intersections
        this.collisionDetector.update();
        
        // Update game logic - handles timers, level progression, combo timeouts
        this.gameLogic.update(deltaTime);
        
        // Update user interface with current game state
        this.updateUI();
    }
    
    /**
     * Render the current frame
     * 
     * Delegates to scene manager which handles Three.js rendering pipeline.
     */
    render() {
        this.sceneManager.render();
    }
    
    /**
     * Update user interface elements with current game state
     * 
     * Updates:
     * - Score display
     * - Hand tracking status
     * - Debug information (FPS, level, combo, etc.)
     * - Collision status
     */
    updateUI() {
        // Update basic score display
        this.scoreElement.textContent = this.gameLogic.getScore();
        
        // Update hand tracking status indicators
        this.handCountElement.textContent = this.handDetector.getHandCount();
        this.collisionStatusElement.textContent = this.collisionDetector.getCollisionStatus();
        
        // Update comprehensive debug information
        if (this.sceneManager) {
            // Calculate approximate FPS from delta time
            const fps = Math.round(1000 / (performance.now() - this.lastTime + 1));
            const stats = this.gameLogic.getStatsByCategory();
            const handDebug = this.handDetector.getDebugInfo();
            
            // Display compact debug info in single line
            this.debugElement.innerHTML = `
                FPS: ${fps} | 
                Level: ${stats.currentLevel} | 
                Combo: ${stats.currentCombo > 1 ? 'x' + stats.currentCombo : 'None'} |
                Sliced: ${stats.totalSliced} |
                Confidence: ${handDebug.averageConfidence}
            `;
        }
    }
    
    /**
     * Get comprehensive current game state
     * 
     * Combines data from all game systems for debugging, analytics, or save/load functionality.
     * 
     * @returns {Object} Complete game state including scores, tracking, and collision data
     */
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
    
    /**
     * Reset game to initial state
     * 
     * Clears all active food objects, resets scores and timers,
     * and prepares for a fresh game session.
     */
    resetGame() {
        // Remove all active food objects from scene
        const foods = this.foodSpawner.getFoods();
        foods.forEach(food => {
            this.sceneManager.getScene().remove(food.mesh);
        });
        foods.length = 0; // Clear the array
        
        // Reset game logic to initial state
        this.gameLogic.reset();
        
        // Reset collision detection state
        this.collisionDetector.slicedFoods.clear();
        this.collisionDetector.totalCollisions = 0;
    }
    
    /**
     * Toggle finger visualization on/off
     * 
     * Allows users to disable visual finger tracking if desired.
     */
    toggleFingerVisualization() {
        if (this.fingerVisualizer) {
            this.fingerVisualizer.setEnabled(!this.fingerVisualizer.isEnabled);
        }
    }
    
    /**
     * Get detailed debug information about all game systems
     * 
     * @returns {Object} Comprehensive system status for debugging
     */
    getDebugInfo() {
        return {
            camera: this.cameraManager ? 'Ready' : 'Not Ready',
            scene: this.sceneManager ? 'Ready' : 'Not Ready',
            foodSpawner: this.foodSpawner ? 'Ready' : 'Not Ready',
            handDetector: this.handDetector ? (this.handDetector.isReady ? 'Ready' : 'Loading') : 'Not Ready',
            collisionDetector: this.collisionDetector ? 'Ready' : 'Not Ready',
            fingerVisualizer: this.fingerVisualizer ? 'Ready' : 'Not Ready',
            gameState: this.gameState,
            totalFingertips: this.handDetector ? this.handDetector.getAllFingertips().length : 0
        };
    }
}

/**
 * Application Entry Point
 * 
 * Initialize the game when the page finishes loading.
 * Also sets up global debugging interface and keyboard shortcuts.
 */
window.addEventListener('load', () => {
    // Create and initialize the main game instance
    const game = new AugmentedFoodNinja();
    game.initialize();
    
    // Make game globally accessible for debugging in browser console
    window.foodNinjaGame = game;
    
    /**
     * Keyboard shortcuts for game control
     * 
     * These shortcuts allow users to:
     * - Reset the game state
     * - Toggle finger visualization
     */
    window.addEventListener('keydown', (event) => {
        switch(event.key) {
            case 'r':
            case 'R':
                // Reset game to initial state
                game.resetGame();
                break;
            case 'f':
            case 'F':
                // Toggle finger visualization on/off
                game.toggleFingerVisualization();
                break;
        }
    });
});