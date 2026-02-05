import React from 'react';
import { SiteAnalysis, RestorationType, BudgetLevel } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface AnalysisViewProps {
  analysis: SiteAnalysis;
  onSelectType: (type: RestorationType, budget: BudgetLevel) => void;
  isGenerating: boolean;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, onSelectType, isGenerating }) => {
  const [selectedBudget, setSelectedBudget] = React.useState<BudgetLevel>(BudgetLevel.MEDIUM);

  const suitabilityData = Object.entries(analysis.suitability).map(([name, score]) => ({
    name,
    score: score as number,
  }));

  const biodiversityData = [
    { subject: 'Biodiversity', A: analysis.biodiversityScore * 10, fullMark: 100 },
    { subject: 'Permeability', A: 100 - analysis.soilSealingEstimate, fullMark: 100 },
    { subject: 'Sunlight', A: analysis.sunlightExposure.includes('Full') ? 90 : 50, fullMark: 100 },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Metrics */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-4 text-emerald-400">Site Intelligence</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <span className="text-slate-400">Hardiness Zone</span>
              <span className="font-mono text-lg">{analysis.hardinessZoneEstimate}</span>
            </div>
             <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <span className="text-slate-400">Estimated Area</span>
              <span className="font-mono text-lg text-blue-300">{analysis.estimatedAreaSqM} m²</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <span className="text-slate-400">Sealed Soil</span>
              <span className="font-mono text-lg text-red-400">{analysis.soilSealingEstimate}%</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-2">Issues Detected</span>
              <div className="flex flex-wrap gap-2">
                {analysis.ecologicalDeficits.map((deficit, idx) => (
                  <span key={idx} className="px-3 py-1 bg-red-900/30 text-red-300 text-xs rounded-full border border-red-900/50">
                    {deficit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold mb-2 text-emerald-400 w-full text-left">Ecological Potential</h3>
            <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={biodiversityData}>
                    <PolarGrid stroke="#475569" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="Site Score"
                        dataKey="A"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="#10b981"
                        fillOpacity={0.3}
                    />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Configuration & Selection */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
                <h3 className="text-xl font-semibold text-emerald-400">Generate Plan</h3>
                <p className="text-slate-400 text-sm">Select a strategy compatible with your site.</p>
            </div>
            
            <div className="bg-slate-800 p-1 rounded-lg flex items-center">
                <span className="text-xs text-slate-500 font-bold px-3 uppercase tracking-wider">Budget Strategy</span>
                <select 
                    value={selectedBudget}
                    onChange={(e) => setSelectedBudget(e.target.value as BudgetLevel)}
                    className="bg-slate-700 text-white text-sm rounded px-3 py-1.5 border-none focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                    {Object.values(BudgetLevel).map(level => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suitabilityData.map((item) => {
             const isViable = item.score > 30; // Filter out unrealistic options
             return (
                <button
                key={item.name}
                onClick={() => isViable && onSelectType(item.name as RestorationType, selectedBudget)}
                disabled={isGenerating || !isViable}
                className={`relative overflow-hidden group p-4 rounded-xl text-left border transition-all duration-300 flex flex-col justify-between min-h-[100px] ${
                    isGenerating 
                    ? 'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900' 
                    : !isViable
                    ? 'opacity-40 grayscale cursor-not-allowed border-slate-800 bg-slate-900'
                    : 'border-slate-700 bg-slate-800/50 hover:border-emerald-500 hover:bg-slate-800'
                }`}
                >
                <div className="flex justify-between items-start mb-2 w-full">
                    <span className="font-medium text-lg leading-tight">{item.name}</span>
                    <span className={`text-[10px] font-mono px-2 py-1 rounded whitespace-nowrap ml-2 ${
                        item.score > 80 ? 'bg-emerald-900 text-emerald-300' :
                        item.score > 50 ? 'bg-yellow-900 text-yellow-300' :
                        'bg-red-900/50 text-red-400'
                    }`}>
                        {isViable ? `${item.score}% Match` : 'Not Suitable'}
                    </span>
                </div>
                
                {isViable ? (
                    <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2">
                        <div 
                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" 
                            style={{ width: `${item.score}%` }}
                        />
                    </div>
                ) : (
                    <div className="text-xs text-red-400 mt-2">
                        Site size or conditions typically unsuitable.
                    </div>
                )}
                </button>
             );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;