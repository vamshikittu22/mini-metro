
import React from 'react';

interface CaseStudyViewProps {
  onBack: () => void;
}

export const CaseStudyView: React.FC<CaseStudyViewProps> = ({ onBack }) => {
  return (
    <div className="fixed inset-0 bg-[#111111] text-[#F8F4EE] overflow-y-auto selection:bg-emerald-500 selection:text-black">
      {/* Decorative Grid Accents */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: `radial-gradient(circle, #F8F4EE 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      
      <div className="relative max-w-5xl mx-auto px-8 md:px-12 py-24 flex flex-col min-h-screen">
        
        {/* Navigation & Metadata */}
        <nav className="flex justify-between items-start mb-32">
          <div className="flex flex-col gap-4">
            <button 
              onClick={onBack} 
              className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-white transition-all"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to Hub
            </button>
            <div className="flex gap-2 mt-4">
              <span className="px-3 py-1 bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-emerald-400">Transit Simulation</span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-blue-400">Frontend Engine</span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-purple-400">Systems Design</span>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Doc Ref: MM-A-2025</span>
          </div>
        </nav>

        {/* Header Section */}
        <header className="mb-40">
          <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.85] mb-8">
            System<br/>
            <span className="text-emerald-500">Analysis</span>
          </h1>
          <div className="w-24 h-2 bg-white mb-12" />
          <p className="max-w-2xl text-xl font-bold text-white/60 leading-relaxed uppercase tracking-tight">
            An engineering analysis of the Mini Metro ▲ Web simulation engine, detailing the convergence of topology, aesthetics, and algorithmic efficiency.
          </p>
        </header>

        {/* Content Sections */}
        <main className="space-y-48 pb-40">
          
          {/* 01: Overview */}
          <section className="relative group">
            <div className="absolute -left-12 top-0 hidden lg:block">
              <span className="text-[10px] font-black text-emerald-500 tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">// 01</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 border-t border-white/10 pt-12">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-4">Overview</h2>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">System Philosophy</span>
              </div>
              <div className="flex flex-col gap-6">
                <p className="text-lg text-white/70 font-medium leading-relaxed uppercase tracking-tight">
                  Mini Metro ▲ Web is a high-performance transit simulator designed to model metropolitan networks as dynamic graphs. 
                  The simulation prioritizes systemic throughput and informational clarity over graphical fidelity, utilizing a deterministic game loop to manage hundreds of moving entities. 
                  This project serves as an end-to-end frontend systems engineering demonstration, balancing real-time state management with high-frequency rendering.
                </p>
              </div>
            </div>
          </section>

          {/* 02: Architecture */}
          <section className="relative group">
            <div className="absolute -left-12 top-0 hidden lg:block">
              <span className="text-[10px] font-black text-blue-400 tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">// 02</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 border-t border-white/10 pt-12">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-4">Architecture & Tech</h2>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Stack Composition</span>
              </div>
              <div className="flex flex-col gap-8">
                <p className="text-base text-white/60 leading-relaxed">
                  The application is decoupled into three primary modules: a React 19 UI layer for state orchestration, a vanilla TypeScript service layer for simulation logic, and a hardware-accelerated HTML5 Canvas renderer. 
                  Performance is maintained through a <span className="text-white font-bold">Dirty Rectangle Optimization</span> strategy, which identifies modified world segments and updates only the necessary screen regions.
                </p>
                <div className="bg-white/5 p-6 font-mono text-[10px] text-blue-300 border border-white/10 space-y-1">
                  <div className="text-white/20 mb-2">// Main Frame Loop Protocol</div>
                  <div>function simulationTick(timestamp) {'{'}</div>
                  <div className="pl-4">const dt = calculateDelta(timestamp);</div>
                  <div className="pl-4 text-emerald-400">gameEngine.update(dt); <span className="text-white/20">// Tick simulation services</span></div>
                  <div className="pl-4 text-blue-400">canvasRenderer.draw(gameState, camera); <span className="text-white/20">// Render layers</span></div>
                  <div className="pl-4">requestAnimationFrame(simulationTick);</div>
                  <div>{'}'}</div>
                </div>
              </div>
            </div>
          </section>

          {/* 03: Pathfinding */}
          <section className="relative group">
            <div className="absolute -left-12 top-0 hidden lg:block">
              <span className="text-[10px] font-black text-purple-400 tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">// 03</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 border-t border-white/10 pt-12">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-4">Pathfinding & Behaviour</h2>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Routing Logic</span>
              </div>
              <div className="flex flex-col gap-8">
                <p className="text-base text-white/60 leading-relaxed">
                  Commuter behavior is driven by a <span className="text-white font-bold">Hybrid Greedy Router</span>. Each passenger evaluates transit options based on a multi-factor cost heuristic including station distance, transfer penalties, and directional alignment. 
                  The system runs depth-limited search (DLS) to determine reachability, ensuring commuters only board lines that eventually intersect with their destination shape.
                </p>
                <div className="bg-white/5 p-6 font-mono text-[10px] text-purple-300 border border-white/10 space-y-1">
                  <div className="text-white/20 mb-2">// Passenger Decision Matrix</div>
                  <div>if (trainAtStation) {'{'}</div>
                  <div className="pl-4">const cost = calculateCostToDest(train.line);</div>
                  <div className="pl-4">if (cost &lt; currentPathCost) boardTrain();</div>
                  <div className="pl-4">else wait(FOR_BETTER_LINE_PENALTY);</div>
                  <div>{'}'}</div>
                </div>
              </div>
            </div>
          </section>

          {/* 04: Systems */}
          <section className="relative group">
            <div className="absolute -left-12 top-0 hidden lg:block">
              <span className="text-[10px] font-black text-yellow-500 tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">// 04</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 border-t border-white/10 pt-12">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-4">Systems & Balancing</h2>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Entropy Management</span>
              </div>
              <div className="flex flex-col gap-8">
                <p className="text-base text-white/60 leading-relaxed">
                  Difficulty scales dynamically through a ratio of station spawns to available resources. The <span className="text-white font-bold">SystemValidator</span> service audits the network every 5 seconds, calculating "Integrity Scores" based on network saturation and station overload. 
                  Operational telemetry is logged to the <span className="text-white font-bold">DataLogger</span>, allowing for system-wide performance exports in Markdown format for diagnostic review.
                </p>
                <div className="bg-white/5 p-6 font-mono text-[10px] text-yellow-200 border border-white/10 space-y-1">
                  <div className="text-white/20 mb-2">// Resource Allocation Logic</div>
                  <div>const scale = 1 + (city.difficulty * 0.5);</div>
                  <div>const spawnRate = BASE_RATE / (week * scale);</div>
                  <div className="text-white/20 mt-2">// Weekly Reward Trigger</div>
                  <div>if (days % 7 === 0) triggerRewardSelection();</div>
                </div>
              </div>
            </div>
          </section>

          {/* 05: Visual */}
          <section className="relative group">
            <div className="absolute -left-12 top-0 hidden lg:block">
              <span className="text-[10px] font-black text-emerald-500 tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">// 05</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 border-t border-white/10 pt-12">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-4">Visual & Interaction</h2>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Interface Topology</span>
              </div>
              <div className="flex flex-col gap-8">
                <p className="text-base text-white/60 leading-relaxed">
                  Adhering to the <span className="text-white font-bold">International Typographic Style</span>, the UI utilizes high-contrast brutalist elements and a strictly constrained grid to minimize cognitive load during peak network stress. 
                  Interaction patterns are gesture-driven: drag-to-connect line creation, right-click segment severing, and precise geometric snapping to 45°/90° angles to maintain topographical order.
                </p>
                <div className="bg-white/5 p-6 font-mono text-[10px] text-emerald-200 border border-white/10 space-y-1">
                  <div className="text-white/20 mb-2">// Render Pipeline Topology</div>
                  <div className="text-white/40 italic">1. Static Layer (Grid, Water, Waterway Labels)</div>
                  <div className="text-white/40 italic">2. Topology Layer (Line Segments, Tunnels, Bridges)</div>
                  <div className="text-white/40 italic">3. Dynamic Layer (Trains, Passengers, Interaction Ghost)</div>
                  <div className="text-white/40 italic">4. Overlay Layer (HUD, Tooltips, System Toasts)</div>
                </div>
              </div>
            </div>
          </section>

        </main>

        {/* Footer */}
        <footer className="mt-auto pt-24 border-t border-white/10 flex flex-col md:flex-row justify-between gap-8 opacity-40">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mini Metro ▲ Web Engineering</span>
            <span className="text-[8px] font-bold uppercase tracking-widest">Released under Creative Technologist Protocol v1.1.0</span>
          </div>
          <div className="flex gap-8 items-center">
            <span className="text-[8px] font-black uppercase tracking-[0.3em]">Build Hash: 7F29K-ALPHA</span>
            <div className="w-3 h-3 bg-white" />
          </div>
        </footer>

      </div>

      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111111; }
        ::-webkit-scrollbar-thumb { background: #333333; border-radius: 0px; }
        ::-webkit-scrollbar-thumb:hover { background: #444444; }
      `}</style>
    </div>
  );
};
