import React, { useState } from 'react';
import { PlasticItem } from '../types';
import { getBiomeImpactAnalysis } from '../services/geminiService';
import { Loader2, X, AlertTriangle, Clock, Fish } from 'lucide-react';

interface Props {
  items: PlasticItem[];
}

const ImpactGallery: React.FC<Props> = ({ items }) => {
  const [selectedItem, setSelectedItem] = useState<PlasticItem | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleItemClick = async (item: PlasticItem) => {
    setSelectedItem(item);
    setLoading(true);
    const analysis = await getBiomeImpactAnalysis(item.name);
    setAiAnalysis(analysis);
    setLoading(false);
  };

  const closeOverlay = () => {
    setSelectedItem(null);
    setAiAnalysis('');
  };

  return (
    <div className="p-4 animate-fade-in relative">
      <h2 className="text-3xl font-bold text-white mb-6">The Culprits</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div 
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="group relative overflow-hidden bg-slate-800 rounded-xl p-4 cursor-pointer hover:-translate-y-1 transition-transform border border-slate-700 hover:border-blue-400"
          >
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <InfoIcon />
            </div>
            <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
            <h3 className="font-bold text-slate-200">{item.name}</h3>
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
               <Clock size={12} /> {item.lifespanYears} years
            </div>
          </div>
        ))}
      </div>

      {/* Detail Overlay */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="relative h-32 bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center">
              <button onClick={closeOverlay} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors">
                <X className="text-white" />
              </button>
              <div className="text-6xl animate-bounce-slow">{selectedItem.icon}</div>
            </div>
            
            <div className="p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">{selectedItem.name}</h2>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  selectedItem.impactLevel === 'Critical' ? 'bg-red-500/20 text-red-300' : 'bg-orange-500/20 text-orange-300'
                }`}>
                  {selectedItem.impactLevel} Impact
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-slate-800/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                       <Clock size={14} /> Time to Degrade
                    </div>
                    <div className="text-lg font-mono text-white">{selectedItem.lifespanYears} Years</div>
                 </div>
                 <div className="bg-slate-800/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                       <AlertTriangle size={14} /> Biome Threat
                    </div>
                    <div className="text-lg font-mono text-white">{selectedItem.commonBiome}</div>
                 </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                  <Fish size={16} /> AI Biome Analysis
                </h4>
                <div className="bg-slate-800/30 p-4 rounded-xl text-sm text-slate-300 leading-relaxed min-h-[100px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-blue-400">
                      <Loader2 className="animate-spin mr-2" /> Analyzing ecosystem impact...
                    </div>
                  ) : (
                    aiAnalysis
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoIcon = () => (
  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default ImpactGallery;
