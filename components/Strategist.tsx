
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface Suggestion {
  lineStations: number[];
  rationale: string;
}

interface StrategistSnapshot {
  stations: Array<{
    id: number;
    name: string;
    type: string;
    x: number;
    y: number;
    waitingCount: number;
  }>;
  lines: Array<{
    id: number;
    stations: number[];
  }>;
}

interface StrategistProps {
  snapshot: StrategistSnapshot;
  onClose: () => void;
}

export const Strategist: React.FC<StrategistProps> = ({ snapshot, onClose }) => {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggestLine = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `You are a specialized Transit Planning AI. 
      Analyze this network snapshot (stations and existing lines).
      Find the most efficient new route to connect high-load stations or provide missing geometric connections.
      Suggest exactly ONE new line as an ordered list of existing station IDs.
      
      SNAPSHOT:
      ${JSON.stringify(snapshot)}

      Respond strictly as a JSON object: { "lineStations": number[], "rationale": string }.`;

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
                description: "Array of existing station IDs in order."
              },
              rationale: {
                type: Type.STRING,
                description: "Concise engineering rationale for this suggestion."
              }
            },
            required: ["lineStations", "rationale"]
          }
        },
      });

      const text = response.text;
      if (!text) throw new Error("Advisor system offline.");
      
      const result = JSON.parse(text) as Suggestion;
      setSuggestion(result);
    } catch (err: any) {
      console.error(err);
      setError("Strategic calculation failed. Connection error.");
    } finally {
      setLoading(false);
    }
  };

  const getStationName = (id: number) => snapshot.stations.find(s => s.id === id)?.name || `Station ${id}`;

  return (
    <div className="fixed right-8 top-32 z-[100] w-80 bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
      <div className="flex justify-between items-center border-b-2 border-black pb-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-black">Network Optimization</h3>
        <button onClick={onClose} className="text-xs font-black hover:text-red-500 text-black">✕</button>
      </div>

      {loading && (
        <div className="py-12 flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-[8px] font-black uppercase tracking-widest text-black animate-pulse">Computing Flow...</span>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-[9px] font-bold uppercase leading-tight p-3 border border-red-600 bg-red-50">
          {error}
        </div>
      )}

      {suggestion && !loading && (
        <div className="flex flex-col gap-4">
          <div className="bg-black text-white p-4 border border-black">
            <h4 className="text-[7px] font-black uppercase tracking-[0.2em] mb-2 opacity-40">Proposed Link</h4>
            <p className="text-[11px] font-black leading-tight uppercase">
              {suggestion.lineStations.length > 0 
                ? suggestion.lineStations.map(getStationName).join(' → ')
                : "No valid path identified."}
            </p>
          </div>
          <div className="p-1">
            <h4 className="text-[7px] font-black uppercase tracking-[0.2em] mb-1 text-black/40">Rationale</h4>
            <p className="text-[10px] font-bold leading-relaxed text-black">
              {suggestion.rationale}
            </p>
          </div>
        </div>
      )}

      {!suggestion && !loading && !error && (
        <div className="py-6 flex flex-col items-center justify-center border border-dashed border-black/20">
          <span className="text-[8px] font-black uppercase text-black/30 tracking-widest">Awaiting Analysis</span>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <button 
          onClick={handleSuggestLine}
          disabled={loading}
          className="w-full bg-black text-white px-4 py-4 text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-black transition-all active:translate-x-1 active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Suggest Expansion Line'}
        </button>
        <p className="text-[6px] font-bold text-black/40 uppercase text-center tracking-[0.2em]">Consulting Transit AI Advisor</p>
      </div>
    </div>
  );
};
