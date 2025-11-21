
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
  COLOR_ENEMY_FLYING,
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
  INVINCIBILITY_FRAMES,
  SHIELD_DURATION,
  SPAWN_RATE_SHIELD_MIN,
  COLOR_SHIELD_ITEM,
  COLOR_SHIELD_GLOW
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
  Cloud,
  Shield
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
    invincibilityTimer: 0,
    shieldTimer: 0
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const shieldsRef = useRef<Shield[]>([]); // New Ref for Shields
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const pitsRef = useRef<Pit[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  
  // Input Refs
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Frame counters for spawning
  const enemySpawnTimer = useRef<number>(0);
  const coinSpawnTimer = useRef<number>(0);
  const shieldSpawnTimer = useRef<number>(0);
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
      invincibilityTimer: 0,
      shieldTimer: 0
    };

    enemiesRef.current = [];
    coinsRef.current = [];
    shieldsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    pitsRef.current = [];
    enemySpawnTimer.current = 0;
    coinSpawnTimer.current = 0;
    shieldSpawnTimer.current = 0;
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

    // Handle Shield Timer
    if (player.shieldTimer > 0) {
        player.shieldTimer--;
    }

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
    const isDeepInHole = player.y + player.height > GROUND_Y + 30; 

    if (player.y + player.height > GROUND_Y && !isOverPit && !isDeepInHole) {
      player.y = GROUND_Y - player.height;
      player.velocityY = 0;
      player.isJumping = false;
      player.jumpCount = 0; // Reset jumps on ground
    }

    // Check Death by Falling (Always fatal, ignores lives and shields)
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
        // Don't spawn enemies if a pit was just spawned recently
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
                type: isFlying ? 'FLYING' : 'GROUND',
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

    // Shields (Rare spawn)
    shieldSpawnTimer.current++;
    if (shieldSpawnTimer.current > SPAWN_RATE_SHIELD_MIN) {
        if (Math.random() > 0.8) { // 20% chance after timer interval
            shieldSpawnTimer.current = 0;
            shieldsRef.current.push({
                id: Date.now(),
                x: CANVAS_WIDTH,
                y: GROUND_Y - 120, // Floating height
                width: 30,
                height: 30,
                wobbleOffset: Math.random() * Math.PI * 2,
                markedForDeletion: false
            });
        } else {
            // Reset timer but random offset to avoid predictable pattern if check fails
            shieldSpawnTimer.current = SPAWN_RATE_SHIELD_MIN - 100; 
        }
    }

    // 4. Entity Movement & Cleanup
    
    // Environment (Clouds)
    cloudsRef.current.forEach(c => {
        c.x -= gameSpeedRef.current * c.speedFactor; 
        c.y = c.baseY + Math.sin(Date.now() / 1000 + c.id) * 5;
        if (c.x + c.width + 50 < 0) {
            c.x = CANVAS_WIDTH + 50;
            c.baseY = Math.random() * (CANVAS_HEIGHT / 2);
            c.y = c.baseY;
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

    // Shields
    shieldsRef.current.forEach(s => {
        s.x -= gameSpeedRef.current;
        if (s.x + s.width < 0) s.markedForDeletion = true;
    });

    // Particles
    particlesRef.current.forEach(p => {
      p.x += p.velocityX;
      p.y += p.velocityY;
      p.life -= 0.05;
      if (p.life <= 0) p.markedForDeletion = true;
    });

    // 5. Collision Detection

    // Player vs Shields
    shieldsRef.current.forEach(shield => {
        if (!shield.markedForDeletion && checkCollision(player, shield)) {
            shield.markedForDeletion = true;
            player.shieldTimer = SHIELD_DURATION; // Activate shield
            createParticles(shield.x + 15, shield.y + 15, COLOR_SHIELD_GLOW, 10);
        }
    });

    // Player vs Enemies
    enemiesRef.current.forEach(enemy => {
      if (!enemy.markedForDeletion && checkCollision(player, enemy)) {
        // STOMP LOGIC
        const isFalling = player.velocityY > 0;
        const isAbove = (player.y + player.height) < (enemy.y + enemy.height * 0.7); 

        if (isFalling && isAbove) {
            // Successful Stomp
            enemy.markedForDeletion = true;
            player.velocityY = JUMP_FORCE * 0.8; 
            player.jumpCount = 1; 
            
            scoreRef.current += 20;
            setScore(scoreRef.current);
            
            createParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.type === 'FLYING' ? COLOR_ENEMY_FLYING : COLOR_ENEMY, 15);
        } else {
            // HIT LOGIC
            // Check if player has SHIELD or INVINCIBILITY
            if (player.shieldTimer > 0) {
                // Shield absorbs hit, no damage, no enemy death (or maybe enemy bounce?)
                // Let's just bounce player back a bit and destroy enemy as a bonus? 
                // Standard shield behavior: absorb hit, ignore damage. 
                // Let's destroy enemy to make it powerful
                enemy.markedForDeletion = true;
                createParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, COLOR_SHIELD_GLOW, 10);
            } else if (!player.isInvincible) {
                // TAKE DAMAGE
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
                    player.velocityY = -6;
                    createParticles(player.x, player.y, enemy.type === 'FLYING' ? COLOR_ENEMY_FLYING : COLOR_ENEMY, 10);
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
          createParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.type === 'FLYING' ? COLOR_ENEMY_FLYING : COLOR_ENEMY, 10);
        }
      });
    });

    // Filter Deleted
    enemiesRef.current = enemiesRef.current.filter(e => !e.markedForDeletion);
    coinsRef.current = coinsRef.current.filter(c => !c.markedForDeletion);
    shieldsRef.current = shieldsRef.current.filter(s => !s.markedForDeletion);
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
    ctx.fillStyle = '#fcd34d'; 
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH - 80, 60, 40, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'rgba(253, 224, 71, 0.3)';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH - 80, 60, 60, 0, Math.PI*2);
    ctx.fill();

    // 3. Clouds
    cloudsRef.current.forEach(c => {
        ctx.globalAlpha = 0.6 + c.speedFactor; 
        ctx.fillStyle = COLOR_CLOUD;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.height, 0, Math.PI*2);
        ctx.arc(c.x + 20, c.y - 10, c.height * 1.2, 0, Math.PI*2);
        ctx.arc(c.x + 40, c.y, c.height, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0; 
    });

    // 4. Background Mountains
    const mountainSpeed = distanceRef.current * 5;
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT);
    for(let x = 0; x <= CANVAS_WIDTH; x += 10) {
        const noise = Math.sin((x + mountainSpeed) * 0.005) * 80 + Math.sin((x + mountainSpeed) * 0.01) * 30;
        const y = CANVAS_HEIGHT - 120 - noise;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.fill();

    // 5. Ground
    ctx.fillStyle = COLOR_GROUND;
    ctx.fillRect(0, GROUND_Y + 15, CANVAS_WIDTH, CANVAS_HEIGHT - (GROUND_Y + 15));
    ctx.fillStyle = COLOR_GRASS;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 15);

    // Procedural Grass & Flowers
    const segmentSize = 20;
    const scrollPos = distanceRef.current * 20; 
    const startIdx = Math.floor(scrollPos / segmentSize);
    const endIdx = startIdx + Math.ceil(CANVAS_WIDTH / segmentSize) + 1;

    for (let i = startIdx; i < endIdx; i++) {
        const x = (i * segmentSize) - scrollPos;
        const noise = Math.sin(i * 12.9898 + i * 78.233) * 43758.5453;
        const rand = noise - Math.floor(noise);

        ctx.fillStyle = COLOR_GRASS_DARK;
        if (rand > 0.3) {
            const h = 5 + rand * 8;
            const w = 3 + rand * 2;
            const slant = (rand - 0.5) * 5;
            ctx.beginPath();
            ctx.moveTo(x, GROUND_Y + 15);
            ctx.lineTo(x + w/2 + slant, GROUND_Y - h + 10); 
            ctx.lineTo(x + w, GROUND_Y + 15);
            ctx.fill();
        }

        if (rand > 0.92) {
            ctx.strokeStyle = '#065f46';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 10, GROUND_Y + 15);
            ctx.lineTo(x + 10, GROUND_Y - 15);
            ctx.stroke();
            const flowerType = Math.floor(rand * 100) % 3;
            ctx.fillStyle = flowerType === 0 ? '#f472b6' : (flowerType === 1 ? '#facc15' : '#ffffff');
            ctx.beginPath();
            ctx.arc(x + 10, GROUND_Y - 15, 6, 0, Math.PI * 2); 
            ctx.fill();
            ctx.fillStyle = '#451a03';
            ctx.beginPath();
            ctx.arc(x + 10, GROUND_Y - 15, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // 6. Pits
    ctx.fillStyle = COLOR_PIT; 
    pitsRef.current.forEach(p => {
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(p.x + p.width/2, p.y + 40, 20, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = COLOR_PIT; 
    });

    // Draw Entities

    // Shields
    shieldsRef.current.forEach(s => {
        const wobble = Math.sin(Date.now() / 200 + s.wobbleOffset) * 5;
        const y = s.y + wobble;
        
        // Shield Shape
        ctx.fillStyle = COLOR_SHIELD_ITEM;
        ctx.beginPath();
        ctx.moveTo(s.x, y);
        ctx.lineTo(s.x + s.width, y);
        ctx.lineTo(s.x + s.width, y + s.height/2);
        ctx.quadraticCurveTo(s.x + s.width/2, y + s.height + 10, s.x, y + s.height/2);
        ctx.lineTo(s.x, y);
        ctx.fill();
        
        // Inner Detail (Cross)
        ctx.fillStyle = 'white';
        ctx.fillRect(s.x + s.width/2 - 3, y + 5, 6, s.height - 15);
        ctx.fillRect(s.x + 5, y + s.height/2 - 5, s.width - 10, 6);
        
        // Border
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

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
      if (e.type === 'FLYING') {
          // Flying Enemy (Purple)
          const flap = Math.sin(Date.now() / 100) * 10;
          ctx.fillStyle = '#e9d5ff'; 
          ctx.beginPath();
          ctx.moveTo(e.x + 10, e.y + 20);
          ctx.quadraticCurveTo(e.x - 15, e.y + 5 + flap, e.x + 5, e.y + 35);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(e.x + 40, e.y + 20);
          ctx.quadraticCurveTo(e.x + 65, e.y + 5 + flap, e.x + 45, e.y + 35);
          ctx.fill();
          ctx.fillStyle = COLOR_ENEMY_FLYING;
          ctx.beginPath();
          ctx.ellipse(e.x + 25, e.y + 25, 20, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(e.x + 25, e.y + 10);
          ctx.lineTo(e.x + 15, e.y);
          ctx.lineTo(e.x + 35, e.y);
          ctx.fill();
          ctx.fillStyle = '#581c87';
          ctx.fillRect(e.x + 20, e.y + 8, 10, 3);
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.ellipse(e.x + 18, e.y + 20, 4, 3, -0.2, 0, Math.PI * 2);
          ctx.ellipse(e.x + 32, e.y + 20, 4, 3, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1f2937';
          ctx.beginPath();
          ctx.arc(e.x + 25, e.y + 30, 6, 0, Math.PI, false);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.moveTo(e.x + 21, e.y + 30); ctx.lineTo(e.x + 23, e.y + 34); ctx.lineTo(e.x + 25, e.y + 30);
          ctx.moveTo(e.x + 25, e.y + 30); ctx.lineTo(e.x + 27, e.y + 34); ctx.lineTo(e.x + 29, e.y + 30);
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('$', e.x + 21, e.y + 38);
      } else {
          // Ground Enemy (Tan)
          ctx.fillStyle = '#1f2937';
          const walkOffset = Math.sin(Date.now() / 50) * 5;
          ctx.beginPath();
          ctx.moveTo(e.x + 15, e.y + 40);
          ctx.lineTo(e.x + 10 - walkOffset, e.y + 50);
          ctx.lineTo(e.x + 15 - walkOffset, e.y + 50);
          ctx.lineTo(e.x + 20, e.y + 40);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(e.x + 35, e.y + 40);
          ctx.lineTo(e.x + 40 + walkOffset, e.y + 50);
          ctx.lineTo(e.x + 45 + walkOffset, e.y + 50);
          ctx.lineTo(e.x + 40, e.y + 40);
          ctx.fill();
          ctx.fillStyle = '#d4a373';
          ctx.beginPath();
          ctx.ellipse(e.x + 25, e.y + 25, 20, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(e.x + 25, e.y + 10);
          ctx.lineTo(e.x + 15, e.y);
          ctx.lineTo(e.x + 35, e.y);
          ctx.fill();
          ctx.fillStyle = '#4b5563';
          ctx.fillRect(e.x + 20, e.y + 8, 10, 3);
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.ellipse(e.x + 18, e.y + 20, 4, 3, -0.2, 0, Math.PI * 2);
          ctx.ellipse(e.x + 32, e.y + 20, 4, 3, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#111827';
          ctx.beginPath();
          ctx.arc(e.x + 25, e.y + 30, 8, 0, Math.PI, false);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.moveTo(e.x + 19, e.y + 30); ctx.lineTo(e.x + 21, e.y + 34); ctx.lineTo(e.x + 23, e.y + 30);
          ctx.moveTo(e.x + 23, e.y + 30); ctx.lineTo(e.x + 25, e.y + 34); ctx.lineTo(e.x + 27, e.y + 30);
          ctx.moveTo(e.x + 27, e.y + 30); ctx.lineTo(e.x + 29, e.y + 34); ctx.lineTo(e.x + 31, e.y + 30);
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('$', e.x + 21, e.y + 38);
          ctx.strokeStyle = '#1f2937';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(e.x + 8, e.y + 25);
          ctx.lineTo(e.x - 5, e.y + 15);
          ctx.moveTo(e.x + 42, e.y + 25);
          ctx.lineTo(e.x + 55, e.y + 15);
          ctx.stroke();
      }
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = "black";
      ctx.shadowBlur = 2;
      ctx.fillText(e.label, e.x + 25, e.y - 5);
      ctx.shadowBlur = 0;
    });

    // Player (Slava)
    const pX = player.x;
    const pY = player.y;
    const pW = player.width;
    const pH = player.height;
    const isGrounded = player.y === GROUND_Y - player.height;

    // SHIELD EFFECT (Gold flicker)
    if (player.shieldTimer > 0) {
        if (Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.globalAlpha = 1.0;
            // Gold Glow Halo
            ctx.shadowColor = COLOR_SHIELD_GLOW;
            ctx.shadowBlur = 20;
        } else {
            // Slightly bright overlay
            ctx.fillStyle = COLOR_SHIELD_GLOW;
        }
    } 
    // HIT INVINCIBILITY EFFECT (Transparent flicker)
    else if (player.isInvincible) {
        if (Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
    }

    // 1. Legs
    ctx.fillStyle = '#1e3a8a';
    if (isGrounded) {
        const legSwing = Math.sin(Date.now() / 50) * 12;
        ctx.fillRect(pX + 5 + legSwing, pY + pH - 20, 10, 20);
        ctx.fillRect(pX + 25 - legSwing, pY + pH - 20, 10, 20);
    } else {
        ctx.fillRect(pX + 5, pY + pH - 15, 10, 15); 
        ctx.fillRect(pX + 25, pY + pH - 25, 10, 15);
    }

    // 2. Body
    ctx.fillStyle = '#172554';
    ctx.fillRect(pX, pY + 20, pW, 30);
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(pX + pW/2, pY + 45);
    ctx.lineTo(pX + 10, pY + 20);
    ctx.lineTo(pX + pW - 10, pY + 20);
    ctx.fill();
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(pX + pW/2 - 3, pY + 20, 6, 18);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(pX + pW - 12, pY + 28, 4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Head
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(pX + 4, pY, pW - 8, 22);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(pX + 4, pY + 12, pW - 8, 10);
    ctx.fillStyle = 'white';
    ctx.fillRect(pX + 14, pY + 15, 12, 3);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(pX + 20, pY + 15, 3, 3);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pX + 10, pY + 6, 4, 4);
    ctx.fillRect(pX + 26, pY + 6, 4, 4);

    // 4. Hat
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(pX + 2, pY - 6, pW - 4, 10);
    ctx.fillRect(pX + 2, pY + 2, pW + 6, 4);
    ctx.fillStyle = 'white';
    ctx.fillRect(pX + 8, pY - 3, 24, 2);

    // 5. Hand
    ctx.fillStyle = '#fca5a5';
    const handY = pY + 30 + (isGrounded ? Math.cos(Date.now() / 50) * 2 : -5);
    ctx.fillRect(pX + 32, handY, 10, 10);
    ctx.fillRect(pX + 34, handY - 4, 4, 6);

    // Reset Effects
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;

    // Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.width, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    frameIdRef.current = requestAnimationFrame(loop);
  }, [gameState, setGameState, setScore, setDistance, setLives]); 

  useEffect(() => {
      if (gameState === GameState.PLAYING) {
          resetGame();
      }
  }, [gameState, resetGame]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      frameIdRef.current = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(frameIdRef.current);
    }
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [gameState, loop]);

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

  // Initial Draw
  useEffect(() => {
      if (gameState === GameState.MENU && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            gradient.addColorStop(0, COLOR_SKY_TOP); 
            gradient.addColorStop(1, COLOR_SKY_BOTTOM); 
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
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
