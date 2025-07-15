import * as THREE from 'three';

/**
 * Finger Visualizer Class
 * 
 * Provides real-time visual feedback for hand tracking by displaying dynamic
 * indicators that follow the user's index fingers. This class enhances user experience
 * by making hand tracking visible and responsive, helping users understand where
 * the system detects their fingers and when slicing actions are possible.
 * 
 * Key responsibilities:
 * - Display animated spheres that follow up to 2 index fingers (one per hand)
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
        
        /**
         * Multi-sphere tracking system
         * 
         * Uses Map to track individual spheres for each detected index finger.
         * Key: fingertip ID (unique identifier from hand detector)
         * Value: sphere data object with mesh and animation state
         */
        this.fingerSpheres = new Map();     // Map of fingertip ID to sphere data
        this.maxSpheres = 2;                // Maximum number of spheres (2 hands max)
        
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
     * Processes current fingertip data to update visual indicator positions,
     * visibility, and animation states. Handles smooth transitions when
     * fingers appear/disappear from tracking and manages multiple spheres.
     * 
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     * @param {Array} fingertips - Array of detected fingertips with position data
     */
    update(deltaTime, fingertips) {
        if (!this.isEnabled) return;
        
        // Accumulate animation time for continuous effects
        this.animationTime += deltaTime;
        
        /**
         * Filter for index fingers only
         * 
         * The system specifically tracks index fingers for precision slicing,
         * so we only visualize index finger positions for clarity.
         */
        const indexFingers = fingertips.filter(ft => ft.type === 'index');
        
        // Get currently active fingertip IDs for tracking
        const activeFingertipIds = new Set(indexFingers.map(ft => ft.id));
        
        /**
         * Update existing spheres and create new ones
         * 
         * Process each detected index finger and ensure it has a corresponding
         * visual sphere. Limit to maximum number of spheres for performance.
         */
        for (const fingertip of indexFingers) {
            // Respect maximum sphere limit
            if (!this.fingerSpheres.has(fingertip.id) && this.fingerSpheres.size >= this.maxSpheres) {
                continue;
            }
            
            if (!this.fingerSpheres.has(fingertip.id)) {
                // Create new sphere for this fingertip
                this.createSphere(fingertip.id);
            }
            
            // Update sphere position and animation
            this.updateSphere(fingertip.id, fingertip.position, deltaTime);
        }
        
        /**
         * Remove spheres for fingertips no longer detected
         * 
         * Clean up spheres for fingers that are no longer being tracked
         * to prevent visual artifacts and memory leaks.
         */
        for (const [fingertipId] of this.fingerSpheres) {
            if (!activeFingertipIds.has(fingertipId)) {
                this.removeSphere(fingertipId);
            }
        }
        
        // Apply continuous pulsing animation to all active spheres
        this.updateAllSphereAnimations();
    }
    
    /**
     * Create a new sphere for a detected fingertip
     * 
     * Creates visual sphere with smooth entrance animation and stores
     * it in the tracking map with associated animation state.
     * 
     * @param {string} fingertipId - Unique identifier for the fingertip
     */
    createSphere(fingertipId) {
        /**
         * Create new sphere mesh instance
         * 
         * Uses shared geometry but cloned material for independent
         * opacity and color control per sphere.
         */
        const sphereMesh = new THREE.Mesh(
            this.sphereGeometry, 
            this.sphereMaterial.clone()
        );
        
        /**
         * Initialize sphere data object
         * 
         * Stores mesh reference and animation state for this specific
         * fingertip. Scale starts small for smooth entrance animation.
         */
        const sphereData = {
            mesh: sphereMesh,
            isVisible: true,
            animationPhase: 0,              // Individual animation phase offset
            creationTime: this.animationTime
        };
        
        // Start with small scale for smooth entrance animation
        sphereMesh.scale.setScalar(0.1);
        
        // Add to scene and tracking
        this.scene.add(sphereMesh);
        this.fingerSpheres.set(fingertipId, sphereData);
        
        console.log(`Created sphere for fingertip: ${fingertipId}`);
    }
    
    /**
     * Update individual sphere position and scale animation
     * 
     * Handles smooth position following and entrance/exit animations
     * for a specific sphere. Each sphere animates independently.
     * 
     * @param {string} fingertipId - Unique identifier for the fingertip
     * @param {THREE.Vector3} targetPosition - Target world position to follow
     * @param {number} deltaTime - Time elapsed since last frame for smooth interpolation
     */
    updateSphere(fingertipId, targetPosition, deltaTime) {
        const sphereData = this.fingerSpheres.get(fingertipId);
        if (!sphereData || !sphereData.mesh) return;
        
        const sphere = sphereData.mesh;
        
        /**
         * Smooth position interpolation
         * 
         * Linear interpolation (lerp) provides smooth following behavior
         * that feels natural and responsive. The interpolation factor (12)
         * is tuned for good responsiveness without overshooting.
         */
        sphere.position.lerp(targetPosition, deltaTime * 12);
        
        /**
         * Smooth scale animation to full size
         * 
         * When sphere first appears, it scales from small to normal size
         * for smooth visual transition. Scale factor (8) provides quick
         * but smooth scaling animation.
         */
        const targetScale = 1.0;
        const currentScale = sphere.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, deltaTime * 8);
        sphere.scale.setScalar(newScale);
    }
    
    /**
     * Apply continuous pulsing animation to all active spheres
     * 
     * Creates engaging visual feedback through subtle pulsing effects
     * that help users understand the spheres are active tracking indicators.
     * Each sphere has slight phase offset for visual variety.
     */
    updateAllSphereAnimations() {
        for (const [fingertipId, sphereData] of this.fingerSpheres) {
            if (!sphereData.mesh) continue;
            
            /**
             * Individual animation phase for visual variety
             * 
             * Each sphere gets a slight phase offset based on creation time
             * to prevent all spheres from pulsing in perfect synchronization.
             */
            const phaseOffset = sphereData.creationTime * 0.5;
            const animationPhase = this.animationTime + phaseOffset;
            
            /**
             * Scale-based pulsing effect
             * 
             * Sine wave animation creates natural pulsing rhythm.
             * Frequency (4) and amplitude (0.1) are tuned for subtle effect
             * that enhances visual appeal without being distracting.
             */
            const pulseAmount = Math.sin(animationPhase * 4) * 0.1 + 1.0;
            const baseScale = 1.0;
            sphereData.mesh.scale.setScalar(baseScale * pulseAmount);
            
            /**
             * Opacity-based pulsing effect
             * 
             * Subtle opacity variation (different frequency from scale)
             * adds visual depth and helps indicate active tracking state.
             * Minimum opacity ensures sphere remains visible.
             */
            const opacityPulse = Math.sin(animationPhase * 3) * 0.2 + 0.8;
            sphereData.mesh.material.opacity = Math.max(0.6, opacityPulse);
        }
    }
    
    /**
     * Remove sphere for fingertip no longer being tracked
     * 
     * Provides smooth visual feedback when finger disappears from tracking
     * by gradually scaling down and fading out the sphere before removal.
     * 
     * @param {string} fingertipId - Unique identifier for the fingertip to remove
     */
    removeSphere(fingertipId) {
        const sphereData = this.fingerSpheres.get(fingertipId);
        if (!sphereData || !sphereData.mesh) return;
        
        console.log(`Removing sphere for fingertip: ${fingertipId}`);
        
        // Start exit animation
        this.animateSphereOut(sphereData.mesh, () => {
            // Cleanup callback after animation completes
            this.fingerSpheres.delete(fingertipId);
        });
    }
    
    /**
     * Animate sphere exit when finger tracking is lost
     * 
     * Provides smooth visual feedback when finger disappears from tracking
     * by gradually scaling down and fading out the sphere before removal.
     * Uses recursive animation for smooth 60fps effect.
     * 
     * @param {THREE.Mesh} sphereMesh - The sphere mesh to animate out
     * @param {Function} onComplete - Callback function when animation completes
     */
    animateSphereOut(sphereMesh, onComplete) {
        if (!sphereMesh) return;
        
        /**
         * Recursive scale-down animation
         * 
         * Each frame reduces scale and opacity by 10% for smooth
         * disappearance effect. Animation continues until sphere
         * is too small to be meaningful, then removes from scene.
         */
        const animateScale = () => {
            if (!sphereMesh || !sphereMesh.parent) {
                onComplete();
                return;
            }
            
            // Reduce scale and opacity each frame
            sphereMesh.scale.multiplyScalar(0.9);
            sphereMesh.material.opacity *= 0.9;
            
            // Remove when sufficiently small
            if (sphereMesh.scale.x < 0.05) {
                this.scene.remove(sphereMesh);
                sphereMesh.material.dispose();
                onComplete();
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
     * or performance optimization. When disabled, hides all current
     * spheres and prevents future visualization.
     * 
     * @param {boolean} enabled - Whether to enable finger visualization
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        // Hide all spheres immediately if disabling
        if (!enabled) {
            for (const [fingertipId] of this.fingerSpheres) {
                this.removeSphere(fingertipId);
            }
        }
    }
    
    /**
     * Get number of currently active finger spheres
     * 
     * @returns {number} Count of active finger visualization spheres
     */
    getActiveSphereCount() {
        return this.fingerSpheres.size;
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
        const sphereInfo = {};
        for (const [fingertipId, sphereData] of this.fingerSpheres) {
            sphereInfo[fingertipId] = {
                visible: sphereData.isVisible,
                scale: sphereData.mesh ? sphereData.mesh.scale.x.toFixed(2) : 'N/A'
            };
        }
        
        return {
            isEnabled: this.isEnabled,
            activeSpheres: this.fingerSpheres.size,
            maxSpheres: this.maxSpheres,
            sphereRadius: this.sphereRadius,
            animationTime: this.animationTime.toFixed(2),
            sphereDetails: sphereInfo
        };
    }
    
    /**
     * Clean up resources and remove all spheres from scene
     * 
     * Properly disposes of all Three.js resources to prevent memory leaks.
     * Should be called when the visualizer is no longer needed.
     */
    dispose() {
        // Remove all spheres from scene
        for (const [fingertipId] of this.fingerSpheres) {
            this.removeSphere(fingertipId);
        }
        
        // Clear tracking map
        this.fingerSpheres.clear();
        
        // Dispose of shared geometry and material
        this.sphereGeometry.dispose();
        this.sphereMaterial.dispose();
    }
}