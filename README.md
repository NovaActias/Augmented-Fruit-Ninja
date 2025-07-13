# Augmented Fruit Ninja

A web-based augmented reality mini-game inspired by the classic Fruit Ninja, developed for the **Augmented Reality** university course at University of Udine.

## Project Overview

Augmented Fruit Ninja brings the popular fruit-slicing game into the real world using computer vision and augmented reality technologies. Players use hand gestures or physical objects to slice 3D fruits that fall from the sky, all captured through their webcam in real-time.

### Key Features

- **Real-time webcam integration** with WebRTC
- **3D fruit spawning** with realistic physics simulation
- **Hand/object tracking** for natural interaction
- **Physics-based fruit slicing** with visual effects
- **Score system** with level progression
- **Modular architecture** for easy extension
- **Browser-based** - no external applications required

## Technical Architecture

### Technologies Used

- **Three.js** - 3D graphics rendering and scene management
- **Cannon.js** - Physics simulation for falling objects
- **WebRTC** - Real-time camera access
- **MediaPipe** (planned) - Hand detection and gesture recognition
- **ES6 Modules** - Modern JavaScript architecture
- **WebGL** - Hardware-accelerated graphics

### Project Structure

```
Augmented-Fruit-Ninja/
├── index.html              # Main HTML entry point
├── css/
│   └── style.css           # Styling (currently empty)
├── js/
│   ├── main.js             # Application entry point
│   └── modules/
│       ├── camera-manager.js      # WebRTC camera handling
│       ├── scene-manager.js       # Three.js scene setup
│       ├── fruit-spawner.js       # Procedural fruit generation
│       ├── game-logic.js          # Scoring and game rules
│       ├── physics-engine.js      # Cannon.js physics wrapper
│       ├── hand-detector.js       # Hand tracking (to be implemented)
│       └── collision-detector.js  # Fruit slicing detection
├── README.md
├── LICENSE
└── .gitignore
```

## Getting Started

### Prerequisites

- Modern web browser (Chrome 88+, Firefox 85+, Safari 14+)
- Webcam access permission
- Local web server (due to security restrictions)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/NovaActias/Augmented-Fruit-Ninja
   cd Augmented-Fruit-Ninja
   ```

2. **Start a local server**
   
   ```bash
   python -m http.server 8000
   ```
   
3. **Open in browser**
   ```
   http://localhost:8000
   ```

4. **Grant camera permissions** when prompted

### Usage Instructions

1. **Setup**: Position yourself in front of a **white background** for optimal tracking
2. **Start**: The game begins automatically once the camera initializes
3. **Play**: Use hand movements or a colored object to "slice" falling fruits
4. **Score**: Earn points by successfully slicing fruits before they fall off-screen

## Game Mechanics

### Fruit Spawning
- Fruits spawn randomly at the top of the screen every 1.5-2.5 seconds
- Maximum of 8 fruits on screen simultaneously
- Four fruit types: Apple (10 pts), Orange (15 pts), Banana (20 pts), Watermelon (25 pts)
- Physics simulation handles realistic falling motion with rotation

### Scoring System
- Base points per fruit type multiplied by current level
- Level increases every 30 seconds of gameplay
- Combo multipliers for consecutive hits (planned feature)

### Collision Detection
- Real-time hand/object position tracking
- 3D collision detection between hand position and fruit meshes
- Visual slicing effects when collision occurs

## Core Modules

### CameraManager (`camera-manager.js`)
Handles webcam initialization and video stream management.

```javascript
const cameraManager = new CameraManager(videoElement);
await cameraManager.initialize();
```

### SceneManager (`scene-manager.js`)
Manages Three.js scene, physics world, and rendering pipeline.

```javascript
const sceneManager = new SceneManager(canvas, videoElement);
await sceneManager.initialize();
```

### FruitSpawner (`fruit-spawner.js`)
Procedurally generates and manages falling fruit objects.

```javascript
const spawner = new FruitSpawner(sceneManager);
spawner.spawnFruit(); // Creates new fruit with physics
```

### GameLogic (`game-logic.js`)
Handles scoring, level progression, and game state management.

```javascript
const gameLogic = new GameLogic();
const points = gameLogic.sliceFruit('apple'); // Returns points earned
```

## Development Status

### Implemented Features
- [x] WebRTC camera integration
- [x] Three.js 3D scene setup
- [x] Physics-based fruit spawning
- [x] Basic game logic and scoring
- [x] Modular architecture
- [x] Real-time rendering loop

### In Progress
- [ ] Hand detection using MediaPipe
- [ ] Collision detection system
- [ ] Fruit slicing animations
- [ ] Visual effects for successful hits
- [ ] UI overlay for score display

### Planned Features
- [ ] Bomb objects (avoid slicing)
- [ ] Power-ups and special effects
- [ ] High score persistence
- [ ] Mobile device support

## Academic Context

This project was developed as part of the **Augmented Reality Laboratory** course at the University of Udine, under the guidance of Prof. Claudio Piciarelli.


### Technical Challenges Addressed
- **Camera-to-3D coordinate mapping** for accurate hand tracking
- **Real-time performance optimization** for smooth 60fps gameplay
- **Cross-browser compatibility** with modern web standards
- **Modular code organization** for maintainability

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|--------|
| Chrome | 88+ | Recommended for best performance |
| Firefox | 85+ | Full WebRTC support |
| Safari | 14+ | May require additional permissions |
| Edge | 88+ | Chromium-based versions only |

## Troubleshooting

### Common Issues

**Camera not working**
- Ensure HTTPS or localhost (required for WebRTC)
- Check browser permissions for camera access
- Try refreshing the page and re-granting permissions
- Try open in a private page

**Poor performance**
- Close other browser tabs/applications

## Performance Considerations

- **Target framerate**: 60 FPS
- **Maximum concurrent fruits**: 8 objects
- **Physics update rate**: Synchronized with display refresh
- **Memory management**: Automatic cleanup of off-screen objects

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
- **Three.js Community** - 3D graphics framework
- **MediaPipe Team** - Computer vision tools
- **Cannon.js Contributors** - Physics simulation library

## References

- [Three.js Documentation](https://threejs.org/docs/)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [MediaPipe Hand Detection](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)

---

**Course**: Laboratorio di Realtà Aumentata  
**Institution**: Università degli Studi di Udine  
**Academic Year**: 2024/2025  
**Author**: [Your Name]