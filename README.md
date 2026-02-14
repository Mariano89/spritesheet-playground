# Spritesheet Playground

A lightweight HTML5 canvas tool for testing spritesheets. Import a spritesheet PNG + JSON metadata pair, map frame ranges to animations, and instantly test them in a simple platformer scene.

## Getting Started

```bash
npm install
npm run dev
```

Then open the local URL shown in your terminal.

## Features

- **Drag-and-drop import** — Load your spritesheet PNG and JSON metadata
- **Animation mapper** — Assign frame ranges to idle, walk, run, jump, and crouch animations
- **Live preview** — See your animation playing in real-time as you configure it
- **Platformer test scene** — Run, jump, and crouch on platforms to test all your animations

## JSON Metadata Format

The JSON file should contain:

```json
{
  "frameWidth": 64,
  "frameHeight": 64,
  "frameCount": 24,
  "columns": 6,
  "rows": 4,
  "fps": 12
}
```

| Field | Description |
|---|---|
| `frameWidth` | Width of a single frame in pixels |
| `frameHeight` | Height of a single frame in pixels |
| `frameCount` | Total number of frames in the spritesheet |
| `columns` | Number of columns in the grid |
| `rows` | Number of rows in the grid |
| `fps` | Default frames per second |

## Usage

1. Drop your spritesheet PNG and JSON files onto the import zone
2. In the Animation Mapper, assign frame ranges:
   - **Idle** (required) — the default standing animation
   - **Walk** (optional) — triggered by arrow keys
   - **Run** (optional) — triggered by arrow keys + Shift
   - **Jump** (optional) — triggered by Spacebar or Up arrow
   - **Crouch** (optional) — triggered by Down arrow
3. Click **Start Game** to enter the platformer test scene

## Controls

| Key | Action |
|---|---|
| Arrow Left / A | Move left |
| Arrow Right / D | Move right |
| Arrow Up / W / Space | Jump |
| Arrow Down / S | Crouch |
| Shift | Run (hold with movement) |

## Tech Stack

TypeScript, SCSS, Vite. No runtime dependencies.

## License

MIT
