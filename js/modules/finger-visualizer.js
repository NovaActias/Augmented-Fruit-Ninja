import * as THREE from 'three';

/**
 * Finger Visualizer Class
 * 
 * Provides real-time visual feedback for hand tracking by displaying a dynamic
 * indicator that follows the user's index finger. This class enhances user experience
 * by making hand tracking visible and responsive, helping users understand where
 * the system detects their finger and when slicing actions are possible.
 * 
 * Key responsibilities:
 * - Display animated sphere that follows index finger position
 * - Provide smooth position interpolation for natural movement
 * - Create pulsing animation effects for engaging visual feedback
 * - Generate particle effects when successful slices occur
 * - Handle graceful appearance/disappearance of finger tracking
 * - Manage performance through efficient geometry reuse
 * - Support enabling/disabling for user preference customization
 */
export class FingerVisualizer {
    /**
     * Constructor for FingerVisualizer
     * 
     * @param {SceneManager} sceneManager - Scene manager for adding/removing visual elements
     */
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.getScene();
        
        // Visual indicator state
        this.fingerSphere = null;           // Three.js mesh for finger indicator
        this.isVisible = false;             // Current visibility state
        
        /**
         * Sphere visual configuration
         * 
         * Yellow color provides good contrast against most backgrounds
         * while being associated with interactive/active elements.
         * Size is optimized for visibility without being obtrusive.
         */
        this.sphereRadius = 0.15;           // Physical size in world units
        this.sphereColor = 0xffff00;        // Bright yellow for visibility
        
        // Animation control
        this.animationTime = 0;             // Accumulated time for animation cycles
        
        /**
         * Shared geometry and material for performance
         * 
         * Reusing geometry and material reduces memory usage and
         * improves rendering performance. The sphere geometry is
         * optimized with moderate detail for smooth appearance.
         */
        this.sphereGeometry = new THREE.SphereGeometry(this.sphereRadius, 16, 12);
        this.sphereMaterial = new THREE.MeshBasicMaterial({
            color: this.sphereColor,
            transparent: true,              // Enable opacity animations
            opacity: 0.8                   // Semi-transparent for natural look
        });
        
        this.isEnabled = true;              // Global enable/disable flag
    }
    
    /**
     * Update finger visualization for current frame
     * 
     * Processes current fingertip data to update visual indicator position,
     * visibility, and animation state. Handles smooth transitions when
     * fingers appear/disappear from tracking.
     * 
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     * @param {Array} fingertips - Array of detected fingertips with position data
     */
    update(deltaTime, fingertips) {
        if (!this.isEnabled) return;
        
        // Accumulate animation time for continuous effects
        this.animationTime += deltaTime;
        
        /**
         * Find index finger for visualization
         * 
         * The system specifically tracks index finger for precision slicing,
         * so we only visualize the index finger position for clarity.
         */
        const indexFinger = fingertips.find(ft => ft.type === 'index');
        
        if (indexFinger) {
            // Show indicator if finger is detected
            if (!this.isVisible) {
                this.showSphere();
            }
            
            // Update sphere position with smooth following
            this.updateSpherePosition(indexFinger.position, deltaTime);
            
            // Apply continuous pulsing animation
            this.updatePulseAnimation();
            
        } else {
            // Hide indicator if no index finger detected
            if (this.isVisible) {
                this.hideSphere();
            }
        }
    }
    
    /**
     * Show the finger tracking sphere with smooth entrance animation
     * 
     * Creates the visual sphere if needed and starts it with a small scale
     * that will animate to full size. This provides smooth visual feedback
     * when finger tracking begins.
     */
    showSphere() {
        if (!this.fingerSphere) {
            /**
             * Create new sphere mesh instance
             * 
             * Uses shared geometry and material for performance while
             * creating independent mesh for position and scale control.
             */
            this.fingerSphere = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
            this.scene.add(this.fingerSphere);
        }
        this.isVisible = true;
        
        // Start with small scale for smooth entrance animation
        this.fingerSphere.scale.setScalar(0.1);
    }
    
    /**
     * Hide the finger tracking sphere with smooth exit animation
     * 
     * Initiates animated removal of the sphere when finger tracking is lost.
     * The sphere scales down smoothly rather than disappearing instantly.
     */
    hideSphere() {
        if (this.fingerSphere && this.isVisible) {
            // Start smooth exit animation
            this.animateOut();
        }
        this.isVisible = false;
    }
    
    /**
     * Update sphere position with smooth interpolated following
     * 
     * Implements smooth position tracking that follows finger movement
     * without jitter or abrupt changes. The sphere gradually moves toward
     * the target position and scales up to full size when first shown.
     * 
     * @param {THREE.Vector3} targetPosition - Target world position to follow
     * @param {number} deltaTime - Time elapsed since last frame for smooth interpolation
     */
    updateSpherePosition(targetPosition, deltaTime) {
        if (!this.fingerSphere) return;
        
        /**
         * Smooth position interpolation
         * 
         * Linear interpolation (lerp) provides smooth following behavior
         * that feels natural and responsive. The interpolation factor (12)
         * is tuned for good responsiveness without overshooting.
         */
        this.fingerSphere.position.lerp(targetPosition, deltaTime * 12);
        
        /**
         * Smooth scale animation to full size
         * 
         * When sphere first appears, it scales from small to normal size
         * for smooth visual transition. Scale factor (8) provides quick
         * but smooth scaling animation.
         */
        const targetScale = 1.0;
        const currentScale = this.fingerSphere.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, deltaTime * 8);
        this.fingerSphere.scale.setScalar(newScale);
    }
    
    /**
     * Apply continuous pulsing animation to the sphere
     * 
     * Creates engaging visual feedback through subtle pulsing effects
     * that help users understand the sphere is an active tracking indicator.
     * The animation is designed to be noticeable but not distracting.
     */
    updatePulseAnimation() {
        if (!this.fingerSphere) return;
        
        /**
         * Scale-based pulsing effect
         * 
         * Sine wave animation creates natural pulsing rhythm.
         * Frequency (4) and amplitude (0.1) are tuned for subtle effect
         * that enhances visual appeal without being distracting.
         */
        const pulseAmount = Math.sin(this.animationTime * 4) * 0.1 + 1.0;
        const baseScale = 1.0;
        this.fingerSphere.scale.setScalar(baseScale * pulseAmount);
        
        /**
         * Opacity-based pulsing effect
         * 
         * Subtle opacity variation (different frequency from scale)
         * adds visual depth and helps indicate active tracking state.
         * Minimum opacity ensures sphere remains visible.
         */
        const opacityPulse = Math.sin(this.animationTime * 3) * 0.2 + 0.8;
        this.sphereMaterial.opacity = Math.max(0.6, opacityPulse);
    }
    
    /**
     * Animate sphere exit when finger tracking is lost
     * 
     * Provides smooth visual feedback when finger disappears from tracking
     * by gradually scaling down and fading out the sphere before removal.
     * Uses recursive animation for smooth 60fps effect.
     */
    animateOut() {
        if (!this.fingerSphere) return;
        
        /**
         * Recursive scale-down animation
         * 
         * Each frame reduces scale and opacity by 10% for smooth
         * disappearance effect. Animation continues until sphere
         * is too small to be meaningful, then removes from scene.
         */
        const animateScale = () => {
            if (!this.fingerSphere) return;
            
            // Reduce scale and opacity each frame
            this.fingerSphere.scale.multiplyScalar(0.9);
            this.sphereMaterial.opacity *= 0.9;
            
            // Remove when sufficiently small
            if (this.fingerSphere.scale.x < 0.05) {
                this.scene.remove(this.fingerSphere);
                this.fingerSphere = null;
            } else {
                // Continue animation next frame
                requestAnimationFrame(animateScale);
            }
        };
        
        animateScale();
    }
    
    /**
     * Create particle effect when slicing a fruit
     * 
     * Generates dynamic particle burst effect at slice location to provide
     * satisfying visual feedback for successful slicing actions. Particles
     * have physics-based movement for realistic appearance.
     * 
     * @param {THREE.Vector3} position - World position where slice occurred
     * @param {string} foodType - Type of food sliced (for future effect customization)
     */
    createSliceEffect(position, foodType) {
        if (!this.isEnabled) return;
        
        /**
         * Particle system configuration
         * 
         * Creates burst of small yellow particles that fly outward from
         * slice position. Particle count is balanced for visual impact
         * without performance overhead.
         */
        const particleCount = 8;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            /**
             * Create individual particle mesh
             * 
             * Each particle is a small sphere with its own material
             * for independent animation control. Simple geometry
             * ensures good performance even with multiple particles.
             */
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 6, 4),      // Small, low-detail sphere
                new THREE.MeshBasicMaterial({
                    color: 0xffff00,                       // Yellow to match finger indicator
                    transparent: true,
                    opacity: 1.0
                })
            );
            
            /**
             * Random particle direction and velocity
             * 
             * Each particle gets random direction for natural burst effect.
             * Upward bias and variable speed create realistic explosion pattern.
             */
            const direction = new THREE.Vector3(
                (Math.random() - 0.5) * 2,                // Random horizontal direction
                Math.random(),                             // Upward bias for natural effect
                (Math.random() - 0.5) * 2                 // Random depth direction
            ).normalize();
            
            // Set particle initial position and physics data
            particle.position.copy(position);
            particle.userData = {
                velocity: direction.multiplyScalar(2 + Math.random() * 3),    // Random speed 2-5 units/sec
                life: 1.0,                                 // Full life at start
                maxLife: 1.0                               // Reference for life ratio calculations
            };
            
            particles.push(particle);
            this.scene.add(particle);
        }
        
        /**
         * Particle animation loop
         * 
         * Recursive function that updates all particles each frame until
         * they expire. Handles physics simulation, life decay, and cleanup.
         */
        const animateParticles = () => {
            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];
                const userData = particle.userData;
                
                /**
                 * Update particle physics
                 * 
                 * Simple Euler integration for position updates with
                 * gravity acceleration for realistic falling behavior.
                 */
                particle.position.add(userData.velocity.clone().multiplyScalar(0.016));  // 60fps timestep
                userData.velocity.y -= 0.1;                // Gravity acceleration
                
                /**
                 * Update particle lifecycle
                 * 
                 * Particles gradually fade out and shrink as they age,
                 * creating natural-looking particle decay effect.
                 */
                userData.life -= 0.016;                    // Decay life over time
                
                // Update visual appearance based on remaining life
                const lifeRatio = userData.life / userData.maxLife;
                particle.material.opacity = lifeRatio;
                particle.scale.setScalar(lifeRatio);
                
                /**
                 * Clean up expired particles
                 * 
                 * Remove particles that have expired from both scene
                 * and tracking array. Also dispose of geometry and
                 * materials to prevent memory leaks.
                 */
                if (userData.life <= 0) {
                    this.scene.remove(particle);
                    particle.material.dispose();
                    particle.geometry.dispose();
                    particles.splice(i, 1);
                }
            }
            
            // Continue animation if particles remain
            if (particles.length > 0) {
                requestAnimationFrame(animateParticles);
            }
        };
        
        // Start particle animation
        animateParticles();
    }
    
    /**
     * Toggle finger visualization on/off
     * 
     * Allows runtime control of visualization for user preference
     * or performance optimization. When disabled, hides current
     * sphere and prevents future visualization.
     * 
     * @param {boolean} enabled - Whether to enable finger visualization
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        // Hide sphere immediately if disabling
        if (!enabled && this.fingerSphere) {
            this.hideSphere();
        }
    }
    
    /**
     * Get debug information about visualizer state
     * 
     * Provides system status information for debugging and monitoring.
     * Useful for troubleshooting visualization issues.
     * 
     * @returns {Object} Current visualizer state and configuration
     */
    getDebugInfo() {
        return {
            isEnabled: this.isEnabled,
            sphereVisible: this.isVisible,
            sphereRadius: this.sphereRadius,
            animationTime: this.animationTime.toFixed(2)
        };
    }
    
    /**
     * Clean up resources and remove from scene
     * 
     * Properly disposes of all Three.js resources to prevent memory leaks.
     * Should be called when the visualizer is no longer needed.
     */
    dispose() {
        // Remove sphere from scene if present
        if (this.fingerSphere) {
            this.scene.remove(this.fingerSphere);
            this.fingerSphere = null;
        }
        
        // Dispose of shared geometry and material
        this.sphereGeometry.dispose();
        this.sphereMaterial.dispose();
    }
}