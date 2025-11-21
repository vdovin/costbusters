
import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameState } from './types';
import { Play, RotateCcw, Coins, Trophy, Info } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const startGame = () => {
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (finalScore: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }
  };

  return (
    <div className="min-h-screen bg-sky-200 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl aspect-video bg-white rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.2)] overflow-hidden border-8 border-white">
        
        {/* The Game Layer */}
        <GameCanvas 
          gameState={gameState} 
          setGameState={setGameState} 
          setScore={setScore}
          setDistance={setDistance}
          onGameOver={handleGameOver}
        />

        {/* UI Overlay: HUD (Always visible during play) */}
        {gameState === GameState.PLAYING && (
          <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-yellow-500 font-bold text-2xl drop-shadow-sm pixel-font">
                <Coins className="w-8 h-8 fill-yellow-500" />
                <span>${score}</span>
                </div>
                <div className="text-slate-600 text-sm font-mono font-bold bg-white/80 px-2 py-1 rounded">
                    ДИСТАНЦИЯ: {distance}м
                </div>
            </div>
            
            <div className="flex flex-col items-end gap-1 opacity-70 hidden sm:flex">
                <div className="text-slate-700 text-xs bg-white/50 px-2 py-1 rounded border border-white">
                    [SPACE] Прыжок
                </div>
                <div className="text-slate-700 text-xs bg-white/50 px-2 py-1 rounded border border-white">
                    [F] или [ENTER] Выстрел
                </div>
            </div>
            {/* Mobile Attack Button (Overlay) */}
            <div className="absolute bottom-6 right-6 pointer-events-auto sm:hidden">
                 <button 
                    className="w-16 h-16 bg-red-500 rounded-full border-4 border-red-700 active:scale-95 flex items-center justify-center text-white font-bold shadow-lg"
                    onClick={(e) => {
                        e.stopPropagation(); // prevent jump trigger from canvas touch
                        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
                    }}
                 >
                    FIRE
                 </button>
            </div>
          </div>
        )}

        {/* UI Overlay: Main Menu */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 bg-sky-900/80 flex flex-col items-center justify-center text-center p-8 backdrop-blur-sm z-10">
            <div className="mb-8 animate-bounce">
                <h1 className="text-6xl md:text-8xl font-black text-white stroke-2 stroke-black pixel-font tracking-tighter drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]">
                COST<br/>BUSTERS
                </h1>
            </div>
            
            <p className="text-sky-100 text-lg mb-8 max-w-md leading-relaxed font-bold">
              Помоги Славе собрать зарплату, уничтожить расходы и перепрыгнуть долги!
            </p>

            <div className="bg-sky-800/50 p-6 rounded-lg border border-sky-700/50 mb-8 max-w-sm w-full">
                <h3 className="text-sky-200 text-sm font-bold mb-4 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Info className="w-4 h-4"/> Управление
                </h3>
                <div className="grid grid-cols-2 gap-4 text-left text-sm">
                    <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-sky-950 rounded border-b-2 border-sky-900 font-mono text-white">SPACE</kbd>
                        <span className="text-sky-100">Прыжок</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-sky-950 rounded border-b-2 border-sky-900 font-mono text-white">F</kbd>
                        <span className="text-sky-100">Выстрел</span>
                    </div>
                </div>
            </div>

            <button 
              onClick={startGame}
              className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-yellow-500 font-lg rounded-full hover:bg-yellow-400 hover:scale-105 hover:shadow-[0_0_20px_rgba(234,179,8,0.5)] focus:outline-none ring-offset-2 focus:ring-2 ring-yellow-400 text-shadow"
            >
              <Play className="w-6 h-6 mr-2 fill-current" />
              НАЧАТЬ ИГРУ
            </button>
          </div>
        )}

        {/* UI Overlay: Game Over */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-center p-8 backdrop-blur-md z-10">
            <h2 className="text-5xl font-black text-white mb-2 pixel-font tracking-widest drop-shadow-md">
              БАНКРОТ!
            </h2>
            <p className="text-slate-300 text-xl mb-8">Денег нет, но вы держитесь...</p>
            
            <div className="flex gap-8 mb-8">
                <div className="flex flex-col items-center bg-white/10 p-4 rounded-lg min-w-[120px]">
                    <span className="text-sky-300 text-xs font-bold uppercase mb-1">Твой Счёт</span>
                    <span className="text-4xl font-bold text-white pixel-font">${score}</span>
                </div>
                <div className="flex flex-col items-center bg-white/10 p-4 rounded-lg min-w-[120px]">
                     <span className="text-yellow-500 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3"/> Рекорд
                     </span>
                    <span className="text-4xl font-bold text-yellow-400 pixel-font">${highScore}</span>
                </div>
            </div>

            <button 
              onClick={() => {
                  setScore(0);
                  setDistance(0);
                  setGameState(GameState.PLAYING);
              }}
              className="group inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-blue-600 hover:bg-blue-500 rounded-full hover:scale-105 shadow-lg"
            >
              <RotateCcw className="w-6 h-6 mr-2 group-hover:-rotate-180 transition-transform duration-500" />
              ПОПРОБОВАТЬ СНОВА
            </button>
          </div>
        )}
      </div>
    </div>
  );
}