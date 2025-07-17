# Augmented Fruit Ninja

A web-based augmented reality mini-game inspired by the classic Fruit Ninja, developed for the **Augmented Reality** university course at University of Udine.

## Project Overview

Players use **hand gestures** detected through **MediaPipe** to slice 3D food objects that fall from the sky, all captured through their webcam in real-time.

### Key Features

- **Real-time webcam integration** with WebRTC
- **MediaPipe hand tracking** for precise gesture recognition
- **3D food spawning** with realistic physics simulation using Cannon.js
- **Dual-hand support** tracking up to 2 hands simultaneously
- **Visual finger tracking** with animated spheres following index fingers
- **Advanced collision detection** with velocity-based slicing mechanics
- **Dynamic scoring system** with combo multipliers and level progression
- **Particle effects** for successful slices
- **Modular architecture** for easy extension and maintenance
- **Browser-based** - no external applications required

## Technical Architecture

### Technologies Used

- **Three.js** - 3D graphics rendering and scene management
- **Cannon.js** - Physics simulation for falling objects
- **MediaPipe** - Real-time hand detection and landmark tracking
- **WebRTC** - Real-time camera access
- **WebGL** - Hardware-accelerated graphics

### Project Structure

```
Augmented-Fruit-Ninja/
├── index.html                     # Main HTML entry point
├── css/
│   └── style.css                 # Styling (embedded in HTML)
├── js/
│   ├── main.js                   # Application entry point and coordination
│   └── modules/
│       ├── camera-manager.js     # WebRTC camera handling
│       ├── scene-manager.js      # Three.js scene and physics setup
│       ├── food-spawner.js       # Procedural food generation and management
│       ├── game-logic.js         # Scoring, combos, and progression
│       ├── hand-detector.js      # MediaPipe hand tracking integration
│       ├── finger-visualizer.js  # Visual feedback for finger tracking
│       ├── collision-detector.js # Velocity-based slicing detection
│       └── physics-engine.js     # (Reserved for future physics extensions)
├── README.md
├── LICENSE
└── .gitignore
```

## Getting Started

### Prerequisites

- **Modern web browser** (Chrome/Brave recommended)
- **Webcam access** permission
- **HTTPS or localhost** (required for camera access)
- **Local web server** for development

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/NovaActias/Augmented-Fruit-Ninja
   cd Augmented-Fruit-Ninja
   ```

2. **Start a local server**
   
   **Python:**
   ```bash
   python -m http.server 8000
   ```
   
3. **Open in browser**
   ```
   http://localhost:8000
   ```

4. **Grant camera permissions** when prompted

### Usage Instructions

1. **Setup**: Position yourself in front of your webcam with good lighting
2. **Initialization**: The game automatically loads MediaPipe models and initializes camera
3. **Hand Tracking**: Raise your hands - you'll see yellow spheres following your index fingers
4. **Play**: Use quick slicing motions with your index fingers to slice falling food objects
5. **Score**: Earn points by successfully slicing foods before they fall off-screen

## Game Mechanics

### Food Spawning System
- **7 food types** with weighted spawn probabilities:
  - **Fruits** (85% total): Apple, Red Apple, Banana, Peach
  - **Desserts** (10%): Donut
  - **Main dishes** (3%): Burger
  - **Tableware** (2%): Plate
- **Spawn timing**: Every 0.5-1.3 seconds (randomized intervals)
- **Maximum objects**: 15 concurrent food objects for performance optimization
- **Physics simulation**: Realistic falling motion with gravity and rotation

### Scoring System
- **Category-based points** multiplied by current level:
  - **Fruits**: 15 base points (20 for special apple)
  - **Main dishes**: 50 base points (60 for burger)
  - **Desserts**: 30 base points (25 for donut)
  - **Tableware**: 5 base points
- **Level progression**: Increases every 30 seconds
- **Combo system**: Consecutive slices within 2 seconds build multipliers (up to 2.0x)

### Hand Tracking & Collision Detection
- **Dual-hand support**: Tracks up to 2 hands simultaneously
- **Index finger precision**: Uses MediaPipe landmark 8 for accurate detection
- **Velocity-based slicing**: Distinguishes between hovering and slicing motions
- **3D collision detection**: Precise fingertip-to-object intersection testing
- **Visual feedback**: Yellow spheres follow tracked fingertips with pulsing animations

### Controls & Debugging
- **Keyboard shortcuts**:
  - `R` - Reset game
  - `F` - Toggle finger visualization
- **Real-time debug info**: FPS, hand count, collision status, game statistics

## Core Modules

### CameraManager (`camera-manager.js`)
Handles webcam initialization and video stream management with fallback support.

### SceneManager (`scene-manager.js`)
Manages Three.js scene, physics world, lighting, and rendering pipeline with video background.

### FoodSpawner (`food-spawner.js`)
Implements weighted random spawning system with 3D model loading and physics integration.

### GameLogic (`game-logic.js`)
Handles scoring calculations, combo system, level progression, and game state management.

### HandDetector (`hand-detector.js`)
MediaPipe integration for real-time hand landmark detection with velocity tracking and coordinate transformation.

### FingerVisualizer (`finger-visualizer.js`)
Provides visual feedback through animated spheres and particle effects for successful slices.

### CollisionDetector (`collision-detector.js`)
Advanced 3D collision detection with velocity-based slice recognition and performance optimization.

## Development Status

### Implemented Features
- [x] WebRTC camera integration with fallback handling
- [x] MediaPipe hand detection and tracking (up to 2 hands)
- [x] Three.js 3D scene
- [x] Cannon physics simulation
- [x] Weighted food spawning system with 7 food types
- [x] Advanced collision detection with velocity recognition
- [x] Dynamic scoring system with combo multipliers
- [x] Level progression and game state management
- [x] Visual finger tracking with animated spheres
- [x] Particle effects for successful slices
- [x] Real-time debug information and controls

### Planned Features
- [ ] Bomb objects to avoid (penalty for slicing)
- [ ] Power-ups and special effects
- [ ] Sound effects and audio feedback
- [ ] High score persistence with local storage
- [ ] Additional gesture recognition (multi-finger slicing)

## Performance Considerations

- **Optimized rendering**: Shared geometries and materials for efficiency
- **Smart collision detection**: Bounding box caching and cleanup systems
- **Physics optimization**: Fixed timestep simulation with configurable substeps
- **Memory management**: Automatic cleanup of expired objects and tracking data
- **Frame rate targeting**: 60 FPS

## Academic Context

This project was developed as part of the **Augmented Reality Laboratory** course at the University of Udine, under the guidance of Prof. Claudio Piciarelli. The implementation demonstrates practical application of:

- **Computer Vision**: Real-time hand tracking and gesture recognition
- **3D Graphics**: Scene management and physics simulation
- **Human-Computer Interaction**: Natural gesture-based interfaces

## Contributing

This is an academic project, but suggestions and improvements are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Prof. Claudio Piciarelli** - Course instructor and project guidance
- **University of Udine** - Academic support and resources
- **MediaPipe Team** - Advanced computer vision framework
- **Three.js Community** - Comprehensive 3D graphics framework
- **Cannon.js Contributors** - Physics simulation library

## References

- [Three.js Documentation](https://threejs.org/docs/)
- [MediaPipe Hand Landmarker](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

---

**Course**: Laboratorio di Realtà Aumentata  
**Institution**: Università degli Studi di Udine  
**Academic Year**: 2024/2025  
**Authors**: [@NovaActias](https://github.com/NovaActias), [@Verryx-02](https://github.com/Verryx-02)