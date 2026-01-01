import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { GameState } from '../types';

interface StrategistProps {
  gameState: GameState;
  onClose: () => void;
}

export const Strategist: React.FC<StrategistProps> = ({ gameState, onClose }) => {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Simplify game state for the prompt to save tokens and focus the model
      const simplifiedState = {
        score: gameState.score,
        level: gameState.level,
        stations: gameState.stations.map(s => ({
          name: s.name,
          type: s.type,
          load: s.waitingPassengers.length,
          timer: s.timer
        })),
        lines: gameState.lines.map(l => ({
          id: l.id,
          stationCount: l.stations.length,
          trains: l.trains.length
        })),
        resources: gameState.resources
      };

      const prompt = `Analyze this Mini Metro game state and suggest 3 strategic improvements. Be concise, expert, and encouraging.
      Current State: ${JSON.stringify(simplifiedState)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        },
      });

      setAdvice(response.text || "I'm thinking... but nothing came to mind. Try again later!");
    } catch (err: any) {
      console.error(err);
      setError("Strategic link interrupted. Ensure your system is online.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeGame();
  }, []);

  return (
    <div className="fixed right-8 top-32 z-[100] w-80 bg-white/95 backdrop-blur-lg border-2 border-black p-6 shadow-2xl rounded-sm flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
      <div className="flex justify-between items-center border-b-2 border-black pb-2">
        <h3 className="text-xs font-black uppercase tracking-widest">Strategic Advisor</h3>
        <button onClick={onClose} className="text-xs font-black hover:text-red-500">✕</button>
      </div>

      {loading && (
        <div className="py-8 flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-black uppercase opacity-40">Analyzing Network...</span>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-[10px] font-bold uppercase leading-relaxed">
          {error}
        </div>
      )}

      {advice && !loading && (
        <div className="text-[11px] font-medium leading-relaxed prose prose-sm max-h-[400px] overflow-y-auto no-scrollbar">
          {advice.split('\n').map((line, i) => (
            <p key={i} className="mb-2">{line}</p>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-black/5">
        <button 
          onClick={analyzeGame}
          disabled={loading}
          className="bg-black text-white px-4 py-2 text-[9px] font-black uppercase hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          Re-Analyze
        </button>
      </div>
    </div>
  );
};