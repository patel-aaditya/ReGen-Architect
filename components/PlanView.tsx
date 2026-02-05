import React, { useState } from 'react';
import { RestorationPlan, Coordinates, LocalSearchResult } from '../types';
import { findLocalServices } from '../services/geminiService';
import { MapPinIcon } from './Icons';

interface PlanViewProps {
  plan: RestorationPlan;
  location: Coordinates | null;
}

const PlanView: React.FC<PlanViewProps> = ({ plan, location }) => {
  // Store search results for each phase index
  const [phaseResults, setPhaseResults] = useState<Record<number, LocalSearchResult>>({});
  const [loadingPhases, setLoadingPhases] = useState<Record<number, boolean>>({});

  const handleSearchForPhase = async (index: number, category: string) => {
    if (!location) {
      alert("Location is required to find local help.");
      return;
    }
    
    setLoadingPhases(prev => ({ ...prev, [index]: true }));
    
    try {
      const result = await findLocalServices(category, location);
      setPhaseResults(prev => ({ ...prev, [index]: result }));
    } catch (e) {
      console.error(e);
      alert("Failed to find local services. Please try again later.");
    } finally {
      setLoadingPhases(prev => ({ ...prev, [index]: false }));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Header */}
      <div className="glass-panel p-8 rounded-2xl border-l-4 border-emerald-500">
        <h2 className="text-3xl font-bold text-white mb-2">{plan.title}</h2>
        <p className="text-slate-300 text-lg leading-relaxed">{plan.summary}</p>
        <div className="flex gap-8 mt-6">
          <div>
            <span className="block text-sm text-slate-500 uppercase tracking-wider">Estimated Cost</span>
            <span className="text-2xl font-mono font-bold text-emerald-400">
              {plan.currencySymbol} {plan.totalEstimatedCost.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="block text-sm text-slate-500 uppercase tracking-wider">Timeline</span>
            <span className="text-2xl font-mono font-bold text-blue-400">
              {plan.totalDurationWeeks} Weeks
            </span>
          </div>
        </div>
      </div>

      {/* Timeline/Phases */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-emerald-400 ml-2">Execution Roadmap</h3>
        {plan.phases.map((phase, index) => {
           const isLoading = loadingPhases[index];
           const results = phaseResults[index];
           
           return (
            <div key={index} className="glass-panel p-6 rounded-xl relative overflow-hidden transition-all duration-300 hover:border-slate-600">
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-700"></div>
                <div className="flex flex-col gap-6">
                    {/* Phase Header */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-slate-700 pb-4">
                        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-600 font-bold text-lg text-emerald-400">
                            {index + 1}
                        </div>
                        <div className="flex-grow">
                            <h4 className="text-xl font-bold text-white">{phase.phaseName}</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{phase.durationWeeks} Weeks</span>
                                <span>•</span>
                                <span className="text-emerald-400/80">Budget: {plan.currencySymbol} {phase.estimatedCost.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h5 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Action Items</h5>
                            <ul className="space-y-2">
                                {phase.tasks.map((task, i) => (
                                    <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0"></span>
                                        {task}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <h5 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Materials</h5>
                                <div className="flex flex-wrap gap-2">
                                    {phase.materialsNeeded.map((mat, i) => (
                                        <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700">
                                            {mat}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-yellow-900/10 p-3 rounded border border-yellow-900/30">
                                <p className="text-xs text-yellow-500/80 italic">"{phase.technicalNotes}"</p>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Local Service Finder */}
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <h5 className="text-sm font-semibold text-white flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4 text-emerald-400" />
                                Local Assistance
                            </h5>
                            {!results && (
                                <button 
                                    onClick={() => handleSearchForPhase(index, phase.recommendedServiceCategory)}
                                    disabled={isLoading || !location}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                                        !location 
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : isLoading 
                                            ? 'bg-emerald-900/20 text-emerald-400 cursor-wait'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                                    }`}
                                >
                                    {isLoading ? 'Searching...' : `Find ${phase.recommendedServiceCategory}`}
                                </button>
                            )}
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div className="py-4 text-center">
                                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
                                <p className="text-xs text-slate-500 mt-2">Connecting with {phase.recommendedServiceCategory}s in your area...</p>
                            </div>
                        )}

                        {/* Results */}
                        {results && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
                                {results.providers.length > 0 ? (
                                    results.providers.slice(0, 4).map((provider, pIdx) => (
                                        <div key={pIdx} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:border-emerald-500/30 transition-colors group">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-semibold text-emerald-300 text-sm truncate pr-2">{provider.name}</div>
                                                {provider.phoneNumber && (
                                                    <a 
                                                        href={`tel:${provider.phoneNumber.replace(/\s/g, '')}`}
                                                        className="flex-shrink-0 bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-400 p-1.5 rounded transition-colors"
                                                        title="Call Now"
                                                    >
                                                        📞
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate mb-2">{provider.address}</p>
                                            <p className="text-xs text-slate-400 line-clamp-2">{provider.description}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-500 col-span-full italic">No direct matches found nearby.</p>
                                )}
                                <div className="col-span-full mt-2">
                                     <button 
                                        onClick={() => handleSearchForPhase(index, phase.recommendedServiceCategory)}
                                        className="text-xs text-slate-500 hover:text-emerald-400 underline"
                                    >
                                        Refresh Search
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {!location && !results && (
                             <p className="text-xs text-slate-600 italic">Enable location services to find helpers for this step.</p>
                        )}
                    </div>
                </div>
            </div>
           );
        })}
      </div>

      {/* Long Term Impact */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-xl font-semibold text-emerald-400 mb-4">Long Term Impact</h3>
        <p className="text-slate-300">{plan.longTermImpact}</p>
      </div>
    </div>
  );
};

export default PlanView;