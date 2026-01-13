import React from 'react';
import { CITIES } from '../../data/cities';
import { City } from '../../types';
import { THEME } from '../../constants';

interface CitySelectViewProps {
  onCitySelect: (city: City) => void;
  onBack: () => void;
}

export const CitySelectView: React.FC<CitySelectViewProps> = ({ onCitySelect, onBack }) => {
  return (
    <div className="fixed inset-0 bg-[#1A1A1A] p-24 text-white overflow-y-auto">
      <div className="flex justify-between items-center mb-16">
        <h2 className="text-8xl font-black opacity-20 uppercase tracking-tighter">Cities</h2>
        <button onClick={onBack} className="text-xl font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all">Back</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 pb-20">
        {CITIES.map(city => (
          <div key={city.id} onClick={() => onCitySelect(city)} className="cursor-pointer group">
            <h3 className="text-5xl font-black uppercase tracking-tighter mb-6 group-hover:text-blue-400 transition-colors">{city.name}</h3>
            <div className="aspect-square bg-white/5 border border-white/10 relative overflow-hidden p-8 transition-all group-hover:border-white/30">
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEME.lineColors[0] }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEME.lineColors[1] }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEME.lineColors[2] }} />
              </div>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Difficulty: {Math.floor(city.difficulty * 10)}/10.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
