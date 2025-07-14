import * as THREE from 'three';

/**
 * Simple FingerVisualizer - Yellow dot that follows index finger
 * Shows visual feedback and creates particles when slicing fruits
 */
export class FingerVisualizer {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.getScene();
        
        // Single yellow sphere for index finger
        this.fingerSphere = null;
        this.isVisible = false;
        
        // Sphere configuration
        this.sphereRadius = 0.15;
        this.sphereColor = 0xffff00; // Yellow
        
        // Animation state
        this.animationTime = 0;
        
        // Create sphere geometry and material
        this.sphereGeometry = new THREE.SphereGeometry(this.sphereRadius, 16, 12);
        this.sphereMaterial = new THREE.MeshBasicMaterial({
            color: this.sphereColor,
            transparent: true,
            opacity: 0.8
        });
        
        this.isEnabled = true;
    }
    
    /**
     * Update finger visualization
     */
    update(deltaTime, fingertips) {
        if (!this.isEnabled) return;
        
        this.animationTime += deltaTime;
        
        // Find index finger
        const indexFinger = fingertips.find(ft => ft.type === 'index');
        
        if (indexFinger) {
            // Show sphere if hidden
            if (!this.isVisible) {
                this.showSphere();
            }
            
            // Update sphere position
            this.updateSpherePosition(indexFinger.position, deltaTime);
            
            // Add pulsing animation
            this.updatePulseAnimation();
            
        } else {
            // Hide sphere if no index finger detected
            if (this.isVisible) {
                this.hideSphere();
            }
        }
    }
    
    /**
     * Show the yellow sphere
     */
    showSphere() {
        if (!this.fingerSphere) {
            this.fingerSphere = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
            this.scene.add(this.fingerSphere);
        }
        this.isVisible = true;
        
        // Start with small scale and animate in
        this.fingerSphere.scale.setScalar(0.1);
    }
    
    /**
     * Hide the yellow sphere
     */
    hideSphere() {
        if (this.fingerSphere && this.isVisible) {
            // Animate out
            this.animateOut();
        }
        this.isVisible = false;
    }
    
    /**
     * Update sphere position with smooth following
     */
    updateSpherePosition(targetPosition, deltaTime) {
        if (!this.fingerSphere) return;
        
        // Smooth movement towards finger position
        this.fingerSphere.position.lerp(targetPosition, deltaTime * 12);
        
        // Animate scale to full size
        const targetScale = 1.0;
        const currentScale = this.fingerSphere.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, deltaTime * 8);
        this.fingerSphere.scale.setScalar(newScale);
    }
    
    /**
     * Add pulsing animation to the sphere
     */
    updatePulseAnimation() {
        if (!this.fingerSphere) return;
        
        // Gentle pulsing effect
        const pulseAmount = Math.sin(this.animationTime * 4) * 0.1 + 1.0;
        const baseScale = 1.0;
        this.fingerSphere.scale.setScalar(baseScale * pulseAmount);
        
        // Slight opacity pulsing
        const opacityPulse = Math.sin(this.animationTime * 3) * 0.2 + 0.8;
        this.sphereMaterial.opacity = Math.max(0.6, opacityPulse);
    }
    
    /**
     * Animate sphere out when finger disappears
     */
    animateOut() {
        if (!this.fingerSphere) return;
        
        const animateScale = () => {
            if (!this.fingerSphere) return;
            
            this.fingerSphere.scale.multiplyScalar(0.9);
            this.sphereMaterial.opacity *= 0.9;
            
            if (this.fingerSphere.scale.x < 0.05) {
                this.scene.remove(this.fingerSphere);
                this.fingerSphere = null;
            } else {
                requestAnimationFrame(animateScale);
            }
        };
        
        animateScale();
    }
    
    /**
     * Create particle effect when slicing a fruit
     */
    createSliceEffect(position, foodType) {
        if (!this.isEnabled) return;
        
        // Create particle burst effect
        const particleCount = 8;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 6, 4),
                new THREE.MeshBasicMaterial({
                    color: 0xffff00, // Yellow particles
                    transparent: true,
                    opacity: 1.0
                })
            );
            
            // Random direction for particle
            const direction = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random(),
                (Math.random() - 0.5) * 2
            ).normalize();
            
            particle.position.copy(position);
            particle.userData = {
                velocity: direction.multiplyScalar(2 + Math.random() * 3),
                life: 1.0,
                maxLife: 1.0
            };
            
            particles.push(particle);
            this.scene.add(particle);
        }
        
        // Animate particles
        const animateParticles = () => {
            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];
                const userData = particle.userData;
                
                // Update position
                particle.position.add(userData.velocity.clone().multiplyScalar(0.016));
                
                // Apply gravity
                userData.velocity.y -= 0.1;
                
                // Update life
                userData.life -= 0.016;
                
                // Update appearance
                const lifeRatio = userData.life / userData.maxLife;
                particle.material.opacity = lifeRatio;
                particle.scale.setScalar(lifeRatio);
                
                // Remove when dead
                if (userData.life <= 0) {
                    this.scene.remove(particle);
                    particle.material.dispose();
                    particle.geometry.dispose();
                    particles.splice(i, 1);
                }
            }
            
            if (particles.length > 0) {
                requestAnimationFrame(animateParticles);
            }
        };
        
        animateParticles();
    }
    
    /**
     * Toggle finger visualization on/off
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled && this.fingerSphere) {
            this.hideSphere();
        }
    }
    
    /**
     * Get debug information
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
     * Cleanup
     */
    dispose() {
        if (this.fingerSphere) {
            this.scene.remove(this.fingerSphere);
            this.fingerSphere = null;
        }
        
        this.sphereGeometry.dispose();
        this.sphereMaterial.dispose();
    }
}