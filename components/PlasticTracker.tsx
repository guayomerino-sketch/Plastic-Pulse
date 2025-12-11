import React, { useState, useRef } from 'react';
import { PlasticItem } from '../types';
import { Plus, Minus, Camera, Sparkles, ScanLine, Loader2, ArrowRight } from 'lucide-react';
import { analyzePlasticImage } from '../services/geminiService';

interface Props {
  items: PlasticItem[];
  onLogItem: (item: PlasticItem, action: 'refuse' | 'use') => void;
  userStats: any;
}

const PlasticTracker: React.FC<Props> = ({ items, onLogItem, userStats }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{name: string, alternative: string, fact: string} | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPreviewUrl(base64);
      const result = await analyzePlasticImage(base64);
      setAnalysisResult(result);
      setAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 animate-fade-in pb-20">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-blue-400 to-purple-400 drop-shadow-sm">
          Track The Trash
        </h2>
        <p className="text-blue-200 font-medium">Log your battles or scan a new enemy!</p>
      </div>

      {/* AI Scanner Section */}
      <div className="mb-12 bg-gradient-to-br from-indigo-900/80 to-purple-900/80 p-1 rounded-3xl shadow-2xl shadow-purple-500/20 transform hover:scale-[1.01] transition-transform">
        <div className="bg-slate-900/90 rounded-[22px] p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 space-y-4 text-center md:text-left">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
                 <Sparkles size={14} /> AI Powered
               </div>
               <h3 className="text-2xl font-bold text-white">Identify a Plastic Monster</h3>
               <p className="text-slate-400 text-sm">Upload a photo of a plastic item. Our AI will identify it, calculate its impact, and tell you how to replace it!</p>
               
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={analyzing}
                 className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 mx-auto md:mx-0 w-full md:w-auto"
               >
                 {analyzing ? <Loader2 className="animate-spin" /> : <Camera />}
                 {analyzing ? 'Scanning...' : 'Upload Photo'}
               </button>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept="image/*" 
                 onChange={handleFileUpload}
               />
            </div>

            {/* Results / Preview Area */}
            <div className="flex-1 w-full flex justify-center">
              {previewUrl ? (
                <div className="relative w-full max-w-sm bg-black/50 rounded-xl overflow-hidden border border-purple-500/30">
                  <img src={previewUrl} alt="Upload" className="w-full h-48 object-cover opacity-80" />
                  {analyzing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                       <ScanLine className="text-purple-400 animate-pulse w-12 h-12" />
                    </div>
                  )}
                  {analysisResult && (
                    <div className="p-4 bg-slate-800/90 backdrop-blur-md border-t border-purple-500/30">
                      <h4 className="font-bold text-lg text-white mb-1">{analysisResult.name}</h4>
                      <p className="text-xs text-red-300 mb-2">{analysisResult.fact}</p>
                      <div className="bg-green-500/20 p-2 rounded-lg border border-green-500/30">
                        <span className="text-xs text-green-300 font-bold block mb-1">BETTER CHOICE:</span>
                        <span className="text-sm text-white">{analysisResult.alternative}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-xs h-48 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-600">
                  <Camera size={32} className="mb-2 opacity-50" />
                  <span className="text-xs">No image selected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Regular Tracker Grid */}
      <h3 className="text-xl font-bold text-slate-300 mb-4">Quick Log</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className="relative bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 hover:bg-slate-800/80 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 group overflow-hidden">
            {/* 3D decorative bg */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-teal-500/10 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500"></div>

            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <span className="text-4xl filter drop-shadow-md transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">{item.icon}</span>
                <div>
                  <h3 className="font-bold text-slate-100">{item.name}</h3>
                  <span className="text-xs font-mono text-slate-400">{item.weightGrams}g</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 relative z-10 mt-2">
              <button
                onClick={() => onLogItem(item, 'use')}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-95"
              >
                <Minus size={14} strokeWidth={3} /> Used
              </button>
              <button
                onClick={() => onLogItem(item, 'refuse')}
                className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-95"
              >
                <Plus size={14} strokeWidth={3} /> Refused
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 bg-gradient-to-r from-blue-600/20 to-teal-400/20 p-1 rounded-2xl">
         <div className="bg-slate-900/90 backdrop-blur-xl p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
               <h3 className="text-lg font-bold text-blue-200">Daily Impact Score</h3>
               <p className="text-slate-400 text-sm">Keep your streak alive!</p>
            </div>
            <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200 drop-shadow-lg">
                  {userStats.totalWeightSavedGrams}
                </span>
                <span className="text-blue-400 font-bold mb-2">grams saved</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default PlasticTracker;
