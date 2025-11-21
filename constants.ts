
// Canvas logic size (scaled via CSS)
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;

// Physics
export const GRAVITY = 0.6;
export const JUMP_FORCE = -14; // How high Slava jumps
export const GROUND_Y = CANVAS_HEIGHT - 60; // Floor level
export const GAME_SPEED_START = 5;
export const GAME_SPEED_MAX = 12;
export const SAFE_ZONE_DISTANCE = 25; // Meters before enemies spawn

// Player
export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 60;
export const PLAYER_START_X = 100;

// Gameplay
export const SPAWN_RATE_ENEMIES_MIN = 60; // Frames
export const SPAWN_RATE_COINS_MIN = 30; // Frames

// Pits
export const SPAWN_RATE_PITS_MIN = 200; // Frames
export const PIT_WIDTH_MIN = 80;
export const PIT_WIDTH_MAX = 120;

// Colors
export const COLOR_PLAYER = '#3B82F6'; // Blue-500
export const COLOR_ENEMY = '#EF4444'; // Red-500
export const COLOR_COIN = '#EAB308'; // Yellow-500
export const COLOR_PROJECTILE = '#000000'; // Black

// Theme Colors
export const COLOR_SKY_TOP = '#0ea5e9'; // Sky 500
export const COLOR_SKY_BOTTOM = '#e0f2fe'; // Sky 100
export const COLOR_GROUND = '#475569'; // Slate 600 (Asphalt)
export const COLOR_PIT = '#0f172a'; // Slate 900 (Deep hole)
export const COLOR_CLOUD = '#ffffff';

// Text
export const EXPENSE_LABELS = [
  "НАЛОГ",
  "АРЕНДА",
  "КРЕДИТ",
  "Е Д А",
  "ЖКХ",
  "ШТРАФ"
];