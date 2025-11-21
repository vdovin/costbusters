
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GRAVITY, 
  JUMP_FORCE, 
  MAX_JUMPS,
  GROUND_Y, 
  PLAYER_WIDTH, 
  PLAYER_HEIGHT, 
  PLAYER_START_X, 
  COLOR_PLAYER, 
  COLOR_ENEMY, 
  COLOR_COIN, 
  COLOR_PROJECTILE,
  GAME_SPEED_START,
  EXPENSE_LABELS,
  SAFE_ZONE_DISTANCE,
  COLOR_SKY_TOP,
  COLOR_SKY_BOTTOM,
  COLOR_GROUND,
  COLOR_GRASS,
  COLOR_GRASS_DARK,
  COLOR_PIT,
  COLOR_CLOUD,
  SPAWN_RATE_PITS_MIN,
  PIT_WIDTH_MIN,
  PIT_WIDTH_MAX,
  INITIAL_LIVES,
  INVINCIBILITY_FRAMES
} from '../constants';
import { 
  GameState, 
  Player, 
  Enemy, 
  Coin, 
  Projectile, 
  Particle,
  Entity,
  Pit,
  Cloud
} from '../types';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  setDistance: (dist: number) => void;
  setLives: (lives: number) => void;
  onGameOver: (finalScore: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  setGameState, 
  setScore, 
  setDistance,
  setLives,
  onGameOver 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (Mutable for performance in game loop)
  const frameIdRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const distanceRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(GAME_SPEED_START);
  
  // Entities Refs
  const playerRef = useRef<Player>({
    id: 0,
    x: PLAYER_START_X,
    y: GROUND_Y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocityY: 0,
    isJumping: false,
    jumpCount: 0,
    color: COLOR_PLAYER,
    markedForDeletion: false,
    lives: INITIAL_LIVES,
    isInvincible: false,
    invincibilityTimer: 0
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const pitsRef = useRef<Pit[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  
  // Input Refs
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Frame counters for spawning
  const enemySpawnTimer = useRef<number>(0);
  const coinSpawnTimer = useRef<number>(0);
  const pitSpawnTimer = useRef<number>(0);

  // Stabilize onGameOver to prevent loop recreation on re-renders
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  // Initialize Clouds
  useEffect(() => {
      const initialClouds: Cloud[] = [];
      for(let i=0; i<8; i++) {
          const y = Math.random() * (CANVAS_HEIGHT / 2);
          initialClouds.push({
              id: i,
              x: Math.random() * CANVAS_WIDTH,
              y: y,
              baseY: y,
              width: 60 + Math.random() * 100,
              height: 30 + Math.random() * 30,
              speedFactor: 0.1 + Math.random() * 0.2, // Random speed for parallax depth
              markedForDeletion: false
          });
      }
      cloudsRef.current = initialClouds;
  }, []);

  // Initialize/Reset Game
  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    distanceRef.current = 0;
    gameSpeedRef.current = GAME_SPEED_START;
    
    playerRef.current = {
      id: 0,
      x: PLAYER_START_X,
      y: GROUND_Y - PLAYER_HEIGHT,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      velocityY: 0,
      isJumping: false,
      jumpCount: 0,
      color: COLOR_PLAYER,
      markedForDeletion: false,
      lives: INITIAL_LIVES,
      isInvincible: false,
      invincibilityTimer: 0
    };

    enemiesRef.current = [];
    coinsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    pitsRef.current = [];
    enemySpawnTimer.current = 0;
    coinSpawnTimer.current = 0;
    pitSpawnTimer.current = 0;
    
    setScore(0);
    setDistance(0);
    setLives(INITIAL_LIVES);
  }, [setScore, setDistance, setLives]);

  // Handle Input
  const handleJump = useCallback(() => {
    const p = playerRef.current;
    // Allow jump if not jumping (grounded) OR if jump count is less than max jumps
    if (!p.isJumping || p.jumpCount < MAX_JUMPS) {
      p.velocityY = JUMP_FORCE;
      p.isJumping = true;
      p.jumpCount++; // Increment jump count
      
      createParticles(p.x + PLAYER_WIDTH/2, p.y + PLAYER_HEIGHT, '#cbd5e1', 5);
    }
  }, []);

  const handleShoot = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    
    const shot: Projectile = {
      id: Date.now() + Math.random(),
      x: playerRef.current.x + PLAYER_WIDTH,
      y: playerRef.current.y + PLAYER_HEIGHT / 2,
      width: 20,
      height: 10,
      speed: 15,
      markedForDeletion: false
    };
    projectilesRef.current.push(shot);
  }, [gameState]);

  // Helpers
  const createParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random(),
        x,
        y,
        width: Math.random() * 4 + 2,
        height: Math.random() * 4 + 2,
        velocityX: (Math.random() - 0.5) * 10,
        velocityY: (Math.random() - 0.5) * 10,
        life: 1.0,
        markedForDeletion: false,
        color
      });
    }
  };

  const checkCollision = (rect1: Entity, rect2: Entity) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.height + rect1.y > rect2.y
    );
  };

  // Main Game Loop
  const loop = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // --- UPDATE ---

    // 1. Difficulty Scaling
    distanceRef.current += gameSpeedRef.current / 100;
    setDistance(Math.floor(distanceRef.current));
    if (gameSpeedRef.current < 15 && frameIdRef.current % 600 === 0) {
      gameSpeedRef.current += 0.5;
    }

    // 2. Player Physics
    const player = playerRef.current;
    player.velocityY += GRAVITY;
    player.y += player.velocityY;

    // Handle Invincibility Timer
    if (player.invincibilityTimer > 0) {
        player.invincibilityTimer--;
        if (player.invincibilityTimer <= 0) {
            player.isInvincible = false;
        }
    }

    // Check for Pits
    const playerFootX = player.x + player.width / 2; // Center of player
    const isOverPit = pitsRef.current.some(p => playerFootX > p.x && playerFootX < p.x + p.width);

    // Ground Collision
    // Fix: Check if we are "too deep". If we are significantly below GROUND_Y, we are falling to death, don't snap to ground.
    const isDeepInHole = player.y + player.height > GROUND_Y + 30; // 30px tolerance

    if (player.y + player.height > GROUND_Y && !isOverPit && !isDeepInHole) {
      player.y = GROUND_Y - player.height;
      player.velocityY = 0;
      player.isJumping = false;
      player.jumpCount = 0; // Reset jumps on ground
    }

    // Check Death by Falling (Always fatal, ignores lives)
    if (player.y > CANVAS_HEIGHT) {
         setLives(0);
         setGameState(GameState.GAME_OVER);
         onGameOverRef.current(scoreRef.current);
         return; // Stop loop
    }

    // 3. Spawning
    
    // Pits
    if (distanceRef.current > SAFE_ZONE_DISTANCE) {
        pitSpawnTimer.current++;
        if (pitSpawnTimer.current > SPAWN_RATE_PITS_MIN && Math.random() > 0.98) {
            pitSpawnTimer.current = 0;
            const pitWidth = PIT_WIDTH_MIN + Math.random() * (PIT_WIDTH_MAX - PIT_WIDTH_MIN);
            pitsRef.current.push({
                id: Date.now(),
                x: CANVAS_WIDTH,
                y: GROUND_Y,
                width: pitWidth,
                height: CANVAS_HEIGHT - GROUND_Y,
                markedForDeletion: false
            });
        }
    }

    // Enemies
    if (distanceRef.current > SAFE_ZONE_DISTANCE) {
        enemySpawnTimer.current++;
        // Don't spawn enemies if a pit was just spawned recently (simple heuristic: check last pit x)
        const lastPit = pitsRef.current[pitsRef.current.length - 1];
        const safeToSpawnEnemy = !lastPit || (lastPit.x < CANVAS_WIDTH - 150);

        if (safeToSpawnEnemy && enemySpawnTimer.current > 120 - Math.min(distanceRef.current, 60)) { 
            enemySpawnTimer.current = 0;
            const label = EXPENSE_LABELS[Math.floor(Math.random() * EXPENSE_LABELS.length)];
            const isFlying = Math.random() > 0.7; 
            
            enemiesRef.current.push({
                id: Date.now(),
                x: CANVAS_WIDTH,
                y: isFlying ? GROUND_Y - 140 : GROUND_Y - 50,
                width: 50,
                height: 50,
                speed: gameSpeedRef.current,
                label,
                markedForDeletion: false
            });
        }
    }

    // Coins
    coinSpawnTimer.current++;
    if (coinSpawnTimer.current > 40) {
      if (Math.random() > 0.6) {
        coinSpawnTimer.current = 0;
        const patternHeight = Math.random() > 0.5 ? GROUND_Y - 150 : GROUND_Y - 40;
        coinsRef.current.push({
          id: Date.now(),
          x: CANVAS_WIDTH,
          y: patternHeight,
          width: 25,
          height: 25,
          value: 10,
          wobbleOffset: Math.random() * Math.PI * 2,
          markedForDeletion: false
        });
      }
    }

    // 4. Entity Movement & Cleanup
    
    // Environment (Clouds)
    cloudsRef.current.forEach(c => {
        // Parallax movement: Each cloud moves at a different speed based on its factor
        c.x -= gameSpeedRef.current * c.speedFactor; 
        
        // Vertical Oscillation: Sine wave based on time and cloud ID
        const time = Date.now() / 1000;
        c.y = c.baseY + Math.sin(time + c.id) * 5;

        // Wrapping
        if (c.x + c.width + 50 < 0) {
            c.x = CANVAS_WIDTH + 50;
            c.baseY = Math.random() * (CANVAS_HEIGHT / 2); // Reposition height slightly on wrap
            c.y = c.baseY; // Snap to new base
        }
    });

    // Pits
    pitsRef.current.forEach(p => {
        p.x -= gameSpeedRef.current;
        if (p.x + p.width < 0) p.markedForDeletion = true;
    });

    // Projectiles
    projectilesRef.current.forEach(p => {
      p.x += p.speed;
      if (p.x > CANVAS_WIDTH) p.markedForDeletion = true;
    });

    // Enemies
    enemiesRef.current.forEach(e => {
      e.x -= e.speed;
      if (e.x + e.width < 0) e.markedForDeletion = true;
    });

    // Coins
    coinsRef.current.forEach(c => {
      c.x -= gameSpeedRef.current;
      if (c.x + c.width < 0) c.markedForDeletion = true;
    });

    // Particles
    particlesRef.current.forEach(p => {
      p.x += p.velocityX;
      p.y += p.velocityY;
      p.life -= 0.05;
      if (p.life <= 0) p.markedForDeletion = true;
    });

    // 5. Collision Detection

    // Player vs Enemies
    enemiesRef.current.forEach(enemy => {
      if (!enemy.markedForDeletion && checkCollision(player, enemy)) {
        // STOMP LOGIC
        const isFalling = player.velocityY > 0;
        // Allow stomp if player is roughly above the enemy
        const isAbove = (player.y + player.height) < (enemy.y + enemy.height * 0.7); 

        if (isFalling && isAbove) {
            // Successful Stomp
            enemy.markedForDeletion = true;
            player.velocityY = JUMP_FORCE * 0.8; // Bounce up
            player.jumpCount = 1; // Allow 1 more jump after bounce
            
            scoreRef.current += 20;
            setScore(scoreRef.current);
            
            createParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, COLOR_ENEMY, 15);
        } else {
            // PLAYER HIT LOGIC
            if (!player.isInvincible) {
                player.lives -= 1;
                setLives(player.lives);

                if (player.lives <= 0) {
                    setGameState(GameState.GAME_OVER);
                    onGameOverRef.current(scoreRef.current);
                    createParticles(player.x, player.y, COLOR_PLAYER, 20);
                } else {
                    // Survived hit
                    player.isInvincible = true;
                    player.invincibilityTimer = INVINCIBILITY_FRAMES;
                    player.velocityY = -6; // Small bounce back/knockback
                    createParticles(player.x, player.y, COLOR_ENEMY, 10);
                }
            }
        }
      }
    });

    // Player vs Coins
    coinsRef.current.forEach(coin => {
      if (!coin.markedForDeletion && checkCollision(player, coin)) {
        coin.markedForDeletion = true;
        scoreRef.current += coin.value;
        setScore(scoreRef.current);
        createParticles(coin.x, coin.y, COLOR_COIN, 5);
      }
    });

    // Projectiles vs Enemies
    projectilesRef.current.forEach(proj => {
      enemiesRef.current.forEach(enemy => {
        if (!proj.markedForDeletion && !enemy.markedForDeletion && checkCollision(proj, enemy)) {
          proj.markedForDeletion = true;
          enemy.markedForDeletion = true;
          scoreRef.current += 5;
          setScore(scoreRef.current);
          createParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, COLOR_ENEMY, 10);
        }
      });
    });

    // Filter Deleted
    enemiesRef.current = enemiesRef.current.filter(e => !e.markedForDeletion);
    coinsRef.current = coinsRef.current.filter(c => !c.markedForDeletion);
    projectilesRef.current = projectilesRef.current.filter(p => !p.markedForDeletion);
    particlesRef.current = particlesRef.current.filter(p => !p.markedForDeletion);
    pitsRef.current = pitsRef.current.filter(p => !p.markedForDeletion);

    // --- DRAW ---

    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Sky Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, COLOR_SKY_TOP); 
    gradient.addColorStop(1, COLOR_SKY_BOTTOM); 
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Sun
    ctx.fillStyle = '#fcd34d'; // Amber 300
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH - 80, 60, 40, 0, Math.PI*2);
    ctx.fill();
    // Sun Glow
    ctx.fillStyle = 'rgba(253, 224, 71, 0.3)';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH - 80, 60, 60, 0, Math.PI*2);
    ctx.fill();

    // 3. Clouds (Parallax & Oscillation)
    cloudsRef.current.forEach(c => {
        ctx.globalAlpha = 0.6 + c.speedFactor; 
        ctx.fillStyle = COLOR_CLOUD;
        
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.height, 0, Math.PI*2);
        ctx.arc(c.x + 20, c.y - 10, c.height * 1.2, 0, Math.PI*2);
        ctx.arc(c.x + 40, c.y, c.height, 0, Math.PI*2);
        ctx.fill();
        
        ctx.globalAlpha = 1.0; // Reset
    });

    // 4. Background Elements (Parallax) - MOUNTAINS ONLY
    
    // Layer 1: Distant Mountains (Purple, very slow)
    const mountainSpeed = distanceRef.current * 5;
    ctx.fillStyle = '#a78bfa'; // Violet 400 - soft purple mountains
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT);
    // Draw sine wave mountains that wrap smoothly
    for(let x = 0; x <= CANVAS_WIDTH; x += 10) {
        // Create multiple peaks
        const noise = Math.sin((x + mountainSpeed) * 0.005) * 80 + Math.sin((x + mountainSpeed) * 0.01) * 30;
        // Base height is somewhat low in the background
        const y = CANVAS_HEIGHT - 120 - noise;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.fill();

    // 5. Ground with Grass Texture
    // Bottom Dirt Layer
    ctx.fillStyle = COLOR_GROUND;
    ctx.fillRect(0, GROUND_Y + 15, CANVAS_WIDTH, CANVAS_HEIGHT - (GROUND_Y + 15));

    // Top Grass Layer
    ctx.fillStyle = COLOR_GRASS;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 15);

    // Scrolling Grass Texture (Tufts)
    ctx.fillStyle = COLOR_GRASS_DARK;
    const grassOffset = (distanceRef.current * 20) % 40;
    for(let i = -grassOffset; i < CANVAS_WIDTH; i += 40) {
        // Draw grass tuft
        ctx.beginPath();
        ctx.moveTo(i, GROUND_Y + 15);
        ctx.lineTo(i + 4, GROUND_Y);
        ctx.lineTo(i + 8, GROUND_Y + 15);
        ctx.fill();
        
        // Random second blade
        ctx.beginPath();
        ctx.moveTo(i + 15, GROUND_Y + 10);
        ctx.lineTo(i + 18, GROUND_Y + 2);
        ctx.lineTo(i + 21, GROUND_Y + 10);
        ctx.fill();
    }
    
    // 6. Pits (Drawn over ground to mask it)
    ctx.fillStyle = COLOR_PIT; // Sky color
    pitsRef.current.forEach(p => {
        ctx.fillRect(p.x, p.y, p.width, p.height);
        
        // Optional: Add faint "cloud" in the hole to show it's sky
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(p.x + p.width/2, p.y + 40, 20, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = COLOR_PIT; // Reset
    });

    // Draw Entities

    // Coins
    ctx.fillStyle = COLOR_COIN;
    coinsRef.current.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x + c.width/2, c.y + c.height/2, c.width/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(c.x + c.width/2 - 5, c.y + c.height/2 - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLOR_COIN;
    });

    // Projectiles
    ctx.fillStyle = COLOR_PROJECTILE;
    projectilesRef.current.forEach(p => {
      ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // Enemies
    enemiesRef.current.forEach(e => {
      ctx.fillStyle = COLOR_ENEMY;
      ctx.fillRect(e.x, e.y, e.width, e.height);
      
      // Text Label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.label, e.x + e.width/2, e.y + e.height/2 + 4);

      // "Angry" Eyes
      ctx.fillStyle = 'black';
      ctx.fillRect(e.x + 10, e.y + 10, 8, 8);
      ctx.fillRect(e.x + 32, e.y + 10, 8, 8);
    });

    // Player (Slava)
    const pX = player.x;
    const pY = player.y;
    const pW = player.width;
    const pH = player.height;
    const isGrounded = player.y === GROUND_Y - player.height;

    // INVINCIBILITY EFFECT
    if (player.isInvincible) {
        // Flash effect: lower opacity rapidly
        if (Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
    }

    // 1. Legs (Dark Blue Suit Pants)
    ctx.fillStyle = '#1e3a8a';
    if (isGrounded) {
        // Running animation
        const legSwing = Math.sin(Date.now() / 50) * 12;
        ctx.fillRect(pX + 5 + legSwing, pY + pH - 20, 10, 20); // Leg 1
        ctx.fillRect(pX + 25 - legSwing, pY + pH - 20, 10, 20); // Leg 2
    } else {
        // Jumping pose
        ctx.fillRect(pX + 5, pY + pH - 15, 10, 15); 
        ctx.fillRect(pX + 25, pY + pH - 25, 10, 15);
    }

    // 2. Body (Navy Blue Jacket)
    ctx.fillStyle = '#172554'; // Darker blue
    ctx.fillRect(pX, pY + 20, pW, 30);

    // White Shirt triangle
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(pX + pW/2, pY + 45);
    ctx.lineTo(pX + 10, pY + 20);
    ctx.lineTo(pX + pW - 10, pY + 20);
    ctx.fill();

    // Light Blue Tie
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(pX + pW/2 - 3, pY + 20, 6, 18);

    // Star Badge (Boss)
    ctx.fillStyle = '#facc15'; // Yellow
    ctx.beginPath();
    ctx.arc(pX + pW - 12, pY + 28, 4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Head (Skin Tone)
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(pX + 4, pY, pW - 8, 22);

    // Beard (Brown)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(pX + 4, pY + 12, pW - 8, 10);
    
    // Mouth/Smile
    ctx.fillStyle = 'white';
    ctx.fillRect(pX + 14, pY + 15, 12, 3);
    // Gold tooth
    ctx.fillStyle = '#facc15';
    ctx.fillRect(pX + 20, pY + 15, 3, 3);

    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pX + 10, pY + 6, 4, 4);
    ctx.fillRect(pX + 26, pY + 6, 4, 4);

    // 4. Red Hat (MAGA style)
    ctx.fillStyle = '#dc2626'; // Red
    ctx.fillRect(pX + 2, pY - 6, pW - 4, 10); // Dome
    ctx.fillRect(pX + 2, pY + 2, pW + 6, 4); // Visor
    // Text lines on hat
    ctx.fillStyle = 'white';
    ctx.fillRect(pX + 8, pY - 3, 24, 2);

    // 5. Thumbs Up Hand (if not shooting)
    ctx.fillStyle = '#fca5a5'; // Skin
    const handY = pY + 30 + (isGrounded ? Math.cos(Date.now() / 50) * 2 : -5);
    ctx.fillRect(pX + 32, handY, 10, 10); // Hand blob
    ctx.fillRect(pX + 34, handY - 4, 4, 6); // Thumb up

    // Reset Opacity
    ctx.globalAlpha = 1.0;

    // Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.width, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // Request Next Frame
    frameIdRef.current = requestAnimationFrame(loop);
  }, [gameState, setGameState, setScore, setDistance, setLives]); 

  // Effect 1: Handle Reset when entering PLAYING state
  useEffect(() => {
      if (gameState === GameState.PLAYING) {
          resetGame();
      }
  }, [gameState, resetGame]);

  // Effect 2: Start Loop when PLAYING
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      frameIdRef.current = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(frameIdRef.current);
    }

    return () => cancelAnimationFrame(frameIdRef.current);
  }, [gameState, loop]);

  // Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (gameState === GameState.PLAYING) {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          handleJump();
        }
        if (e.code === 'KeyF' || e.code === 'KeyD' || e.code === 'Enter') {
            handleShoot();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, handleJump, handleShoot]);

  // Initial draw (background)
  useEffect(() => {
      if (gameState === GameState.MENU && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            gradient.addColorStop(0, COLOR_SKY_TOP); 
            gradient.addColorStop(1, COLOR_SKY_BOTTOM); 
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            
            // Initial static ground draw
            ctx.fillStyle = COLOR_GROUND;
            ctx.fillRect(0, GROUND_Y + 15, CANVAS_WIDTH, CANVAS_HEIGHT - (GROUND_Y + 15));
            ctx.fillStyle = COLOR_GRASS;
            ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 15);
          }
      }
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full object-contain bg-white rounded-lg shadow-2xl cursor-pointer"
      onTouchStart={(e) => {
          e.preventDefault(); 
          handleJump();
      }}
    />
  );
};
