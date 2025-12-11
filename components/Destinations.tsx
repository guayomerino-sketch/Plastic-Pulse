import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Fish, Skull, Utensils } from 'lucide-react';

const data = [
  { name: 'Landfill', value: 79, color: '#475569' },
  { name: 'Incinerated', value: 12, color: '#ef4444' },
  { name: 'Recycled', value: 9, color: '#22c55e' },
];

const oceanData = [
  { name: 'Shoreline', value: 45 },
  { name: 'Ocean Surface', value: 15 },
  { name: 'Sea Floor', value: 40 },
];

const Destinations: React.FC = () => {
  return (
    <div className="p-4 space-y-12 animate-fade-in pb-20">
      <div className="text-center">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 mb-4">
          The Plastic Odyssey
        </h2>
        <p className="text-slate-300 max-w-2xl mx-auto text-lg">
          It doesn't disappear. It just travels. See where it goes.
        </p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Global Fate */}
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 backdrop-blur-sm hover:border-blue-500/30 transition-colors">
          <h3 className="text-xl font-bold mb-4 text-slate-200">Where Does It All Go?</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4 text-sm font-medium">
            {data.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-lg shadow-white/10" style={{ backgroundColor: item.color }}></div>
                <span className="text-slate-300">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ocean Distribution */}
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 backdrop-blur-sm hover:border-blue-500/30 transition-colors">
          <h3 className="text-xl font-bold mb-4 text-blue-200">The Hidden Ocean Iceberg</h3>
          <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={oceanData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} tick={{fill: '#cbd5e1', fontSize: 12}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[0, 8, 8, 0]} barSize={30}>
                    {oceanData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 2 ? '#1e3a8a' : index === 1 ? '#0ea5e9' : '#38bdf8'} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center italic">
            Most ocean plastic isn't floating islands—it's a smog on the seafloor.
          </p>
        </div>
      </div>

      {/* Bio-accumulation Section */}
      <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/20 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <h3 className="text-2xl font-black text-red-200 mb-8 text-center">The Cycle of Doom</h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
          {/* Step 1 */}
          <div className="flex-1 text-center group">
            <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-black/20 group-hover:-translate-y-2 transition-transform duration-300">
              <span className="text-4xl">🥤</span>
            </div>
            <h4 className="font-bold text-slate-200">Microplastics</h4>
            <p className="text-xs text-slate-400 mt-2">Plastics break down into tiny invisible particles in the ocean.</p>
          </div>

          <div className="hidden md:block h-1 flex-1 bg-gradient-to-r from-slate-700 to-red-900/50 rounded-full relative">
            <div className="absolute right-0 -top-1.5 w-3 h-3 bg-red-500/50 rounded-full animate-ping"></div>
          </div>

          {/* Step 2 */}
          <div className="flex-1 text-center group">
             <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-black/20 group-hover:-translate-y-2 transition-transform duration-300 relative">
               <Fish size={40} className="text-blue-400" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-1 h-1 bg-white rounded-full translate-x-2 translate-y-1 opacity-70"></div>
                 <div className="w-1 h-1 bg-white rounded-full -translate-x-1 -translate-y-1 opacity-70"></div>
               </div>
             </div>
            <h4 className="font-bold text-slate-200">Consumption</h4>
            <p className="text-xs text-slate-400 mt-2">Fish and plankton mistake these particles for food.</p>
          </div>

          <div className="hidden md:block h-1 flex-1 bg-gradient-to-r from-red-900/50 to-red-500 rounded-full relative">
             <div className="absolute right-0 -top-1.5 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
          </div>

          {/* Step 3 */}
          <div className="flex-1 text-center group">
             <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-black/20 group-hover:-translate-y-2 transition-transform duration-300 relative border border-red-500/30">
               <Utensils size={32} className="text-red-400 absolute top-2 right-2" />
               <Skull size={40} className="text-slate-500" />
             </div>
            <h4 className="font-bold text-red-300">Bio-accumulation</h4>
            <p className="text-xs text-slate-400 mt-2">The plastic ends up on your plate. We eat a credit card's worth of plastic a week.</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Destinations;
