
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { GameState } from '../types';

interface Suggestion {
  lineStations: number[];
  rationale: string;
}

interface StrategistProps {
  gameState: GameState;
  onClose: () => void;
}

export const Strategist: React.FC<StrategistProps> = ({ gameState, onClose }) => {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggestLine = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Minimal snapshot for the AI to process the graph and load
      const simplifiedState = {
        stations: gameState.stations.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          load: s.waitingPassengers.length,
          timer: s.timer
        })),
        lines: gameState.lines.map(l => ({
          id: l.id,
          stations: l.stations
        }))
      };

      const prompt = `You are a professional transit network engineer. 
      Analyze the current Mini Metro network state provided in JSON format.
      Identify bottlenecks and overloaded stations (high timer/load).
      Suggest exactly ONE new transit line as an ordered list of existing station IDs to drastically improve system throughput.
      
      NETWORK STATE:
      ${JSON.stringify(simplifiedState)}

      Return the suggestion strictly in JSON format.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lineStations: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: "An ordered array of existing station IDs for the proposed line."
              },
              rationale: {
                type: Type.STRING,
                description: "A professional explanation of why this specific route was selected."
              }
            },
            required: ["lineStations", "rationale"]
          }
        },
      });

      const text = response.text;
      if (!text) throw new Error("Invalid response from Advisor.");
      
      const result = JSON.parse(text) as Suggestion;
      setSuggestion(result);
    } catch (err: any) {
      console.error(err);
      setError("Strategic link failed. Re-verify network integrity.");
    } finally {
      setLoading(false);
    }
  };

  const getStationName = (id: number) => gameState.stations.find(s => s.id === id)?.name || `Station ${id}`;

  return (
    <div className="fixed right-8 top-32 z-[100] w-80 bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-sm flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
      <div className="flex justify-between items-center border-b-2 border-black pb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-black">Strategic Pipeline</h3>
        <button onClick={onClose} className="text-xs font-black hover:text-red-500 text-black">✕</button>
      </div>

      {loading && (
        <div className="py-12 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-[9px] font-black uppercase text-black tracking-widest animate-pulse">Running Simulation...</span>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-[10px] font-bold uppercase leading-relaxed p-3 border-2 border-red-600 bg-red-50">
          {error}
        </div>
      )}

      {suggestion && !loading && (
        <div className="flex flex-col gap-5">
          <div className="bg-black text-white p-4">
            <h4 className="text-[7px] font-black uppercase tracking-[0.2em] mb-3 opacity-50">Recommended Route</h4>
            <p className="text-[12px] font-black leading-tight tracking-tight uppercase">
              {suggestion.lineStations.length > 0 
                ? suggestion.lineStations.map(getStationName).join(' → ')
                : "No viable path discovered."}
            </p>
          </div>
          <div>
            <h4 className="text-[7px] font-black uppercase tracking-[0.2em] mb-2 text-black/40">Technical Rationale</h4>
            <p className="text-[11px] font-bold leading-relaxed text-black">
              {suggestion.rationale}
            </p>
          </div>
        </div>
      )}

      {!suggestion && !loading && !error && (
        <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-black/10">
          <span className="text-[10px] font-bold uppercase text-black/30 tracking-widest">Awaiting Analysis Request</span>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-4 border-t border-black/10">
        <button 
          onClick={handleSuggestLine}
          disabled={loading}
          className="w-full bg-black text-white px-4 py-4 text-[10px] font-black uppercase hover:bg-[#2ECC71] hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : suggestion ? 'Re-Evaluate Topology' : 'Suggest Expansion Line'}
        </button>
        <p className="text-[7px] font-bold text-black/30 uppercase text-center tracking-widest">AI Assisted Network Optimization</p>
      </div>
    </div>
  );
};
