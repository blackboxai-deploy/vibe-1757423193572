"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Game Configuration
const GRID_SIZE = 20;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = Math.min(CANVAS_WIDTH / GRID_SIZE, CANVAS_HEIGHT / GRID_SIZE);
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 10;
const MIN_SPEED = 50;
const SCORE_INCREMENT = 5;

// Types
interface Position {
  x: number;
  y: number;
}

interface GameState {
  snake: Position[];
  food: Position;
  direction: string;
  nextDirection: string;
  score: number;
  highScore: number;
  gameStatus: 'menu' | 'playing' | 'paused' | 'gameOver';
  speed: number;
  level: number;
}

// Audio Context for sound effects
let audioContext: AudioContext | null = null;

const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

const playSound = (frequency: number, duration: number, type: 'sine' | 'square' = 'sine') => {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

const SnakeGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>({
    snake: [{ x: 10, y: 10 }],
    food: { x: 15, y: 15 },
    direction: 'RIGHT',
    nextDirection: 'RIGHT',
    score: 0,
    highScore: 0,
    gameStatus: 'menu',
    speed: INITIAL_SPEED,
    level: 1
  });

  // Initialize high score from localStorage
  useEffect(() => {
    const storedHighScore = localStorage.getItem('snakeHighScore');
    if (storedHighScore) {
      setGameState(prev => ({ ...prev, highScore: parseInt(storedHighScore) }));
    }
  }, []);

  // Generate random food position
  const generateFood = useCallback((snake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // Check collision with walls or self
  const checkCollision = (head: Position, snake: Position[]): boolean => {
    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    // Self collision
    return snake.some(segment => segment.x === head.x && segment.y === head.y);
  };

  // Move snake
  const moveSnake = useCallback(() => {
    setGameState(prevState => {
      if (prevState.gameStatus !== 'playing') return prevState;

      const newSnake = [...prevState.snake];
      const head = { ...newSnake[0] };
      
      // Update direction
      const currentDirection = prevState.nextDirection;
      
      // Move head based on direction
      switch (currentDirection) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
      }

      // Check collision
      if (checkCollision(head, newSnake)) {
        playSound(200, 0.5, 'square'); // Game over sound
        return {
          ...prevState,
          gameStatus: 'gameOver',
          highScore: Math.max(prevState.score, prevState.highScore)
        };
      }

      newSnake.unshift(head);

      // Check food collision
      if (head.x === prevState.food.x && head.y === prevState.food.y) {
        playSound(800, 0.2); // Food sound
        const newScore = prevState.score + 1;
        const newLevel = Math.floor(newScore / SCORE_INCREMENT) + 1;
        const newSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - (newLevel - 1) * SPEED_INCREMENT);
        
        return {
          ...prevState,
          snake: newSnake,
          food: generateFood(newSnake),
          score: newScore,
          level: newLevel,
          speed: newSpeed,
          direction: currentDirection
        };
      }

      // Remove tail if no food eaten
      newSnake.pop();

      return {
        ...prevState,
        snake: newSnake,
        direction: currentDirection
      };
    });
  }, [generateFood]);

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    if (currentTime - lastTimeRef.current >= gameState.speed) {
      moveSnake();
      lastTimeRef.current = currentTime;
    }
    if (gameState.gameStatus === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameState.speed, gameState.gameStatus, moveSnake]);

  // Start game loop
  useEffect(() => {
    if (gameState.gameStatus === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.gameStatus, gameLoop]);

  // Handle keyboard input
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const { key } = event;
    
    setGameState(prevState => {
      const currentDirection = prevState.direction;
      let newDirection = prevState.nextDirection;

      switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDirection !== 'DOWN') newDirection = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDirection !== 'UP') newDirection = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDirection !== 'RIGHT') newDirection = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDirection !== 'LEFT') newDirection = 'RIGHT';
          break;
        case ' ':
          event.preventDefault();
          if (prevState.gameStatus === 'playing') {
            return { ...prevState, gameStatus: 'paused' };
          } else if (prevState.gameStatus === 'paused') {
            return { ...prevState, gameStatus: 'playing' };
          }
          break;
      }

      return { ...prevState, nextDirection: newDirection };
    });
  }, []);

  // Touch controls
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
      setGameState(prevState => {
        const currentDirection = prevState.direction;
        let newDirection = prevState.nextDirection;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (deltaX > 0 && currentDirection !== 'LEFT') {
            newDirection = 'RIGHT';
          } else if (deltaX < 0 && currentDirection !== 'RIGHT') {
            newDirection = 'LEFT';
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && currentDirection !== 'UP') {
            newDirection = 'DOWN';
          } else if (deltaY < 0 && currentDirection !== 'DOWN') {
            newDirection = 'UP';
          }
        }

        return { ...prevState, nextDirection: newDirection };
      });
    }

    setTouchStart(null);
  };

  // Add event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw snake
    gameState.snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#4ade80' : '#22c55e'; // Head brighter
      ctx.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    });

    // Draw food
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(
      gameState.food.x * CELL_SIZE + 2,
      gameState.food.y * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4
    );
  }, [gameState.snake, gameState.food]);

  // Game controls
  const startGame = () => {
    initAudioContext();
    setGameState(prev => ({
      ...prev,
      snake: [{ x: 10, y: 10 }],
      food: generateFood([{ x: 10, y: 10 }]),
      direction: 'RIGHT',
      nextDirection: 'RIGHT',
      score: 0,
      gameStatus: 'playing',
      speed: INITIAL_SPEED,
      level: 1
    }));
  };

  const pauseGame = () => {
    setGameState(prev => ({ 
      ...prev, 
      gameStatus: prev.gameStatus === 'paused' ? 'playing' : 'paused' 
    }));
  };

  const resetGame = () => {
    if (gameState.score > gameState.highScore) {
      localStorage.setItem('snakeHighScore', gameState.score.toString());
    }
    setGameState(prev => ({ ...prev, gameStatus: 'menu' }));
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <h1 className="text-4xl md:text-6xl font-bold text-green-400 mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
          SNAKE
        </h1>
        <p className="text-gray-400 text-sm md:text-base">Classic arcade action with modern controls</p>
      </div>

      {/* Game Stats */}
      <div className="flex flex-wrap justify-center gap-6 mb-6 text-center">
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <div className="text-green-400 font-bold">SCORE</div>
          <div className="text-2xl text-white">{gameState.score}</div>
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <div className="text-yellow-400 font-bold">HIGH SCORE</div>
          <div className="text-2xl text-white">{gameState.highScore}</div>
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <div className="text-blue-400 font-bold">LEVEL</div>
          <div className="text-2xl text-white">{gameState.level}</div>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative mb-6">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-gray-600 rounded-lg bg-gray-800 max-w-full h-auto"
          style={{ maxWidth: '100vw', maxHeight: '60vh' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />

        {/* Game Status Overlays */}
        {gameState.gameStatus === 'menu' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center rounded-lg">
            <div className="text-center text-white">
              <h2 className="text-3xl mb-4 font-bold">Ready to Play?</h2>
              <button
                onClick={startGame}
                className="bg-green-500 hover:bg-green-600 px-8 py-3 rounded-lg font-bold text-lg transition-colors"
              >
                START GAME
              </button>
              <div className="mt-4 text-sm text-gray-400">
                <p>Use Arrow Keys or WASD to move</p>
                <p>Space to pause • Swipe on mobile</p>
              </div>
            </div>
          </div>
        )}

        {gameState.gameStatus === 'paused' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center rounded-lg">
            <div className="text-center text-white">
              <h2 className="text-3xl mb-4 font-bold">PAUSED</h2>
              <button
                onClick={pauseGame}
                className="bg-yellow-500 hover:bg-yellow-600 px-8 py-3 rounded-lg font-bold text-lg transition-colors"
              >
                RESUME
              </button>
            </div>
          </div>
        )}

        {gameState.gameStatus === 'gameOver' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center rounded-lg">
            <div className="text-center text-white">
              <h2 className="text-3xl mb-4 font-bold text-red-400">GAME OVER</h2>
              <div className="mb-4">
                <p className="text-xl">Final Score: <span className="text-green-400">{gameState.score}</span></p>
                {gameState.score === gameState.highScore && gameState.score > 0 && (
                  <p className="text-yellow-400 mt-2">NEW HIGH SCORE!</p>
                )}
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={startGame}
                  className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  PLAY AGAIN
                </button>
                <button
                  onClick={resetGame}
                  className="bg-gray-500 hover:bg-gray-600 px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  MAIN MENU
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Controls */}
      {gameState.gameStatus === 'playing' && (
        <div className="flex gap-4 mb-4">
          <button
            onClick={pauseGame}
            className="bg-yellow-500 hover:bg-yellow-600 px-6 py-2 rounded-lg font-bold transition-colors"
          >
            PAUSE
          </button>
          <button
            onClick={resetGame}
            className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded-lg font-bold transition-colors"
          >
            QUIT
          </button>
        </div>
      )}

      {/* Mobile Controls Help */}
      <div className="text-center text-gray-500 text-sm max-w-md">
        <p className="mb-2"><strong>Desktop:</strong> Arrow Keys or WASD to move, Space to pause</p>
        <p><strong>Mobile:</strong> Swipe in any direction to control the snake</p>
      </div>
    </div>
  );
};

export default SnakeGame;