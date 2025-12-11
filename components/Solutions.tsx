import React, { useState } from 'react';
import { Package, Sprout, Droplets, RefreshCw, ShoppingBag, ChevronDown } from 'lucide-react';

const Solutions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'companies' | 'you'>('companies');

  return (
    <div className="p-4 animate-fade-in pb-24">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-500 mb-2">
          Be The Solution
        </h2>
        <p className="text-slate-300">The future is already here. We just need to distribute it.</p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="bg-slate-800 p-1 rounded-full flex gap-1 border border-slate-700">
          <button 
            onClick={() => setActiveTab('companies')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'companies' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            What Companies Can Do
          </button>
          <button 
             onClick={() => setActiveTab('you')}
             className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'you' ? 'bg-green-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            What You Can Do
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {activeTab === 'companies' ? (
          <>
            <SolutionCard 
              icon={<Sprout size={40} className="text-amber-400" />}
              title="Mushroom Packaging"
              color="border-amber-500/30 bg-amber-900/10"
              description="Using mycelium (mushroom roots) to grow custom packaging that is fully compostable at home in 30 days."
              stat="Replaces styrofoam entirely."
            />
            <SolutionCard 
              icon={<Droplets size={40} className="text-blue-400" />}
              title="Edible Water Pods"
              color="border-blue-500/30 bg-blue-900/10"
              description="Seaweed-based membranes that hold water. You can eat the packaging or let it biodegrade naturally."
              stat="Eliminates small bottles."
            />
            <SolutionCard 
              icon={<Package size={40} className="text-emerald-400" />}
              title="Circular Supply Chains"
              color="border-emerald-500/30 bg-emerald-900/10"
              description="Designing products where every part is returned, disassembled, and remade into new products."
              stat="Zero waste model."
            />
          </>
        ) : (
          <>
            <SolutionCard 
              icon={<RefreshCw size={40} className="text-teal-400" />}
              title="The Refill Revolution"
              color="border-teal-500/30 bg-teal-900/10"
              description="Don't buy new bottles. Find stores with bulk bins and bring your own glass jars for pasta, soap, and grains."
              stat="Saves 500+ items/year."
            />
            <SolutionCard 
              icon={<ShoppingBag size={40} className="text-purple-400" />}
              title="Refuse the Bag"
              color="border-purple-500/30 bg-purple-900/10"
              description="Keep a tote bag in your backpack or car. It's the easiest habit to build that has massive visibility."
              stat="Average usage: 12 mins."
            />
             <SolutionCard 
              icon={<Sprout size={40} className="text-green-400" />}
              title="Vote With Your Wallet"
              color="border-green-500/30 bg-green-900/10"
              description="Stop buying brands that wrap fruit in plastic. Write emails to companies. Consumer pressure works."
              stat="Force systemic change."
            />
          </>
        )}
      </div>
      
      <div className="mt-12 text-center">
         <div className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 p-[1px] rounded-2xl">
            <div className="bg-slate-900 rounded-2xl p-6 max-w-2xl">
               <h3 className="font-bold text-white mb-2">Did you know?</h3>
               <p className="text-slate-300 text-sm">
                  We have produced more plastic in the last 10 years than in the whole of the last century. 
                  <span className="text-indigo-400 font-bold"> Change starts with awareness.</span>
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

const SolutionCard: React.FC<{icon: React.ReactNode, title: string, description: string, stat: string, color: string}> = ({ icon, title, description, stat, color }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div 
      className={`relative h-64 cursor-pointer group perspective-1000`}
      onClick={() => setFlipped(!flipped)}
    >
      <div className={`w-full h-full duration-500 preserve-3d transition-all ${flipped ? 'rotate-y-180' : ''} relative`}>
        
        {/* Front */}
        <div className={`absolute inset-0 backface-hidden ${color} border backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center text-center hover:-translate-y-2 transition-transform`}>
          <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
            Tap to learn more <ChevronDown size={12} />
          </p>
        </div>

        {/* Back */}
        <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-slate-800 border border-slate-600 rounded-3xl p-6 flex flex-col justify-center text-center`}>
          <h3 className="font-bold text-white mb-3">{title}</h3>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">{description}</p>
          <div className="mt-auto pt-4 border-t border-slate-700">
             <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Impact</span>
             <p className="font-bold text-white">{stat}</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Solutions;
