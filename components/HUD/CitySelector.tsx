
import React from 'react';
// Fix: CITIES is located in data/cities.ts, not types.ts.
import { City } from '../../types';
import { CITIES } from '../../data/cities';

interface CitySelectorProps {
  currentCity: City;
  onCityChange: (city: City) => void;
}

export const CitySelector: React.FC<CitySelectorProps> = ({ currentCity, onCityChange }) => {
  return (
    <div className="flex gap-2 bg-white/60 backdrop-blur p-1 rounded-full border border-black/5 self-start shadow-sm max-w-[500px] overflow-x-auto no-scrollbar pointer-events-auto">
      {CITIES.map(c => (
        <button 
          key={c.id} 
          onClick={() => onCityChange(c)} 
          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${currentCity.id === c.id ? 'bg-[#2F3436] text-white shadow-md' : 'text-[#2F3436]/40 hover:text-[#2F3436]'}`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
};
