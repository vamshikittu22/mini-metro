
import React, { useState, useEffect, useRef } from 'react';

interface CaseStudyViewProps {
  onBack: () => void;
}

type SectionId = 'overview' | 'architecture' | 'pathfinding' | 'systems' | 'visuals';

interface Metric {
  label: string;
  value: string;
  caption: string;
}

interface SectionData {
  id: SectionId;
  num: string;
  title: string;
  label: string;
  subline: string;
  content: string;
  codeLabel: string;
  code?: string[];
  metrics: Metric[];
  caption: string;
  gradient: string;
}

export const CaseStudyView: React.FC<CaseStudyViewProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const observer = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sections: SectionData[] = [
    { 
      id: 'overview', 
      num: '01',
      title: 'Overview – A Real‑Time Transit Sandbox', 
      label: 'System Philosophy',
      subline: 'Modeling city-scale transit networks as dynamic graphs where throughput meets minimalist topology.',
      content: 'Mini Metro ▲ Web is a high-performance simulation engine that models subways as a live graph of nodes (stations) and edges (lines). Passengers are unique entities that navigate this graph using a deterministic simulation loop—a process that updates game logic at fixed intervals—allowing for complex traffic management without visual overhead.',
      codeLabel: 'Simulation loop (conceptual)',
      code: [
        '// Core system tick executed every frame',
        'function simulationLoop(timestamp) {',
        '  const deltaTime = calculateStep(timestamp);',
        '  transitEngine.update(deltaTime); // Process physics/spawning',
        '  canvasRenderer.draw(gameState);  // Render current frame',
        '  requestAnimationFrame(simulationLoop);',
        '}'
      ],
      metrics: [
        { label: 'Global Hubs', value: '7 Cities', caption: 'Unique geographic bounds and water constraints.' },
        { label: 'Performance', value: '60 FPS', caption: 'Target frame rate for smooth topological interaction.' },
        { label: 'Engine Core', value: 'Graph-Based', caption: 'Models transit as a series of connected data nodes.' }
      ],
      caption: 'Topological network overview showcasing deterministic node distribution.',
      gradient: 'from-emerald-900/40 to-black'
    },
    { 
      id: 'architecture', 
      num: '02',
      title: 'Architecture – The Decoupled Engine', 
      label: 'Stack Composition',
      subline: 'A three-tier system separating React UI orchestration, TypeScript simulation logic, and hardware-accelerated rendering.',
      content: 'The application architecture is split into three decoupled layers. The Service Layer handles mathematical simulation (spawning, train physics), the React Layer manages global state and UI, and the Canvas Renderer utilizes "Dirty Rectangle Redraw"—a strategy that updates only changed pixels—to maintain peak performance on low-power devices.',
      codeLabel: 'Service-Renderer Pipeline (conceptual)',
      code: [
        '// Communication between UI and Engine',
        'const [state, dispatch] = useReducer(gameReducer);',
        'useEffect(() => {',
        '  engine.onUpdate = (newState) => {',
        '    dispatch({ type: "SYNC_UI", payload: newState });',
        '    renderer.draw(newState, camera);',
        '  };',
        '}, []);'
      ],
      metrics: [
        { label: 'Services', value: '9 Units', caption: 'Independent modules for routing, inventory, and logic.' },
        { label: 'Draw Call Time', value: '~1.2ms', caption: 'Budget per frame to keep interactions feeling instant.' },
        { label: 'Domain Layer', value: '100% Typed', caption: 'Strong typing across all transit and game entities.' }
      ],
      caption: 'Decoupled system architecture mapping state flow from engine to UI.',
      gradient: 'from-blue-900/40 to-black'
    },
    { 
      id: 'pathfinding', 
      num: '03',
      title: 'Pathfinding – Behavioral Intelligence', 
      label: 'Routing Logic',
      subline: 'Simulating commuter logic via a "Hybrid Greedy" model that balances travel cost against waiting time.',
      content: 'Commuters navigate using a "Hybrid Greedy" router: they prefer direct lines but will transfer at stations if it significantly reduces travel cost. The system uses "Depth-Limited Search" (DLS)—a graph traversal algorithm—to determine line reachability, ensuring passengers only board trains that can actually reach their specific destination shape.',
      codeLabel: 'Commuter routing logic (conceptual)',
      code: [
        '// Evaluation per passenger at a station',
        'function decideTransit(passenger, train) {',
        '  const isLineValid = line.canReach(passenger.dest);',
        '  if (isLineValid) {',
        '    const cost = line.calculateHeuristic(passenger.dest);',
        '    if (cost < passenger.bestCurrentOption) board();',
        '    else wait(PREFERENCE_TIMER);',
        '  }',
        '}'
      ],
      metrics: [
        { label: 'Transfer Depth', value: '2-4 Steps', caption: 'How many line changes a passenger will tolerate.' },
        { label: 'Cache Hit Rate', value: '94.2%', caption: 'Efficiency of storing pre-calculated route paths.' },
        { label: 'Logic Model', value: 'Hybrid Greedy', caption: 'Prioritizes local greedy decisions over global paths.' }
      ],
      caption: 'Real-time pathfinding visualization with cost-benefit nodes.',
      gradient: 'from-purple-900/40 to-black'
    },
    { 
      id: 'systems', 
      num: '04',
      title: 'Systems – Entropy and Balancing', 
      label: 'Entropy Management',
      subline: 'A resource-constrained simulation that scales difficulty by monitoring network saturation and station overload.',
      content: 'Difficulty is an emergent property of time and throughput. The "SystemValidator" service audits the network every 5 seconds; if a station remains overcrowded beyond a threshold, the system halts. Players must balance limited resources (locomotives, tunnels, lines) granted through a "Weekly Reward" cadence to maintain system integrity.',
      codeLabel: 'Difficulty scaling protocol (conceptual)',
      code: [
        '// Dynamic spawn rate calculation',
        'const difficultyFactor = (week * city.difficultyMult);',
        'const nextPassengerSpawn = BASE_RATE / difficultyFactor;',
        '',
        '// Resource reward trigger',
        'if (days % 7 === 0) {',
        '  pauseSimulation();',
        '  offerUpgrades(["LOCO", "LINE", "TUNNEL"]);',
        '}'
      ],
      metrics: [
        { label: 'Start Assets', value: '3 Lines', caption: 'The initial operational capacity for new cities.' },
        { label: 'Difficulty Peak', value: 'x1.8 Mult', caption: 'Maximum scaling for high-density metropolitan areas.' },
        { label: 'Audit Cycle', value: '5.0s', caption: 'How often the engine verifies network integrity.' }
      ],
      caption: 'Resource distribution graph and weekly system audit metrics.',
      gradient: 'from-yellow-900/40 to-black'
    },
    { 
      id: 'visuals', 
      num: '05',
      title: 'Visuals – The Swiss Modernist UI', 
      label: 'Interface Topology',
      subline: 'Adhering to International Typographic Style to minimize cognitive load during high-stress management.',
      content: 'The visual language utilizes grid-aligned geometric primitives and a high-contrast palette to keep the player focused on throughput. The renderer optimizes frames by separating the world into a Static Layer (grids, water) and a Dynamic Layer (moving trains, passenger counts), ensuring smooth interaction even as the network reaches peak complexity.',
      codeLabel: 'Layered Rendering Strategy (conceptual)',
      code: [
        '// Frame compositing strategy',
        'function renderFrame() {',
        '  ctx.drawImage(staticCache); // Draw rivers/grids from buffer',
        '  drawDynamicTrains();       // Render moving entities',
        '  drawPassengerCounters();    // Render pulsing UI elements',
        '  drawOverlay();             // Render HUD and tooltips',
        '}'
      ],
      metrics: [
        { label: 'Canvas Layers', value: '4 Layers', caption: 'Composite layers used for performance optimization.' },
        { label: 'Snapping', value: '45°/90°', caption: 'Constraint system to maintain topographical order.' },
        { label: 'Color Tokens', value: '12 Codes', caption: 'High-contrast line colors for visual separation.' }
      ],
      caption: 'International Typographic Style grid system applied to game UI.',
      gradient: 'from-emerald-950 to-black'
    }
  ];

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
            setActiveSection(entry.target.id as SectionId);
          }
        });
      },
      { threshold: [0.1, 0.3, 0.5], rootMargin: '-20% 0px -20% 0px' }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.current?.observe(el);
    });

    return () => observer.current?.disconnect();
  }, []);

  const scrollToSection = (id: SectionId) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 bg-[#111111] text-[#F8F4EE] selection:bg-emerald-500 selection:text-black font-sans overflow-y-auto z-50 scroll-smooth">
      {/* Sticky Header */}
      <header className="sticky top-0 z-[100] w-full bg-black/95 backdrop-blur-xl border-b border-white/5 px-8 md:px-12 h-16 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-emerald-500 transition-colors"
          >
            ← HUB
          </button>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 leading-none">Mini Metro ▲ Web</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/20">Engineering Study</span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-6">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className={`text-[9px] font-black uppercase tracking-widest transition-all relative py-2 ${
                activeSection === s.id ? 'text-emerald-400' : 'text-white/30 hover:text-white/60'
              }`}
            >
              {s.id.toUpperCase()}
              {activeSection === s.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 animate-in fade-in slide-in-from-bottom-1 duration-300" />
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* Decorative Grid Accents */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-0" 
           style={{ backgroundImage: `radial-gradient(circle, #F8F4EE 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      
      <div className="relative z-10 max-w-6xl mx-auto px-8 md:px-12 py-24 flex flex-col min-h-screen">
        
        {/* Intro Section */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-24 gap-12">
          <header>
            <h1 className="text-7xl md:text-[10rem] font-black uppercase tracking-tighter leading-[0.8] mb-8">
              System<br/>
              <span className="text-emerald-500">Analysis</span>
            </h1>
            <div className="w-32 h-1.5 bg-emerald-500 mb-12" />
            <p className="max-w-xl text-lg font-bold text-white/40 leading-relaxed uppercase tracking-tight">
              A comprehensive technical evaluation of the Mini Metro ▲ Web core engine, 
              focusing on high-performance rendering and deterministic simulation logic.
            </p>
          </header>
          <div className="flex flex-col items-end gap-2 text-right">
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-400">Status: Optimized</span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/30">v1.1.0-ALPHA</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/10">Doc Ref: MM-A-2025</span>
          </div>
        </div>

        {/* Content Sections */}
        <main className="space-y-32 pb-40">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="relative group scroll-mt-32">
              {/* Section Header */}
              <div className="flex items-end gap-4 mb-4">
                <span className={`text-4xl font-black italic tracking-tighter transition-all duration-500 ${
                  activeSection === section.id ? 'text-emerald-500' : 'text-white/10'
                }`}>
                  {section.num}
                </span>
                <div className="flex flex-col">
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">
                    {section.title}
                  </h2>
                  <p className="text-[11px] font-bold text-white/60 uppercase tracking-tight max-w-2xl leading-snug">
                    {section.subline}
                  </p>
                </div>
              </div>

              {/* Section Dashboard Card */}
              <div className={`grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-0 border border-white/10 rounded-sm overflow-hidden bg-[#161616] transition-all duration-700 shadow-2xl ${
                activeSection === section.id ? 'ring-1 ring-emerald-500/30 border-white/20' : ''
              }`}>
                
                {/* Left Column: Text Content */}
                <div className="p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col gap-8">
                  <p className="text-lg font-medium leading-relaxed text-white/70 tracking-tight">
                    {section.content}
                  </p>
                  
                  {section.code && (
                    <div className="bg-black/40 p-6 font-mono text-[10px] border border-white/5 rounded-sm space-y-1 overflow-x-auto whitespace-pre group-hover:border-emerald-500/20 transition-colors">
                      <div className="text-white/20 mb-4 flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="uppercase tracking-widest font-black text-[9px]">{section.codeLabel}</span>
                        <span className="text-[8px] opacity-40 uppercase">Typescript / Logic Protocol</span>
                      </div>
                      {section.code.map((line, i) => {
                        let colorClass = 'text-white/60';
                        if (line.includes('//')) colorClass = 'text-white/20';
                        else if (line.includes('function') || line.includes('const') || line.includes('if') || line.includes('return')) colorClass = 'text-emerald-400';
                        else if (line.includes('(')) colorClass = 'text-blue-300';
                        
                        return (
                          <div key={i} className={colorClass}>
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Visuals & Metrics */}
                <div className="bg-black/20 p-8 flex flex-col gap-8">
                  {/* Image Frame Placeholder */}
                  <div className="flex flex-col gap-4">
                    <div className={`aspect-video w-full rounded-sm border border-white/5 bg-gradient-to-br ${section.gradient} relative overflow-hidden flex items-center justify-center group-hover:border-white/10 transition-all`}>
                       {/* Geometric Decoration */}
                       <div className="absolute inset-0 opacity-10 pointer-events-none">
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-px bg-white rotate-45" />
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-px bg-white -rotate-45" />
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white rounded-full" />
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">System Visualization</span>
                    </div>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest italic leading-snug">
                      {section.caption}
                    </p>
                  </div>

                  {/* Compact Metrics Area */}
                  <div className="grid grid-cols-1 gap-2">
                    {section.metrics.map((metric, idx) => (
                      <div key={idx} className="flex flex-col gap-1 bg-white/5 border border-white/5 p-4 rounded-sm hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">{metric.label}</span>
                          <span className="text-[10px] font-black uppercase text-emerald-400">{metric.value}</span>
                        </div>
                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-wide leading-tight">
                          {metric.caption}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </section>
          ))}
        </main>

        {/* Footer */}
        <footer className="mt-auto pt-24 border-t border-white/10 flex flex-col md:flex-row justify-between gap-8 opacity-40">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mini Metro ▲ Web Engineering</span>
            <span className="text-[8px] font-bold uppercase tracking-widest font-mono">Released under Creative Technologist Protocol v1.1.0</span>
          </div>
          <div className="flex gap-8 items-center">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] font-mono">Build Hash: 7F29K-ALPHA</span>
            <div className="w-4 h-4 bg-emerald-500 rounded-sm" />
          </div>
        </footer>

      </div>

      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111111; }
        ::-webkit-scrollbar-thumb { background: #333333; border-radius: 0px; }
        ::-webkit-scrollbar-thumb:hover { background: #444444; }
        
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .section-animate {
          animation: fadeInScale 0.8s ease-out forwards;
        }

        @media (max-width: 1024px) {
          .scroll-mt-32 { scroll-margin-top: 80px; }
        }
      `}</style>
    </div>
  );
};
