import React from 'react';
import { UserStats } from '../types';
import { Trophy, Medal, Crown, TrendingUp, User } from 'lucide-react';

interface Props {
  userStats: UserStats;
}

const MOCK_LEADERS = [
  { id: 'p1', name: 'EcoWarrior_Jane', score: 15420, streak: 45, avatar: '🌿' },
  { id: 'p2', name: 'OceanSaver99', score: 12850, streak: 21, avatar: '🌊' },
  { id: 'p3', name: 'NoPlasticNick', score: 9200, streak: 12, avatar: '🐢' },
  { id: 'p4', name: 'GreenMachine', score: 8500, streak: 30, avatar: '♻️' },
  { id: 'p5', name: 'PlanetPatrol', score: 5400, streak: 5, avatar: '🌍' },
];

const Leaderboard: React.FC<Props> = ({ userStats }) => {
  // Merge current user into the list for display
  const allPlayers = [
    ...MOCK_LEADERS,
    { id: 'currentUser', name: 'YOU', score: userStats.totalWeightSavedGrams, streak: userStats.streakDays, avatar: '👤', isUser: true }
  ].sort((a, b) => b.score - a.score);

  return (
    <div className="p-4 animate-fade-in pb-24 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 mb-2 drop-shadow-sm">
          Global PlasticPulse
        </h2>
        <p className="text-slate-300">Top reducers making the biggest dent in pollution.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Top 3 Podium Cards */}
        {allPlayers.slice(0, 3).map((player, index) => (
          <div key={player.id} className={`relative flex flex-col items-center p-6 rounded-3xl border transform hover:-translate-y-2 transition-all duration-300 ${
             index === 0 ? 'bg-gradient-to-b from-yellow-500/20 to-amber-900/20 border-yellow-500/50 shadow-yellow-500/20 order-2 md:-mt-8 z-10' :
             index === 1 ? 'bg-slate-800/50 border-slate-500/50 order-1' :
             'bg-orange-900/20 border-orange-700/50 order-3'
          }`}>
             {index === 0 && <Crown className="text-yellow-400 mb-2 animate-bounce" size={32} />}
             <div className="text-4xl mb-2">{player.avatar}</div>
             <div className="font-bold text-xl text-white mb-1">{player.name}</div>
             <div className="text-2xl font-black text-white/90">{(player.score / 1000).toFixed(1)} kg</div>
             <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mt-1">Refused</div>
          </div>
        ))}
      </div>

      {/* List View */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-widest">
           <div className="col-span-2 text-center">Rank</div>
           <div className="col-span-5">Player</div>
           <div className="col-span-3 text-right">Impact</div>
           <div className="col-span-2 text-center">Streak</div>
        </div>
        
        {allPlayers.map((player, index) => (
           <div 
             key={player.id} 
             className={`grid grid-cols-12 gap-4 p-4 items-center border-b border-slate-800/50 last:border-0 hover:bg-white/5 transition-colors ${
               (player as any).isUser ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : ''
             }`}
           >
              <div className="col-span-2 text-center font-black text-lg text-slate-400">
                 {index + 1}
              </div>
              <div className="col-span-5 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-lg">
                    {player.avatar}
                 </div>
                 <span className={`font-bold ${(player as any).isUser ? 'text-blue-300' : 'text-slate-200'}`}>
                    {player.name}
                    {(player as any).isUser && <span className="ml-2 text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">YOU</span>}
                 </span>
              </div>
              <div className="col-span-3 text-right font-mono text-green-400 font-bold">
                 {player.score.toLocaleString()}g
              </div>
              <div className="col-span-2 text-center flex items-center justify-center gap-1 text-slate-400">
                 <TrendingUp size={14} className="text-orange-400" /> {player.streak}
              </div>
           </div>
        ))}
      </div>
      
      {/* Mini Banner for User Status if not in top list view (though we added them) */}
      <div className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 flex items-center justify-between shadow-lg shadow-blue-900/50 transform hover:scale-[1.01] transition-transform">
         <div>
            <h3 className="text-white font-bold text-lg">Keep pushing!</h3>
            <p className="text-blue-100 text-sm">You are only <span className="font-bold">340g</span> away from the next rank.</p>
         </div>
         <button className="bg-white text-blue-600 px-4 py-2 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform">
            Log Now
         </button>
      </div>

    </div>
  );
};

export default Leaderboard;
