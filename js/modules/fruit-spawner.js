export class FruitSpawner {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.fruits = [];
        this.spawnTimer = 0;
        this.spawnInterval = 2.0; // Spawn every 2 seconds
        this.maxFruits = 8; // Maximum fruits on screen
        
        // Fruit types and models
        this.fruitTypes = ['apple', 'orange', 'banana', 'watermelon'];
        this.fruitModels = new Map();
        this.loader = new GLTFLoader();
    }
    
    async initialize() {
        console.log('Initializing fruit spawner...');
        
        // For now, create simple geometric fruits instead of loading models
        // This is faster for development and testing
        this.createGeometricFruits();
        
        console.log('Fruit spawner ready');
    }
    
    createGeometricFruits() {
        // Create simple geometric representations of fruits
        const materials = {
            apple: new THREE.MeshLambertMaterial({ color: 0xff4444 }),
            orange: new THREE.MeshLambertMaterial({ color: 0xff8844 }),
            banana: new THREE.MeshLambertMaterial({ color: 0xffff44 }),
            watermelon: new THREE.MeshLambertMaterial({ color: 0x44ff44 })
        };
        
        this.fruitTypes.forEach(type => {
            let geometry;
            switch(type) {
                case 'apple':
                    geometry = new THREE.SphereGeometry(0.3, 16, 16);
                    break;
                case 'orange':
                    geometry = new THREE.SphereGeometry(0.25, 16, 16);
                    break;
                case 'banana':
                    geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
                    break;
                case 'watermelon':
                    geometry = new THREE.SphereGeometry(0.4, 16, 16);
                    break;
            }
            
            this.fruitModels.set(type, { geometry, material: materials[type] });
        });
    }
    
    spawnFruit() {
        if (this.fruits.length >= this.maxFruits) return;
        
        // Random fruit type
        const fruitType = this.fruitTypes[Math.floor(Math.random() * this.fruitTypes.length)];
        const fruitData = this.fruitModels.get(fruitType);
        
        // Create mesh
        const mesh = new THREE.Mesh(fruitData.geometry, fruitData.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Random spawn position (top of screen, random X)
        const spawnX = (Math.random() - 0.5) * 8; // -4 to 4
        const spawnY = 6; // Above screen
        const spawnZ = (Math.random() - 0.5) * 2; // -1 to 1
        
        mesh.position.set(spawnX, spawnY, spawnZ);
        
        // Create physics body
        let shape;
        switch(fruitType) {
            case 'banana':
                shape = new CANNON.Cylinder(0.1, 0.1, 0.6, 8);
                break;
            default:
                const radius = fruitType === 'watermelon' ? 0.4 : 
                              fruitType === 'apple' ? 0.3 : 0.25;
                shape = new CANNON.Sphere(radius);
        }
        
        const body = new CANNON.Body({ mass: 1 });
        body.addShape(shape);
        body.position.set(spawnX, spawnY, spawnZ);
        
        // Add random rotation
        body.angularVelocity.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        
        // Add to scene
        const objectIndex = this.sceneManager.addPhysicsObject(mesh, body);
        
        // Store fruit data
        this.fruits.push({
            type: fruitType,
            mesh: mesh,
            body: body,
            objectIndex: objectIndex,
            spawnTime: performance.now()
        });
        
        console.log(`Spawned ${fruitType} fruit`);
    }
    
    update(deltaTime) {
        // Update spawn timer
        this.spawnTimer += deltaTime;
        
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnFruit();
            this.spawnTimer = 0;
            
            // Slightly randomize next spawn time
            this.spawnInterval = 1.5 + Math.random() * 1.0; // 1.5-2.5 seconds
        }
        
        // Clean up fruits that are too old or fell off screen
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const fruit = this.fruits[i];
            
            // Remove if fell too far or too old
            if (fruit.body.position.y < -15 || 
                performance.now() - fruit.spawnTime > 10000) {
                this.fruits.splice(i, 1);
            }
        }
    }
    
    getActiveFruitCount() {
        return this.fruits.length;
    }
    
    getFruits() {
        return this.fruits;
    }
}
