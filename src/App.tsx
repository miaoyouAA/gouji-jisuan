import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Undo2, Plus, Minus, History, RotateCcw, HelpCircle, Zap, X } from 'lucide-react';
import { cn } from './lib/utils';

const PLAYERS = ['上联', '对家', '下联', '上家', '自家', '下家'] as const;
type Player = typeof PLAYERS[number];

const CARD_TUPLE = ['鹰', '大王', '小王', '2', 'A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3'] as const;
type Card = typeof CARD_TUPLE[number];
const CARDS: Card[] = [...CARD_TUPLE];

const INITIAL_TOTALS: Record<Card, number> = {
  '鹰': 6, '大王': 6, '小王': 6, '2': 24,
  'A': 24, 'K': 24, 'Q': 24, 'J': 24, '10': 24,
  '9': 24, '8': 24, '7': 24, '6': 24, '5': 24, '4': 24, '3': 6,
};

type Action = 
  | { type: 'PLAY'; id: string; player: Player; count: number; card: Card; timestamp: number }
  | { type: 'PLAY_UNKNOWN'; id: string; player: Player; count: number; timestamp: number }
  | { type: 'GLOBAL_DEDUCT'; id: string; card: Card; count: number; timestamp: number }
  | { type: 'ADJUST_REMAINING'; id: string; player: Player; delta: number; timestamp: number }
  | { type: 'EXCHANGE'; id: string; from: Player; to: Player; count: number; timestamp: number; exchangeType: string };

interface PlayerState {
  remaining: number;
  exchangeNet: number;
  playedTotal: number;
  unknownPlayed: number;
  playedCards: Record<Card, number>;
  lastPlays: { card: Card | '未知', count: number, timestamp: number }[];
}

export default function App() {
  const [baseCardsPerPerson] = useState(51); // 去掉3之后初始51张牌
  const [selectedPlayer, setSelectedPlayer] = useState<Player>('对家');
  const [actions, setActions] = useState<Action[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCount, setSelectedCount] = useState<number>(1);

  const gameState = useMemo(() => {
    const state: Record<Player, PlayerState> = {} as Record<Player, PlayerState>;
    PLAYERS.forEach(p => {
      state[p] = {
        remaining: baseCardsPerPerson,
        exchangeNet: 0,
        playedTotal: 0,
        unknownPlayed: 0,
        playedCards: Object.fromEntries(CARDS.map(c => [c, 0])) as Record<Card, number>,
        lastPlays: []
      };
    });

    const globalPlayed = Object.fromEntries(CARDS.map(c => [c, 0])) as Record<Card, number>;
    const globalDeducted = Object.fromEntries(CARDS.map(c => [c, 0])) as Record<Card, number>;

    actions.forEach(action => {
      if (action.type === 'PLAY') {
        state[action.player].remaining -= action.count;
        state[action.player].playedTotal += action.count;
        state[action.player].playedCards[action.card] += action.count;
        globalPlayed[action.card] += action.count;
        state[action.player].lastPlays.push({ card: action.card, count: action.count, timestamp: action.timestamp });
      } else if (action.type === 'PLAY_UNKNOWN') {
        state[action.player].remaining -= action.count;
        state[action.player].playedTotal += action.count;
        state[action.player].unknownPlayed += action.count;
        state[action.player].lastPlays.push({ card: '未知', count: action.count, timestamp: action.timestamp });
      } else if (action.type === 'ADJUST_REMAINING') {
        state[action.player].remaining += action.delta;
        state[action.player].exchangeNet += action.delta;
      } else if (action.type === 'GLOBAL_DEDUCT') {
        globalDeducted[action.card] += action.count;
      } else if (action.type === 'EXCHANGE') {
        state[action.from].remaining -= action.count;
        state[action.from].exchangeNet -= action.count;
        state[action.to].remaining += action.count;
        state[action.to].exchangeNet += action.count;
      }
    });

    return { players: state, globalPlayed, globalDeducted };
  }, [actions, baseCardsPerPerson]);

  const handlePlayCard = useCallback((card: Card, count: number = selectedCount) => {
    const newAction: Action = { type: 'PLAY', id: Math.random().toString(36).substring(2, 9), player: selectedPlayer, count, card, timestamp: Date.now() };
    setActions(prev => [...prev, newAction]);
    setSelectedCount(1);
  }, [selectedPlayer, selectedCount]);

  const handlePlayUnknown = useCallback((player: Player, count: number) => {
    const newAction: Action = { type: 'PLAY_UNKNOWN', id: Math.random().toString(36).substring(2, 9), player, count, timestamp: Date.now() };
    setActions(prev => [...prev, newAction]);
    setSelectedCount(1);
  }, []);

  const handleAdjustRemaining = useCallback((player: Player, delta: number) => {
    const newAction: Action = { type: 'ADJUST_REMAINING', id: Math.random().toString(36).substring(2, 9), player, delta, timestamp: Date.now() };
    setActions(prev => [...prev, newAction]);
  }, []);

  const handleGlobalDeduct = useCallback((card: Card, count: number) => {
    const newAction: Action = { type: 'GLOBAL_DEDUCT', id: Math.random().toString(36).substring(2, 9), card, count, timestamp: Date.now() };
    setActions(prev => [...prev, newAction]);
  }, []);

  const cyclePlayer = useCallback(() => {
    setSelectedPlayer(prev => PLAYERS[(PLAYERS.indexOf(prev) + 1) % PLAYERS.length]);
  }, []);

  const handleUndo = () => {
    setActions(prev => prev.length === 0 ? prev : prev.slice(0, -1));
  };

  const handleReset = () => {
    window.location.reload();
  };

  const currentStatusCards = ['鹰', '大王', '小王', '2', 'A', 'K', 'Q', 'J'] as const;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-slate-800 font-sans">
      
      {/* Tight Header */}
      <header className="shrink-0 w-full px-4 py-2 flex items-center justify-between bg-white/70 backdrop-blur-xl border-b border-white shadow-sm z-30">
        <div className="flex items-center gap-3">
           <h1 className="text-xl font-black bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent leading-none">
             Macaroon V3
           </h1>
           <span className="text-[10px] font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
             强黑字体/完全清晰版
           </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs transition-all border border-indigo-100/50">
            <HelpCircle className="w-3.5 h-3.5" /> 说明
          </button>
          <button onClick={handleUndo} disabled={actions.length === 0} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 font-bold text-xs transition-all disabled:opacity-50 active:scale-95 shadow-sm">
            <Undo2 className="w-3.5 h-3.5" /> 撤销
          </button>
          <button onClick={handleReset} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-bold text-xs transition-all active:scale-95 shadow-sm">
            <RotateCcw className="w-3.5 h-3.5" /> 刷新(新开局)
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col md:flex-row p-2 gap-3 w-full max-w-[1600px] mx-auto">
        
        {/* Left Area: Global & Players */}
        <div className="flex-1 flex flex-col min-h-0 gap-2 min-w-0">
          
          {/* Global Status (Top Power Cards) */}
          <div className="shrink-0 grid grid-cols-4 md:grid-cols-8 gap-1.5">
             {currentStatusCards.map(c => {
                const left = INITIAL_TOTALS[c] - gameState.globalPlayed[c] - gameState.globalDeducted[c];
                const pct = (left / INITIAL_TOTALS[c]) * 100;
                const highlight = c === '鹰' ? 'text-cyan-600' : c === '大王' ? 'text-amber-600' : c === '小王' ? 'text-rose-500' : c === '2' ? 'text-blue-500' : 'text-indigo-600';
                const bgHlt = c === '鹰' ? 'bg-cyan-500' : c === '大王' ? 'bg-amber-500' : c === '小王' ? 'bg-rose-400' : c === '2' ? 'bg-blue-500' : 'bg-indigo-500';

                return (
                  <div key={c} className="bg-white/80 border border-white rounded-xl p-1.5 flex flex-col items-center justify-center shadow-sm">
                    <div className="text-slate-400 text-[10px] font-bold tracking-tighter leading-none mb-1">公库剩余 {c}</div>
                    <div className={cn("text-xl md:text-2xl font-black tracking-tight leading-none", left <= 0 ? "text-slate-300" : highlight)}>
                      {Math.max(0, left)}
                    </div>
                    {gameState.globalDeducted[c] > 0 && <span className="absolute top-0 right-0 text-[8px] font-bold bg-rose-50 text-rose-500 px-1 rounded-bl-sm border border-rose-100">-{gameState.globalDeducted[c]}</span>}
                    <div className="w-[85%] h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                       <div className={cn("h-full transition-all duration-500", bgHlt)} style={{ width: `${Math.max(0, pct)}%` }} />
                    </div>
                  </div>
                );
             })}
          </div>

          {/* Players Grid (3x2 Dense Layout) */}
          <div className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-3 grid-rows-3 lg:grid-rows-2 gap-2">
            {PLAYERS.map((p) => (
              <PlayerCard 
                key={p}
                player={p}
                state={gameState.players[p]}
                isActive={selectedPlayer === p}
                onSelect={() => setSelectedPlayer(p)}
                onAdjust={(delta: number) => handleAdjustRemaining(p, delta)}
              />
            ))}
          </div>

        </div>

        {/* Right Area: Terminal, History, Controls */}
        <div className="w-full md:w-[340px] lg:w-[380px] flex flex-col shrink-0 gap-3 min-h-0">
          
          {/* Terminal */}
          <ActionTerminal 
             selectedPlayer={selectedPlayer}
             onPlay={handlePlayCard}
             onPlayUnknown={handlePlayUnknown}
             onGlobalDeduct={handleGlobalDeduct}
             onCyclePlayer={cyclePlayer}
          />

          {/* Action Log (Middle scrolling area - Made Smaller) */}
          <div className="h-[120px] lg:h-[130px] shrink-0 bg-white/70 backdrop-blur-md rounded-2xl border border-white p-2 shadow-sm flex flex-col">
             <div className="flex items-center gap-1.5 mb-1.5 px-1 shrink-0">
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-400">操作历史流 STREAM</span>
             </div>
             <div className="flex-1 overflow-y-auto macaroon-scrollbar pr-1 flex flex-col-reverse gap-1">
               {actions.slice(0).reverse().map((a, i) => (
                  <div key={a.id} className={cn("flex flex-col text-[11px] leading-tight px-2 py-1 rounded", i === 0 ? "bg-white shadow-sm border border-indigo-50 font-bold text-slate-800" : "text-slate-500")}>
                     <div className="flex justify-between items-center opacity-60 text-[9px] mb-0.5">
                        <span>{new Date(a.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                        <span>{a.type}</span>
                     </div>
                     {a.type === 'PLAY' ? (
                        <span><span className="text-indigo-500">{a.player}</span> 出牌 <strong className="text-indigo-600 border-b border-indigo-200">{a.card}</strong> x{a.count}</span>
                     ) : a.type === 'PLAY_UNKNOWN' ? (
                        <span><span className="text-indigo-500">{a.player}</span> 扣减未明牌 x{a.count}</span>
                     ) : a.type === 'ADJUST_REMAINING' ? (
                        <span><span className="text-indigo-500">{a.player}</span> 手牌硬调 {a.delta > 0 ? '+'+a.delta : a.delta}</span>
                     ) : a.type === 'GLOBAL_DEDUCT' ? (
                        <span className="text-rose-500">公库报削 <strong className="border-b border-rose-200">{a.card}</strong> x{a.count}</span>
                     ) : (
                        <span className="text-purple-500"><span className="text-indigo-500">{a.from}</span> 转给 <span className="text-indigo-500">{a.to}</span> x{a.count}</span>
                     )}
                  </div>
               ))}
             </div>
          </div>

          {/* Manual Pad (Bottom flexible area - Enamored & Taller) */}
          <div className="flex-1 min-h-0 bg-white/80 backdrop-blur-md rounded-2xl border border-white p-3 lg:p-4 shadow-md flex flex-col gap-3">
             <div className="flex items-center gap-2 bg-indigo-50/50 p-1.5 rounded-xl shrink-0">
               <button onClick={() => setSelectedCount(Math.max(1, selectedCount - 1))} className="flex-1 h-9 flex justify-center items-center rounded-lg bg-white shadow-sm border border-indigo-100 text-slate-600 hover:text-indigo-600 font-black active:scale-95 transition-all"><Minus className="w-5 h-5" /></button>
               <div className="w-16 flex flex-col items-center">
                 <span className="text-xs text-indigo-400 font-bold mb-0.5 leading-none">准备出数</span>
                 <span className="text-2xl font-black text-indigo-600 font-mono leading-none">{selectedCount}</span>
               </div>
               <button onClick={() => setSelectedCount(selectedCount + 1)} className="flex-1 h-9 flex justify-center items-center rounded-lg bg-white shadow-sm border border-indigo-100 text-slate-600 hover:text-indigo-600 font-black active:scale-95 transition-all"><Plus className="w-5 h-5" /></button>
             </div>
             
             {/* 16 cards tight grid - Taller & more apparent */}
             <div className="grid grid-cols-4 gap-2 flex-1">
               {CARDS.map(c => {
                 const isPwr = ['鹰','大王','小王','2','A'].includes(c);
                 return (
                   <button 
                     key={c}
                     onClick={() => handlePlayCard(c)}
                     className={cn("w-full h-full min-h-[40px] rounded-xl font-black text-sm lg:text-base border-2 transition-all active:scale-95 shadow-sm flex items-center justify-center", 
                        isPwr ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
                   >
                     {c}
                   </button>
                 )
               })}
             </div>
          </div>

        </div>
      </main>
      
      <AnimatePresence>
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------

function PlayerCard({ player, state, isActive, onSelect, onAdjust }: any) {
  const isMe = player === '自家';
  
  return (
    <div 
      onClick={onSelect}
      className={cn(
        "flex flex-col bg-white/95 backdrop-blur-md rounded-2xl p-2.5 md:p-3 border-2 transition-all cursor-pointer shadow-sm relative",
        isActive ? "border-indigo-500 shadow-xl shadow-indigo-500/15 scale-[1.01]" : "border-slate-200 hover:border-indigo-300"
      )}
    >
      {isActive && <div className="absolute top-0 right-0 w-2 h-2 rounded-bl-lg rounded-tr-[10px] bg-indigo-500" />}
      
      <div className="flex justify-between items-center mb-1 md:mb-2">
        <span className={cn("font-black text-sm md:text-base tracking-widest flex items-center gap-1", isActive ? "text-indigo-600" : isMe ? "text-purple-600":"text-slate-600")}>
          {player}
          <span className="text-[9px] bg-slate-100/80 text-slate-400 px-1 py-0.5 rounded font-normal tracking-normal border border-slate-200">去3后初始51</span>
        </span>
        <div className="flex items-center bg-indigo-50/50 border border-indigo-100 rounded-lg p-0.5">
          <button onClick={e => { e.stopPropagation(); onAdjust(-1) }} className="w-6 h-6 md:w-7 md:h-7 flex justify-center items-center rounded-md bg-white shadow-sm text-slate-500 hover:text-rose-500 hover:bg-rose-50 border border-slate-100 font-bold active:scale-90 transition-all"><Minus className="w-4 h-4" /></button>
          <div className="w-10 flex flex-col items-center justify-center">
             <span className={cn("font-black text-xl md:text-2xl tracking-tighter leading-none mb-0.5", state.remaining <= 0 ? "text-rose-500" : "text-indigo-700")}>{state.remaining}</span>
             <span className="text-[8px] font-bold text-slate-400 scale-90 leading-none">余牌</span>
          </div>
          <button onClick={e => { e.stopPropagation(); onAdjust(1) }} className="w-6 h-6 md:w-7 md:h-7 flex justify-center items-center rounded-md bg-white shadow-sm text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 border border-slate-100 font-bold active:scale-90 transition-all"><Plus className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-1.5 px-0.5">
        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold border border-slate-200">累积出: <strong className="text-slate-800">{state.playedTotal}</strong></span>
        <span className="text-[10px] text-slate-400 font-bold">手动买减差: <span className={state.exchangeNet>0?'text-emerald-500 bg-emerald-50 px-1 rounded':'text-rose-500 bg-rose-50 px-1 rounded'}>{state.exchangeNet>0?'+':''}{state.exchangeNet}</span></span>
      </div>

      {/* Extreme High Visibility Card Matrix */}
      <div className="flex-1 grid grid-cols-8 gap-1 mb-2 items-start bg-slate-100 p-1.5 rounded-xl border border-slate-300 shadow-inner">
         {CARDS.map(c => {
           const count = state.playedCards[c];
           const hasCount = count > 0;
           
           // FULL CONTRAST ALL THE TIME - Deep Slate text + Clean White bg
           let colorClasses = "bg-white text-black border border-slate-400 shadow-sm"; 
           
           if (hasCount) {
             if (c === '鹰') colorClasses = "bg-cyan-100 border-2 border-cyan-500 text-cyan-950 shadow-md";
             else if (c === '大王') colorClasses = "bg-amber-200 border-2 border-amber-600 text-amber-950 shadow-md";
             else if (c === '小王') colorClasses = "bg-rose-200 border-2 border-rose-600 text-rose-950 shadow-md";
             else if (c === '2') colorClasses = "bg-blue-100 border-2 border-blue-600 text-blue-950 shadow-md";
             else if (c === 'A' || c === 'K') colorClasses = "bg-purple-100 border-2 border-purple-600 text-purple-950 shadow-md";
             else colorClasses = "bg-indigo-50 border-2 border-indigo-500 text-indigo-950 shadow-md";
           }

           return (
             <div key={c} className={cn("flex flex-col items-center justify-center p-0.5 md:p-1 rounded-lg leading-none h-full min-h-[40px] transition-all", colorClasses)}>
               {/* 没出牌时字母居中，使用极粗绝对大字体！出牌后变成小蓝字/黑字 */}
               <span className={cn("font-black tracking-tighter transition-all", hasCount ? "text-[12px] opacity-90 mb-0.5" : "text-[15px] md:text-[17px]")}>{c}</span>
               {hasCount && <span className="text-[18px] md:text-[22px] font-black">{count}</span>}
             </div>
           )
         })}
      </div>

      <div className="mt-auto flex items-center gap-2 bg-slate-100 border border-slate-300 shadow-sm rounded-lg p-1.5 overflow-hidden">
        <span className="text-[9px] font-black text-indigo-700 shrink-0 bg-indigo-100 px-1 border border-indigo-300 py-0.5 rounded">最近出出</span>
        <div className="flex gap-1 overflow-hidden">
          {state.lastPlays.length > 0 ? state.lastPlays.slice(-4).reverse().map((lp: any, i: number) => (
             <span key={i} className={cn("text-[10px] px-1.5 py-0.5 rounded-md whitespace-nowrap font-bold", i===0?"bg-indigo-600 text-white shadow-md":"text-slate-800 bg-white border border-slate-300 shadow-sm")}>
               {lp.card}<span className="opacity-70 scale-90 inline-block mx-[1px]">x</span>{lp.count}
             </span>
          )) : <span className="text-[10px] text-slate-600 font-bold px-1 py-0.5">无活动</span>}
        </div>
      </div>
    </div>
  )
}

function ActionTerminal({ selectedPlayer, onPlay, onPlayUnknown, onGlobalDeduct, onCyclePlayer }: any) {
  const [cmd, setCmd] = useState('');
  const [prompt, setPrompt] = useState<{ card: Card, isGlobal: boolean } | null>(null);
  const [numConfirm, setNumConfirm] = useState<number | null>(null);

  const cardMap = useMemo<Record<string, Card>>(() => ({ 
    'D': '大王', 'X': '小王', 'Y': '鹰', 
    'A': 'A', 'K': 'K', 'Q': 'Q', 'J': 'J', 
    '10': '10', '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', 
    'E': '2', '2': '2', 'S': '3', '大王': '大王', '小王': '小王', '王': '大王', '鹰': '鹰'
  }), []);

  const valIsGlobal = (c: string) => c.trim().toUpperCase().startsWith('G');

  const pureCmdProcessor = useCallback((pureCmd: string, isGlobal: boolean) => {
    let parsed = false;
    const regexChinese = /(\d+)\s*(?:个|张|块|只|把)?\s*(10|大王|小王|王|鹰|[DXYAKQJ98765432ES])/ig;
    let match;
    while ((match = regexChinese.exec(pureCmd)) !== null) {
      let cardSymbol = match[2].toUpperCase();
      if (cardSymbol === '王') cardSymbol = 'D'; 
      const c = cardMap[cardSymbol] || cardMap[cardSymbol.replace('E', '2').replace('S', '3')];
      const count = parseInt(match[1], 10);
      if (c && count > 0) {
         isGlobal ? onGlobalDeduct(c, count) : onPlay(c, count);
         parsed = true;
      }
    }
    if (!parsed) {
        const regexStandard = /(10|[DXYAKQJ98765432ES])\s*[*xX\-]?\s*(\d+)/ig;
        const matches = [...pureCmd.matchAll(regexStandard)];
        matches.forEach(m => {
          let cardSymbol = m[1].toUpperCase();
          if (cardSymbol === 'E') cardSymbol = '2';
          if (cardSymbol === 'S') cardSymbol = '3';
          const c = cardMap[cardSymbol];
          const count = parseInt(m[2], 10);
          if (c && count > 0) {
             isGlobal ? onGlobalDeduct(c, count) : onPlay(c, count);
             parsed = true;
          }
        });
    }
    return parsed;
  }, [cardMap, onGlobalDeduct, onPlay]);

  return (
    <div className="shrink-0 bg-indigo-600 rounded-2xl p-3 md:p-4 shadow-lg shadow-indigo-600/40 border border-indigo-400">
      <div className="flex justify-between items-center mb-2.5">
         <span className="text-white font-black text-[11px] md:text-sm tracking-widest flex items-center gap-1.5">
           <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
           COMMAND T-X 
           {numConfirm !== null && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>}
         </span>
         <span className="text-[10px] text-indigo-100 border border-indigo-400/50 bg-black/20 px-2 py-0.5 rounded font-bold tracking-widest">空格键切人</span>
      </div>
      
      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm p-2 rounded-xl ring-2 ring-transparent focus-within:ring-white/30 transition-all shadow-inner">
         <div className={cn("text-xs md:text-sm font-black shrink-0 px-2.5 py-1.5 rounded-lg border", prompt?.isGlobal || valIsGlobal(cmd) ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-emerald-100 text-emerald-800 border-emerald-300")}>
           {prompt ? (prompt.isGlobal ? "TEAM GD" : selectedPlayer) : (valIsGlobal(cmd) ? "TEAM GD" : selectedPlayer)}
         </div>
         
         {numConfirm !== null && (
            <span className="text-rose-400 font-bold text-xs md:text-sm animate-pulse whitespace-nowrap bg-rose-900/50 px-2 py-1 rounded">再回车扣 {numConfirm} 张未知牌</span>
         )}
         
         <input 
           autoFocus
           type="text"
           value={cmd}
           onChange={e => { setCmd(e.target.value); setNumConfirm(null); }}
           onKeyDown={e => {
             if (e.code === 'Space' && !cmd) {
               e.preventDefault(); onCyclePlayer(); return;
             }
             if (e.key === 'Escape') { setPrompt(null); setNumConfirm(null); setCmd(''); }
             if (e.key === 'Enter') {
                const val = cmd.trim().toUpperCase();
                if (!val) return;
                // strict rule: pure absolute integer alone => adjust remain
                if (/^\d+$/.test(val)) {
                  const count = parseInt(val, 10);
                  if (numConfirm === count) { onPlayUnknown(selectedPlayer, count); setNumConfirm(null); setCmd(''); }
                  else { setNumConfirm(count); setCmd(val); }
                  return;
                }
                setNumConfirm(null);
                const isGb = valIsGlobal(val);
                const pure = isGb ? val.substring(1).trim() : val;
                if (cardMap[pure] && !/\d/.test(pure)) { setPrompt({ card: cardMap[pure], isGlobal: isGb }); setCmd(''); return; }
                if (pureCmdProcessor(pure, isGb)) { setCmd(''); } else { setCmd(''); }
             }
           }}
           placeholder={numConfirm ? "" : "举例: 5张A, E2, Y2"}
           className="bg-transparent text-white font-mono outline-none flex-1 placeholder:text-indigo-300/40 w-full min-w-0 text-sm md:text-base lg:text-lg font-black caret-white"
         />
      </div>
    </div>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-2xl w-full shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-2xl font-black text-indigo-600 flex items-center gap-2"><Zap className="w-6 h-6" /> 进阶手册</h2>
          <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-5 text-sm md:text-base text-slate-600 max-h-[70vh] overflow-y-auto">
          <section><h3 className="font-black text-indigo-600 mb-2">1. 命令行语法</h3>
            <ul className="list-disc pl-5 space-y-2 font-bold">
              <li><b>出牌记录</b>：输入 <code className="bg-slate-100 px-2 py-0.5 rounded text-indigo-600">5个3</code>、<code className="bg-slate-100 px-2 py-0.5 rounded text-indigo-600">A4</code>、<code className="bg-slate-100 px-2 py-0.5 rounded text-indigo-600">Y2</code> 等可瞬间多打。支持连打如 <code className="bg-slate-100 px-2 py-0.5 rounded text-indigo-600">A3 Y2 4张2</code>。</li>
              <li><b>代号映射</b>：D(大王) X(小王) Y(鹰) E(2) S(3)。</li>
            </ul>
          </section>
          <section><h3 className="font-black text-rose-500 mb-2">2. 盲扣总牌数 (纯数字防呆)</h3>
            <p className="font-bold">在指令框中仅输入一个数字（如 <code className="bg-slate-100 px-1 rounded text-rose-500">2</code>）然后按下回车。灯会闪烁警告您，再按一次回车确认执行，则该玩家只扣除总数 2，不记录任何出的具体牌面。</p>
            <p className="text-xs mt-2 text-slate-400 bg-slate-50 p-2 rounded">* 注：以前按 2 回车会导致误判。现在如果您想出一张具体的 2，请直接点击下方巨大的 2 按钮，或者在终端写 <code className="bg-white border p-0.5">1张2</code>。</p>
          </section>
          <section><h3 className="font-black text-emerald-500 mb-2">3. 买卖牌微调</h3>
            <ul className="list-disc pl-5 space-y-1 font-bold">
              <li><b>增减总量</b>：直接点击每个玩家卡片右上角的<code className="text-emerald-500"> + </code><code className="text-rose-500"> - </code>号。</li>
              <li><b>空格键</b>：在终端按空格可瞬切下个玩家。</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
