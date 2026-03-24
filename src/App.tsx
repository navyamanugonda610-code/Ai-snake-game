/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RefreshCw, Music, Trophy } from 'lucide-react';

// --- Constants ---
const GRID_SIZE = 20;
const GAME_SPEED = 120;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };

const TRACKS = [
  { id: 1, title: "Neon Dreams (AI Gen)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, title: "Cyberpunk City (AI Gen)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: 3, title: "Digital Horizon (AI Gen)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
];

// --- Helpers ---
const generateFood = (snake: { x: number, y: number }[]) => {
  let newFood;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      break;
    }
  }
  return newFood;
};

export default function App() {
  // --- Game State ---
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Refs for game loop to avoid dependency issues
  const directionRef = useRef(direction);
  const lastMoveDirectionRef = useRef(direction);
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const gameOverRef = useRef(gameOver);
  const isPausedRef = useRef(isPaused);
  const gameStartedRef = useRef(gameStarted);

  // --- Music Player State ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);

  // --- Sync Refs ---
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { gameStartedRef.current = gameStarted; }, [gameStarted]);

  // --- Game Loop ---
  useEffect(() => {
    const moveSnake = () => {
      if (gameOverRef.current || isPausedRef.current || !gameStartedRef.current) return;

      const currentSnake = snakeRef.current;
      const head = currentSnake[0];
      const dir = directionRef.current;
      lastMoveDirectionRef.current = dir; // Store the actual direction moved

      const newHead = { x: head.x + dir.x, y: head.y + dir.y };

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true);
        return;
      }

      // Self collision
      if (currentSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return;
      }

      const newSnake = [newHead, ...currentSnake];
      const currentFood = foodRef.current;

      // Food collision
      if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
        setScore(s => {
          const newScore = s + 10;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      setSnake(newSnake);
    };

    const intervalId = setInterval(moveSnake, GAME_SPEED);
    return () => clearInterval(intervalId);
  }, [highScore]);

  // --- Keyboard Controls ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ') {
        if (!gameStartedRef.current) {
          startGame();
        } else if (!gameOverRef.current) {
          setIsPaused(p => !p);
        }
        return;
      }

      if (!gameStartedRef.current || gameOverRef.current || isPausedRef.current) return;

      const dir = lastMoveDirectionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Game Actions ---
  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(generateFood(INITIAL_SNAKE));
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setGameStarted(true);
    
    // Auto-play music on first interaction if not playing
    if (!isPlaying && audioRef.current) {
      togglePlay();
    }
  };

  // --- Music Player Actions ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentTrackIndex, isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const handleTrackEnd = () => {
    nextTrack();
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 md:p-8 font-mono text-white selection:bg-green-500/30">
      
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.6)] uppercase tracking-wider">
            Neon Snake
          </h1>
          <p className="text-cyan-500/80 text-sm mt-1 flex items-center gap-2">
            <Music size={14} /> Beats Edition
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className="bg-gray-900/80 border border-green-500/30 px-4 py-2 rounded-lg shadow-[0_0_10px_rgba(34,197,94,0.15)]">
            <div className="text-xs text-green-500/70 uppercase tracking-widest mb-1">Score</div>
            <div className="text-2xl font-bold text-green-400 leading-none">{score}</div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative w-full max-w-md aspect-square bg-gray-950 border border-gray-800 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-white/5">
        
        {/* Grid Background (Subtle) */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, #39ff14 1px, transparent 1px), linear-gradient(to bottom, #39ff14 1px, transparent 1px)`,
            backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
          }}
        />

        {/* Snake */}
        {snake.map((segment, index) => {
          const isHead = index === 0;
          return (
            <div
              key={`${segment.x}-${segment.y}-${index}`}
              className="absolute rounded-sm transition-all duration-75"
              style={{
                left: `${segment.x * (100 / GRID_SIZE)}%`,
                top: `${segment.y * (100 / GRID_SIZE)}%`,
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
                backgroundColor: isHead ? '#39ff14' : '#22c55e',
                boxShadow: isHead ? '0 0 10px #39ff14, 0 0 20px #39ff14' : '0 0 5px #22c55e',
                zIndex: isHead ? 10 : 5,
                transform: 'scale(0.9)'
              }}
            />
          );
        })}

        {/* Food */}
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${food.x * (100 / GRID_SIZE)}%`,
            top: `${food.y * (100 / GRID_SIZE)}%`,
            width: `${100 / GRID_SIZE}%`,
            height: `${100 / GRID_SIZE}%`,
            backgroundColor: '#ff00ff',
            boxShadow: '0 0 10px #ff00ff, 0 0 20px #ff00ff',
            transform: 'scale(0.8)'
          }}
        />

        {/* Overlays */}
        {!gameStarted && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <Trophy className="text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" size={48} />
            <p className="text-gray-400 mb-6 uppercase tracking-widest text-sm">High Score: {highScore}</p>
            <button 
              onClick={startGame}
              className="px-8 py-3 bg-transparent border-2 border-green-500 text-green-400 font-bold uppercase tracking-widest rounded-full hover:bg-green-500 hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.8)]"
            >
              Start Game
            </button>
            <p className="text-gray-500 mt-6 text-xs uppercase tracking-widest">Use Arrow Keys or WASD</p>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20">
            <h2 className="text-4xl font-bold text-red-500 mb-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] uppercase tracking-wider">Game Over</h2>
            <p className="text-red-300/80 mb-8 uppercase tracking-widest text-sm">Final Score: {score}</p>
            <button 
              onClick={startGame}
              className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500 text-red-400 font-bold uppercase tracking-widest rounded-full hover:bg-red-500 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]"
            >
              <RefreshCw size={18} /> Play Again
            </button>
          </div>
        )}

        {isPaused && !gameOver && gameStarted && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <h2 className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] uppercase tracking-wider">Paused</h2>
            <p className="text-cyan-500/60 mt-4 text-xs uppercase tracking-widest">Press Space to Resume</p>
          </div>
        )}
      </div>

      {/* Music Player */}
      <div className="mt-8 w-full max-w-md bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Decorative glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <audio 
          ref={audioRef} 
          src={TRACKS[currentTrackIndex].url} 
          onEnded={handleTrackEnd}
          preload="auto"
        />

        <div className="flex flex-col gap-5 relative z-10">
          
          {/* Track Info */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-pink-500/20 border border-white/10 ${isPlaying ? 'animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.3)]' : ''}`}>
              <Music className={isPlaying ? 'text-cyan-400' : 'text-gray-500'} size={24} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Now Playing</p>
              <div className="relative w-full overflow-hidden whitespace-nowrap">
                <p className={`text-sm font-bold text-white truncate ${isPlaying ? 'text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : ''}`}>
                  {TRACKS[currentTrackIndex].title}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            
            {/* Volume Control */}
            <div className="flex items-center gap-2 w-1/4">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="text-gray-400 hover:text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (parseFloat(e.target.value) > 0) setIsMuted(false);
                }}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-6">
              <button 
                onClick={prevTrack}
                className="text-gray-400 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all"
              >
                <SkipBack size={24} />
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center bg-cyan-500/10 border border-cyan-500/50 rounded-full text-cyan-400 hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] transition-all duration-300"
              >
                {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
              </button>
              
              <button 
                onClick={nextTrack}
                className="text-gray-400 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all"
              >
                <SkipForward size={24} />
              </button>
            </div>

            {/* Spacer to balance volume control */}
            <div className="w-1/4 flex justify-end">
               <span className="text-[10px] text-gray-600 uppercase tracking-widest">
                 {currentTrackIndex + 1} / {TRACKS.length}
               </span>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
