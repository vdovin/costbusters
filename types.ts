export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Entity extends Position, Size {
  id: number;
  markedForDeletion: boolean;
}

export interface Pit extends Entity {
  // Pit specific properties if any
}

export interface Player extends Entity {
  velocityY: number;
  isJumping: boolean;
  color: string;
}

export interface Enemy extends Entity {
  speed: number;
  label: string; // e.g., "TAX", "RENT"
}

export interface Coin extends Entity {
  value: number;
  wobbleOffset: number;
}

export interface Projectile extends Entity {
  speed: number;
}

export interface Particle extends Entity {
  velocityX: number;
  velocityY: number;
  life: number;
  color: string;
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}