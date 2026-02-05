import React, { useState, useRef } from 'react';
import { AppState, ProjectState, RestorationType, Coordinates, BudgetLevel } from './types';
import { analyzeSiteImage, generateVisionImage, createExecutionPlan } from './services/geminiService';
import { UploadIcon, LeafIcon, SparklesIcon, ChartIcon, MapPinIcon, InfoIcon } from './components/Icons';
import AnalysisView from './components/AnalysisView';
import PlanView from './components/PlanView';

const DEMO_IMAGE_URL = "https://images.unsplash.com/photo-1599694464293-4e4b75240c49?q=80&w=1200&auto=format&fit=crop"; // Concrete yard

const App = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [project, setProject] = useState<ProjectState>({
    originalImage: null,
    restoredImage: null,
    analysis: null,
    selectedType: null,
    budget: BudgetLevel.MEDIUM,
    plan: null,
    location: null,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [showTechStack, setShowTechStack] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        
        setProject(prev => ({ ...prev, originalImage: base64Data }));
        startAnalysis(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDemoLoad = async () => {
    setLoadingDemo(true);
    try {
      const response = await fetch(DEMO_IMAGE_URL);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        
        setProject(prev => ({ ...prev, originalImage: base64Data }));
        startAnalysis(base64Data);
        setLoadingDemo(false);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error(e);
      alert("Could not load demo image. Please upload your own.");
      setLoadingDemo(false);
    }
  };

  const handleLocationRequest = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setProject(prev => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        }));
        setIsLocating(false);
      },
      (error) => {
        console.error("Location error:", error);
        let msg = "Unable to retrieve location.";
        if (error.code === error.PERMISSION_DENIED) {
            msg = "Location permission denied. Please allow location access in your browser settings to use local features.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
            msg = "The request to get user location timed out.";
        }
        alert(msg);
        setIsLocating(false);
      }
    );
  };

  const startAnalysis = async (base64Data: string) => {
    setAppState(AppState.ANALYZING);
    try {
      // Pass location if available for context
      const analysis = await analyzeSiteImage(base64Data, project.location);
      setProject(prev => ({ ...prev, analysis }));
      setAppState(AppState.REVIEW_ANALYSIS);
    } catch (error) {
      console.error(error);
      setAppState(AppState.IDLE); // Reset on error
      alert("Failed to analyze image. Please try again.");
    }
  };

  const handleTypeSelection = async (type: RestorationType, budget: BudgetLevel) => {
    if (!project.originalImage || !project.analysis) return;
    
    setProject(prev => ({ ...prev, selectedType: type, budget }));
    setAppState(AppState.GENERATING_VISION);

    try {
      const imagePromise = generateVisionImage(project.originalImage, type, project.analysis, budget);
      // Pass project.location to plan generation for currency detection
      const planPromise = createExecutionPlan(project.analysis, type, budget, project.location);

      const [restoredImage, plan] = await Promise.all([imagePromise, planPromise]);

      setProject(prev => ({ ...prev, restoredImage, plan }));
      setAppState(AppState.COMPLETE);

    } catch (error) {
      console.error(error);
      setAppState(AppState.REVIEW_ANALYSIS);
      alert("Generation failed. Please try again.");
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setProject({
      originalImage: null,
      restoredImage: null,
      analysis: null,
      selectedType: null,
      budget: BudgetLevel.MEDIUM,
      plan: null,
      location: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen pb-12 relative overflow-x-hidden font-sans text-slate-200 flex flex-col">
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none z-[-1]">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]"></div>
        </div>

      <header className="fixed top-0 w-full z-50 glass-panel border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 cursor-pointer" onClick={resetApp}>
            <LeafIcon className="w-6 h-6" />
            <span className="font-bold text-xl tracking-tight text-white">ReGen <span className="text-slate-500 font-normal">Architect</span></span>
          </div>
          <div className="flex items-center gap-4">
             {appState !== AppState.IDLE && (
                 <button onClick={resetApp} className="text-sm text-slate-400 hover:text-white transition-colors">
                     New Project
                 </button>
             )}
             <span className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
                <SparklesIcon className="w-3 h-3 text-emerald-500" />
                Powered by Gemini 3 Flash & 2.5 Image
             </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-24 flex-grow w-full">
        
        {/* State: IDLE - Landing & Upload Area */}
        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fadeIn pb-20">
            <div className="inline-block mb-4 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
               AI for Social Good
            </div>
            <h1 className="text-4xl md:text-7xl font-bold text-center mb-6 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent max-w-4xl leading-tight">
              Transform Urban Decay into <br/> Thriving Ecosystems
            </h1>
            <p className="text-slate-400 text-lg md:text-xl text-center max-w-2xl mb-10 leading-relaxed">
              Upload a photo of any concrete patch. Our AI analyzes the site, 
              designs a biodiversity haven, and gives you a step-by-step plan to build it.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-4 items-center mb-16">
                 {/* Upload Button */}
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
                    <button className="relative px-8 py-4 bg-slate-900 rounded-full leading-none flex items-center gap-3 border border-slate-700 group-hover:bg-slate-800 transition-colors">
                        <UploadIcon />
                        <span className="text-lg font-medium text-white">Upload Site Photo</span>
                    </button>
                </div>
                
                 {/* Demo Button */}
                <button 
                  onClick={handleDemoLoad}
                  disabled={loadingDemo}
                  className="px-8 py-4 rounded-full border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium transition-colors flex items-center gap-2"
                >
                    {loadingDemo ? (
                        <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <SparklesIcon className="w-5 h-5 text-yellow-500" />
                    )}
                    Try with Demo Photo
                </button>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
            </div>

            {/* Location Toggle (Secondary) */}
            <div className="mb-16 flex items-center gap-3 bg-slate-800/50 p-2 pr-4 rounded-full border border-slate-700/50 backdrop-blur-sm">
                <button 
                  onClick={handleLocationRequest}
                  disabled={!!project.location || isLocating}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                    project.location 
                      ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {isLocating ? (
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                     <MapPinIcon className="w-4 h-4" />
                  )}
                </button>
                <span className={`text-sm ${project.location ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                  {project.location ? 'Location Active' : 'Enable location for local plants & services'}
                </span>
            </div>

            {/* How It Works Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ChartIcon className="w-24 h-24" />
                    </div>
                    <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 text-blue-400 border border-blue-500/20">
                        <span className="font-bold text-xl">1</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Analyze</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Gemini Vision calculates sealed soil percentages, detects sunlight levels, and identifies ecological deficits.
                    </p>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <SparklesIcon className="w-24 h-24" />
                    </div>
                    <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 text-purple-400 border border-purple-500/20">
                        <span className="font-bold text-xl">2</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Visualize</h3>
                    <p className="text-slate-400 leading-relaxed">
                        See the future. Generative AI overlays native wildflower meadows or food forests directly onto your photo.
                    </p>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <MapPinIcon className="w-24 h-24" />
                    </div>
                    <div className="w-12 h-12 bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4 text-emerald-400 border border-emerald-500/20">
                        <span className="font-bold text-xl">3</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Execute</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Get a phased construction plan with cost estimates and real contact info for local contractors and nurseries.
                    </p>
                </div>
            </div>

          </div>
        )}

        {/* State: LOADING (Analyzing or Generating) */}
        {(appState === AppState.ANALYZING || appState === AppState.GENERATING_VISION) && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
                <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 border-4 border-slate-700/50 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LeafIcon className="text-emerald-500 w-10 h-10 animate-bounce" />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                    {appState === AppState.ANALYZING ? "Analyzing Ecological Data" : "Architecting Vision & Plan"}
                </h2>
                <div className="flex flex-col items-center gap-2 text-slate-400 text-center max-w-md">
                     <p>
                        {appState === AppState.ANALYZING 
                            ? "Measuring sunlight, estimating area size, and checking biodiversity potential..." 
                            : "Generating photorealistic render and calculating execution strategy..."}
                    </p>
                    {appState === AppState.GENERATING_VISION && (
                        <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded border border-blue-900/50">
                            Thinking Budget: 4k tokens
                        </span>
                    )}
                </div>
            </div>
        )}

        {/* Main Interface for Analysis & Results */}
        {(appState === AppState.REVIEW_ANALYSIS || appState === AppState.COMPLETE) && project.analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
                
                {/* Left Column: Visuals */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Original Image */}
                    <div className="glass-panel p-2 rounded-2xl">
                        <div className="bg-slate-900 rounded-xl overflow-hidden relative aspect-[4/3]">
                            <img 
                                src={`data:image/jpeg;base64,${project.originalImage}`} 
                                className="w-full h-full object-cover" 
                                alt="Original Site" 
                            />
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded text-xs font-mono text-white">
                                CURRENT STATE
                            </div>
                        </div>
                    </div>

                    {/* Result Image (If Complete) */}
                    {appState === AppState.COMPLETE && project.restoredImage && (
                         <div className="glass-panel p-2 rounded-2xl animate-fadeIn">
                            <div className="bg-slate-900 rounded-xl overflow-hidden relative aspect-[4/3]">
                                <img 
                                    src={`data:image/jpeg;base64,${project.restoredImage}`} 
                                    className="w-full h-full object-cover" 
                                    alt="Restored Vision" 
                                />
                                <div className="absolute top-4 left-4 bg-emerald-900/80 backdrop-blur px-3 py-1 rounded text-xs font-mono text-emerald-100 border border-emerald-500/30">
                                    AI VISION ({project.budget.split(' ')[0].toUpperCase()})
                                </div>
                                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur p-2 rounded-full">
                                    <SparklesIcon className="w-5 h-5 text-emerald-400" />
                                </div>
                            </div>
                         </div>
                    )}
                </div>

                {/* Right Column: Data & Plan */}
                <div className="lg:col-span-7">
                    {appState === AppState.REVIEW_ANALYSIS && (
                        <AnalysisView 
                            analysis={project.analysis} 
                            onSelectType={handleTypeSelection}
                            isGenerating={false}
                        />
                    )}

                    {appState === AppState.COMPLETE && project.plan && (
                        <PlanView plan={project.plan} location={project.location} />
                    )}
                </div>
            </div>
        )}
      </main>

      {/* Tech Stack Modal */}
      {showTechStack && (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" 
            onClick={() => setShowTechStack(false)}
        >
            <div 
                className="bg-slate-900 border border-slate-700 p-6 md:p-8 rounded-2xl max-w-2xl w-full shadow-2xl relative overflow-y-auto max-h-[90vh]" 
                onClick={e => e.stopPropagation()}
            >
                <button onClick={() => setShowTechStack(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
                
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="text-emerald-400">ReGen</span> System Architecture
                </h2>

                <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                             <ChartIcon className="w-5 h-5 text-blue-400" />
                             1. Ecological Analysis
                        </h3>
                        <p className="text-slate-400 text-sm mb-2">
                            Uses <span className="text-blue-300 font-mono">gemini-3-flash-preview</span> with Vision to analyze soil sealing, sunlight patterns, and biodiversity deficits from a single photo.
                        </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                             <SparklesIcon className="w-5 h-5 text-purple-400" />
                             2. Generative Visualization
                        </h3>
                        <p className="text-slate-400 text-sm mb-2">
                            Uses <span className="text-purple-300 font-mono">gemini-2.5-flash-image</span> to generate photorealistic future-state renders, preserving original perspective and scale.
                        </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                             <MapPinIcon className="w-5 h-5 text-emerald-400" />
                             3. Execution & Sourcing
                        </h3>
                        <p className="text-slate-400 text-sm mb-2">
                            Uses <span className="text-emerald-300 font-mono">gemini-3-flash-preview</span> with <span className="font-mono bg-slate-900 px-1 rounded">Thinking Budget: 4096</span> to generate phased construction plans.
                        </p>
                        <p className="text-slate-400 text-sm">
                            Integrates <strong>Google Search Grounding</strong> to find real local contractors and nurseries based on the user's geolocation.
                        </p>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center text-sm text-slate-500">
                    <p>Built for the Google Gemini API Hackathon</p>
                    <a 
                        href="https://github.com/google/genai" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline"
                    >
                        View Gemini Docs
                    </a>
                </div>
            </div>
        </div>
      )}

      <footer className="w-full max-w-7xl mx-auto px-6 py-8 mt-auto border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
        <div>
          <span className="font-semibold text-slate-400">ReGen</span> • AI Urban Architect
        </div>
        <div className="mt-4 md:mt-0 flex gap-6 items-center">
            <button 
                onClick={() => setShowTechStack(true)}
                className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
            >
                <InfoIcon className="w-4 h-4" />
                System Architecture
            </button>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                GitHub Repo
            </a>
        </div>
      </footer>
    </div>
  );
};

export default App;