import React from 'react';
import { GameState, City, Station, Point } from '../../types';
import { Stats } from '../HUD/Stats';
import { ResourcePanel } from '../HUD/ResourcePanel';
import { KeyboardHints } from '../HUD/KeyboardHints';
import { GameCanvas } from '../GameCanvas';
import { Strategist } from '../Strategist';
import { SystemValidator } from '../../services/validation';
import { THEME } from '../../constants';
import { GameEngine } from '../../services/gameEngine';

interface GameViewProps {
  uiState: GameState;
  currentCity: City | null;
  camera: { x: number; y: number; scale: number };
  setCamera: React.Dispatch<React.SetStateAction<{ x: number; y: number; scale: number }>>;
  engineRef: React.MutableRefObject<GameEngine | null>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  activeLineIdx: number;
  setActiveLineIdx: (idx: number) => void;
  syncStateImmediate: () => void;
  onSpeedChange: (speed: number) => void;
  onAddTrain: () => void;
  onRemoveTrain: (id: number) => void;
  onDeleteLine: () => void;
  onAddWagon: (id: number) => void;
  onRemoveWagon: (id: number) => void;
  onDownload: () => void;
  onBackToMenu: () => void;
  onRestart: () => void;
  onChangeRegion: () => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  isPanning: boolean;
  setIsPanning: (v: boolean) => void;
  dragStart: Station | null;
  setDragStart: (s: Station | null) => void;
  dragCurrent: Point | null;
  setDragCurrent: (p: Point | null) => void;
  hoveredStationRef: React.MutableRefObject<Station | null>;
  mousePosRef: React.MutableRefObject<Point>;
  showAudit: boolean;
  setShowAudit: (v: boolean) => void;
  showStrategist: boolean;
  setShowStrategist: (v: boolean) => void;
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const GameView: React.FC<GameViewProps> = (props) => {
  const { uiState, currentCity } = props;

  return (
    <>
      <div className="absolute top-8 left-8 z-50 pointer-events-auto flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-black">{currentCity?.name}</h1>
          <div className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase rounded-sm">Week {uiState.level}</div>
        </div>
        <p className="text-[10px] font-bold uppercase opacity-40 tracking-[0.3em] text-black">{DAYS[Math.floor(uiState.daysElapsed % 7)]}</p>
        <div className="flex items-center gap-2 mt-4">
          <button onClick={props.onBackToMenu} className="text-[9px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 text-black text-left">← Main Hub</button>
          <span className="w-1 h-1 bg-black/10 rounded-full" />
          <span className="text-[8px] font-black uppercase opacity-20 tracking-widest text-black">Autosave Active</span>
        </div>
      </div>

      <Stats 
        score={uiState.score} 
        timeScale={uiState.timeScale} 
        onSpeedChange={props.onSpeedChange} 
      />

      <ResourcePanel 
        resources={uiState.resources} 
        activeLineIdx={props.activeLineIdx} 
        onLineIdxChange={props.setActiveLineIdx} 
        lines={uiState.lines} 
        stations={uiState.stations}
        onAddTrain={props.onAddTrain} 
        onRemoveTrain={props.onRemoveTrain}
        onDeleteLine={props.onDeleteLine} 
        onAudit={() => props.setShowAudit(!props.showAudit)}
        onAddWagon={props.onAddWagon}
        onRemoveWagon={props.onRemoveWagon}
        onDownload={props.onDownload}
      />
      
      <KeyboardHints />

      <GameCanvas
        canvasRef={props.canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        camera={props.camera}
        setCamera={props.setCamera}
        engineRef={props.engineRef}
        currentCity={props.currentCity}
        activeLineIdx={props.activeLineIdx}
        setActiveLineIdx={props.setActiveLineIdx}
        syncStateImmediate={props.syncStateImmediate}
        isDragging={props.isDragging}
        setIsDragging={props.setIsDragging}
        isPanning={props.isPanning}
        setIsPanning={props.setIsPanning}
        dragStart={props.dragStart}
        setDragStart={props.setDragStart}
        dragCurrent={props.dragCurrent}
        setDragCurrent={props.setDragCurrent}
        hoveredStationRef={props.hoveredStationRef}
        mousePosRef={props.mousePosRef}
      />

      <div className="fixed bottom-32 left-8 z-50 flex flex-col gap-2">
        <button onClick={() => props.setShowStrategist(!props.showStrategist)} className="bg-black text-white w-12 h-12 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all" title="AI Strategist"><span className="text-xl">🧠</span></button>
      </div>

      {props.showStrategist && <Strategist gameState={uiState} onClose={() => props.setShowStrategist(false)} />}
      
      {props.showAudit && (
        <div className="fixed bottom-32 left-8 z-[100] bg-white p-6 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-w-[300px]">
           <h4 className="text-[10px] font-black uppercase mb-4 tracking-widest border-b border-black pb-2 text-black">System Audit & Integrity</h4>
           <div className="mb-4 p-2 bg-black/5 text-[9px] font-mono leading-tight border border-black/10 text-black font-bold">
             STATUS: {SystemValidator.validateSystemState(uiState, currentCity!) ? 'OPTIMAL' : 'ADJUSTING'} <br/>
             VERIFICATION CYCLE: 5.0s
           </div>
           {Object.entries(uiState.totalResources).map(([k, v]) => (
             <div key={k} className="flex justify-between py-1.5 text-[10px] font-black uppercase border-b border-black last:border-0 text-black">
               <span className="opacity-70">{k}</span>
               <span className="tabular-nums font-black">{uiState.resources[k as keyof typeof uiState.resources]} / {v}</span>
             </div>
           ))}
        </div>
      )}

      {uiState.isPausedForReward && uiState.pendingRewardOptions && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-white/40 backdrop-blur-sm">
          <div className="bg-white p-12 max-w-2xl w-full border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95">
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b-4 border-black pb-4 text-black">System Expansion</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {uiState.pendingRewardOptions.map(choice => (
                <button key={choice.id} onClick={() => { props.engineRef.current?.selectReward(choice); props.syncStateImmediate(); }} className="group flex flex-col items-center p-8 bg-white border-4 border-black hover:bg-black hover:text-white transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-2 hover:translate-y-2">
                  <span className="text-[10px] font-black uppercase mb-2 text-black group-hover:text-white">{choice.label}</span>
                  <span className="text-xl font-black uppercase text-center leading-tight text-black group-hover:text-white">{choice.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!uiState.gameActive && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white p-12 max-w-xl w-full border-4 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-105">
            <h2 className="text-5xl font-black uppercase tracking-tighter mb-4 text-black border-b-8 border-black pb-4">System Halted</h2>
            <p className="text-xl font-black uppercase mb-12 text-black/60 tracking-tight">One of your stations reached critical capacity.</p>
            
            <div className="grid grid-cols-2 gap-1 mb-12 bg-black border-2 border-black">
              <StatCard label="Final Throughput" val={uiState.score} />
              <StatCard label="Weeks Operational" val={uiState.level} />
              <StatCard label="Network Size" val={uiState.stations.length} />
              <StatCard label="Transit Lines" val={uiState.lines.length} />
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={props.onRestart}
                className="w-full py-6 bg-[#2ECC71] text-white border-4 border-black text-2xl font-black uppercase tracking-tighter shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                Re-Initialize Network
              </button>
              <button 
                onClick={props.onChangeRegion}
                className="w-full py-4 bg-white text-black border-4 border-black text-lg font-black uppercase tracking-tighter hover:bg-black hover:text-white transition-colors"
              >
                Change Region
              </button>
              <button 
                onClick={props.onDownload}
                className="w-full py-2 bg-black text-white text-[10px] font-black uppercase"
              >
                Download Analysis Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const StatCard = ({ label, val }: { label: string, val: number | string }) => (
  <div className="bg-white p-6 flex flex-col justify-center border border-black">
    <span className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">{label}</span>
    <span className="text-4xl font-black text-black tabular-nums leading-none">{val}</span>
  </div>
);
