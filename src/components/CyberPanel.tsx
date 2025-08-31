import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/***********************\n * Encryption Visualizer\n ***********************/
interface Step {
  id: string; label: string; desc: string; duration: number; // ms simulated
}

type Algo = 'AES-256' | 'RSA-OAEP';

const algoSteps: Record<Algo, Step[]> = {
  'AES-256': [
    { id: 'pad', label: 'Padding', desc: 'PKCS#7 style padding added to align block size (16B).', duration: 700 },
    { id: 'sub', label: 'SubBytes', desc: 'Non-linear byte substitution using S-box.', duration: 900 },
    { id: 'shift', label: 'ShiftRows', desc: 'Row-wise cyclic left shifts increase diffusion.', duration: 700 },
    { id: 'mix', label: 'MixColumns', desc: 'Column mix via Galois field transform.', duration: 900 },
    { id: 'round', label: 'Round Keys', desc: 'XOR with round key derived from key schedule.', duration: 600 },
    { id: 'final', label: 'Final Cipher', desc: 'Output ciphertext block(s).', duration: 500 },
  ],
  'RSA-OAEP': [
    { id: 'hashLbl', label: 'Label Hash', desc: 'Hash optional label to fixed length.', duration: 600 },
    { id: 'seed', label: 'Random Seed', desc: 'Generate secure random seed.', duration: 600 },
    { id: 'mgf', label: 'MGF1 Mask', desc: 'Derive masks with MGF1 and XOR (OAEP).', duration: 900 },
    { id: 'assemble', label: 'Encode Block', desc: 'Concatenate DB, seed, apply masks.', duration: 900 },
    { id: 'modexp', label: 'Mod Exp', desc: 'Modular exponentiation with public key.', duration: 1100 },
    { id: 'final', label: 'Ciphertext', desc: 'Encoded integer -> byte array.', duration: 500 },
  ]
};

const generateSimCipher = (algo: Algo, input: string) => {
  const digest = btoa(unescape(encodeURIComponent(input))).slice(0, 24);
  if (algo === 'AES-256') return digest.replace(/=+$/,'') + '.blk';
  return '0x' + Array.from(digest).map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('').slice(0,48);
};

// Shared style tokens for consistent hierarchy
const BTN_BASE = 'px-3 py-1 rounded border text-xs font-medium tracking-tight transition focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed';
const BADGE_BASE = 'text-[10px] px-2 py-0.5 rounded border font-mono tracking-tight';
const SECTION_TITLE = 'text-sm font-semibold text-primary tracking-wide';
const SUBTEXT = 'text-[10px] text-muted-foreground';

const EncryptionVisualizer: React.FC = () => {
  const [algo, setAlgo] = useState<Algo>('RSA-OAEP');
  const [plaintext, setPlaintext] = useState('hello visitor');
  const [running, setRunning] = useState(false);
  const [progressIdx, setProgressIdx] = useState<number>(-1);
  const [cipher, setCipher] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const controllerRef = useRef<{ cancelled: boolean } | null>(null);

  const steps = algoSteps[algo];

  const run = useCallback(async () => {
    if (running) return; setCipher(''); setElapsed(0); setProgressIdx(-1);
    const ctrl = { cancelled: false }; controllerRef.current = ctrl; setRunning(true);
    let total = 0;
    for (let i = 0; i < steps.length; i++) {
      if (ctrl.cancelled) return; setProgressIdx(i);
      const d = steps[i].duration; const start = performance.now();
      await new Promise(res => setTimeout(res, d));
      total += performance.now() - start; setElapsed(total);
    }
    setCipher(generateSimCipher(algo, plaintext));
    setRunning(false); setProgressIdx(steps.length);
  }, [steps, algo, plaintext, running]);

  const cancel = () => { if (controllerRef.current) controllerRef.current.cancelled = true; setRunning(false); setProgressIdx(-1); };

  return (
    <Card className="p-4 bg-card/70 backdrop-blur border-border flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className={SECTION_TITLE}>Encryption Visualizer</h2>
        <select value={algo} onChange={e=>setAlgo(e.target.value as Algo)} className="bg-background/60 border border-border text-xs px-2 py-1 rounded outline-none font-mono">
          <option>AES-256</option>
          <option>RSA-OAEP</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <textarea value={plaintext} onChange={e=>setPlaintext(e.target.value.slice(0,120))} rows={2} className="w-full resize-none bg-background/60 border border-border rounded px-2 py-1 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="flex gap-2 flex-wrap">
          <button onClick={run} disabled={running} className={cn(BTN_BASE, running? 'border-border text-muted-foreground':'border-primary/50 text-primary hover:bg-primary/10')}>{running? 'Running':'Run'}</button>
          {running && <button onClick={cancel} className={cn(BTN_BASE,'border-destructive/50 text-destructive hover:bg-destructive/10')}>Cancel</button>}
          {cipher && <button onClick={()=>navigator.clipboard.writeText(cipher)} className={cn(BTN_BASE,'border-border/60 text-muted-foreground hover:text-card-foreground hover:bg-background/40')}>Copy</button>}
        </div>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto pr-1 thin-scroll">
        {steps.map((s, i)=>{
          const state = i < progressIdx ? 'done' : i === progressIdx ? 'active' : 'idle';
          return (
            <div key={s.id} className={cn('rounded border px-2 py-1 flex flex-col gap-0.5 transition bg-gradient-to-r text-xs',
              state==='done' && 'border-emerald-500/40 from-emerald-500/10 to-transparent',
              state==='active' && 'border-primary from-primary/10 to-transparent animate-pulse',
              state==='idle' && 'border-border/60 from-background/40 to-transparent')}> 
              <div className="flex justify-between text-[11px] font-medium text-card-foreground"><span>{i+1}. {s.label}</span> {state==='done' && <span className="text-emerald-400">✓</span>}</div>
              <div className="text-[10px] text-muted-foreground leading-snug">{s.desc}</div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center pt-1 border-t border-border/50">
        <span className={SUBTEXT}>{progressIdx === steps.length ? 'Complete' : running? 'Simulating…' : 'Idle'}</span>
        <span className="tabular-nums text-[10px] text-muted-foreground">{Math.round(elapsed)} ms</span>
      </div>
      {cipher && <div className="mt-1 text-xs font-mono break-all bg-background/60 rounded p-2 border border-border/60"><span className="text-muted-foreground mr-1">cipher:</span>{cipher}</div>}
    </Card>
  );
};

/***********************\n * CTF Challenge Puzzle\n ***********************/
interface PuzzleLine { id: string; content: string; kind: 'out' | 'sys' | 'err' | 'root'; }

const FINAL_FLAG = 'FLAG{ur_cr@ck3d_brUh}';
const HIDDEN_FILENAME = '.shadow';
const READ_ME = 'readme.txt';
const FINAL_CIPHER = 'c3Nz.blk'; // from encryption tab when input = 'sss'

const firstGreeting = `There is a puzzle buried in this sandboxed shell. Escalate, enumerate, observe.`;

const rootRiddle = `I hide in plain sight yet ls ignores me. Reveal all and you\'ll see me. Then read what I whisper.`;
const escalateRiddle = `I speak before the crown is worn:\nThe path to secrets stays withdrawn.\nAscend with ritual (two words, both short),\nThen list again for a hidden report.`;
const cipherRiddle = `Three roles rotate above: count their first initials then compress them. Present the cipher where S is the key. (use the encryption with the binary of 100000000)`;

const CTFChallenge: React.FC = () => {
  const [lines,setLines] = useState<PuzzleLine[]>([{ id:'intro', content:firstGreeting, kind:'sys'}]);
  const [input,setInput] = useState('');
  const [solved,setSolved] = useState(false);
  const [root,setRoot] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const [cwd] = useState('~');
  const [revealedHidden, setRevealedHidden] = useState(false);
  // const [readmeViewed, setReadmeViewed] = useState(false); // retained for potential future hint logic
  const [awaitingPassword, setAwaitingPassword] = useState(false);
  const PASSWORD = 'Geof"fr3y"!@yyerf';
  const [startTime,setStartTime] = useState<number|null>(null);
  const [bestTime,setBestTime] = useState<number|null>(null);
  const BEST_KEY = 'ctf_best_time_ms';
  const [celebrated, setCelebrated] = useState(false);
  const confettiContainerRef = useRef<HTMLDivElement | null>(null);

  // append utility to add a new line to transcript
  const append = (content: string, kind: PuzzleLine['kind'] = 'out') => {
    setLines(l => [...l, { id: Math.random().toString(36).slice(2), content, kind }]);
  };

  // Celebration (confetti + audio)
  useEffect(()=>{
    if(solved && !celebrated){
      setCelebrated(true);
      // Simple Web Audio chord
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const freqs = [440, 554.37, 659.25];
        freqs.forEach((f,i)=>{
          const o = ctx.createOscillator();
          const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = f;
            o.connect(g); g.connect(ctx.destination);
            const now = ctx.currentTime;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.25, now + 0.05 + i*0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + 1.4 + i*0.05);
            o.start(now + i*0.02);
            o.stop(now + 1.6 + i*0.05);
        });
      } catch {}
      // Confetti pieces
      const spawn = (count:number) => {
        const el = confettiContainerRef.current; if(!el) return;
        for(let i=0;i<count;i++){
          const piece = document.createElement('span');
          piece.className = 'cf-piece';
          const size = Math.random()*6 + 4;
          piece.style.width = size+'px';
          piece.style.height = size*0.6+'px';
          piece.style.left = (Math.random()*100)+'%';
          piece.style.background = ['#10b981','#6366f1','#0ea5e9','#f59e0b','#ef4444'][Math.floor(Math.random()*5)];
          piece.style.animationDelay = (Math.random()*0.3)+'s';
          piece.style.opacity = '0';
          el.appendChild(piece);
          // cleanup
          setTimeout(()=> piece.remove(), 4000);
        }
      };
      spawn(90);
    }
  },[solved, celebrated]);

  const promptTop = () => root ? `┌──(root㉿yyerf)-[${cwd}]` : `┌──(yyerf㉿portfolio)-[${cwd}]`;
  const promptBottom = () => root ? `└─$` : `└─$`;

  // colorize helper removed for consistency (not used for rendering lines list)

  const help = () => {
    append('help           show this help');
    append('ls [-a]        list files');
    append('cat <file>     read file');
    append('cipher <val>   attempt final cipher');
    append('submit <flag>  submit flag');
    append('clear          clear screen');
  };

  const doLs = (all:boolean) => {
    const base = [READ_ME];
    // hidden file only appears if root AND -a
    if(root && all){
      setRevealedHidden(true);
      append(base.concat([HIDDEN_FILENAME]).join('  '));
    } else {
      append(base.join('  '));
    }
  };

  const doCat = (file:string) => {
    if(file === READ_ME){
      append(escalateRiddle);
      return;
    }
    if(file === HIDDEN_FILENAME){
      if(!root){ append(`cat: ${file}: No such file or directory`,'err'); return; }
      if(!revealedHidden){ append('Permission denied (list with -a after escalation).','err'); return; }
      append(cipherRiddle);
      return;
    }
    append(`cat: ${file}: No such file or directory`,'err');
  };

  const tryCipher = (val:string) => {
    if(val === FINAL_CIPHER){
      append('Cipher accepted. Decrypting ...');
      append('Use submission: FLAG{ur_cr@ck3d_brUh}');
    } else append('Invalid cipher','err');
  };

  const onCommand = (raw:string) => {
    const t = raw.trim(); if(!t) return; setInput('');

  // Start timer on first real command
  if(startTime === null) setStartTime(performance.now());

    // Handle password entry phase (do NOT echo password or prompts)
    if(awaitingPassword){
      if(t === PASSWORD){
  setAwaitingPassword(false); setRoot(true); append('Privilege escalation successful. Welcome root.', 'root'); append(rootRiddle);
      } else {
        append('Sorry, try again.','err');
        // Keep waiting for password, do not expose typed input
      }
      return;
    }

    append(promptTop(),'sys'); append(promptBottom() + ' ' + t,'sys');
    const [cmd, ...rest] = t.split(/\s+/); const arg = rest.join(' ');
    switch(cmd){
      case 'help': return help();
      case 'clear': setLines([]); return;
      case 'sudo':
        if(rest[0]==='su') {
          if(root){ append('Already root.','err'); return; }
          setAwaitingPassword(true);
          append('[sudo] password for yyerf:','sys');
        } else append('usage: sudo su','err');
        return;
      case 'ls':
        doLs(rest.includes('-a')); return;
      case 'cat':
        if(!arg) { append('cat: missing operand','err'); return; }
        doCat(arg); return;
      case 'submit':
        if(arg === FINAL_FLAG){ 
          append('✔ Correct flag. Challenge complete.','root'); 
          setSolved(true);
          if(startTime !== null){
            const duration = performance.now() - startTime;
            // load existing best if not yet loaded
            let existingBest = bestTime;
            if(existingBest === null){
              try { const stored = localStorage.getItem(BEST_KEY); if(stored) existingBest = parseFloat(stored); } catch {}
            }
            if(existingBest === null || duration < existingBest){
              try { localStorage.setItem(BEST_KEY, duration.toString()); } catch {}
              setBestTime(duration);
            } else {
              setBestTime(existingBest);
            }
          }
        } else append('Incorrect flag','err');
        return;
      case 'cipher':
        tryCipher(arg); return;
      default:
        append('Unknown command','err');
    }
  };

  useEffect(()=>{ if(ref.current) ref.current.focus(); },[]);
  useEffect(()=>{ // load best from storage
    try { const stored = localStorage.getItem(BEST_KEY); if(stored) setBestTime(parseFloat(stored)); } catch {}
  },[]);

  const formatTime = (ms:number) => {
    const total = Math.floor(ms/1000); const m = Math.floor(total/60); const s = total%60; return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; };

  return (
    <Card className={cn('p-4 bg-card/70 backdrop-blur border-border flex flex-col gap-3 flex-1 min-h-0 relative overflow-hidden', solved && 'border-emerald-500/60 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]')}> 
      <div className="flex items-center justify-between gap-3">
        <h2 className={SECTION_TITLE}>CTF Micro Puzzle</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {bestTime !== null && (
            <div className={cn(BADGE_BASE,'border-border/60 text-muted-foreground bg-background/40')}>Best {formatTime(bestTime)}</div>
          )}
          <div className={cn(BADGE_BASE, solved? 'border-emerald-500 text-emerald-400 bg-emerald-500/10':'border-accent/40 text-accent bg-accent/10')}>{solved? 'Solved':'Active'}</div>
        </div>
      </div>
      {/* Confetti layer (always present for spawn target) */}
      <div ref={confettiContainerRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
      {solved && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm px-6 text-center animate-[fadeIn_.5s_ease]">
          <div className="max-w-sm space-y-4">
            <h3 className="text-2xl font-semibold text-card-foreground tracking-tight">Challenge Completed</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Well done. You enumerated, escalated, and extracted the flag. This exercise reflects a methodical approach: observation, controlled probing, and precise execution.
            </p>
            {startTime !== null && bestTime !== null && (
              <div className="text-xs font-mono text-muted-foreground">Best Time: {formatTime(bestTime)}</div>
            )}
            <div className="flex gap-2 justify-center">
              <button onClick={()=>navigator.clipboard.writeText(FINAL_FLAG)} className={cn(BTN_BASE,'border-primary/60 text-primary hover:bg-primary/10')}>Copy Flag</button>
              <button onClick={()=>{ setLines([{ id:'intro', content:firstGreeting, kind:'sys'}]); setSolved(false); setCelebrated(false); setStartTime(null); }} className={cn(BTN_BASE,'border-border/60 text-muted-foreground hover:text-card-foreground hover:bg-background/30')}>Replay</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-[18rem] overflow-y-auto font-mono text-xs space-y-0.5 pr-1 thin-scroll leading-snug">
        {lines.map(l=> <div key={l.id} className={cn(
          l.kind==='err' && 'text-destructive',
          l.kind==='sys' && (root? 'text-destructive':'text-primary'),
          l.kind==='root' && 'text-destructive font-semibold'
        )}>{l.content}</div>)}
      </div>
      <form onSubmit={e=>{ e.preventDefault(); onCommand(input); }} className="flex gap-2 items-start">
        <input ref={ref} disabled={solved} value={input} onChange={e=>setInput(e.target.value)} className="flex-1 bg-background/60 border border-border rounded px-2 py-1 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/30" placeholder="type command..." />
        <button disabled={!input.trim() || solved} className={cn(BTN_BASE,'border-primary/50 text-primary hover:bg-primary/10')}>Run</button>
      </form>
      <div className={SUBTEXT}>Do you have what it takes?</div>
    </Card>
  );
};

/***********************\n * Wrapper Panel\n ***********************/
const TabsButton: React.FC<{active:boolean; onClick:()=>void; children:React.ReactNode}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-3 py-1 rounded border text-xs font-medium tracking-tight transition focus:outline-none focus:ring-2 focus:ring-primary/40',
      active
        ? 'border-primary/60 text-primary bg-primary/10 shadow-sm'
        : 'border-border text-muted-foreground hover:text-card-foreground hover:bg-background/40'
    )}
  >{children}</button>
);

const CyberPanel: React.FC = () => {
  const [tab,setTab] = useState<'enc'|'ctf'>('ctf');
  return (
  <div className="flex flex-col gap-4 h-full">
      <div className="flex gap-2">
        <TabsButton active={tab==='ctf'} onClick={()=>setTab('ctf')}>CTF Puzzle</TabsButton>
        <TabsButton active={tab==='enc'} onClick={()=>setTab('enc')}>Encryption</TabsButton>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        {tab==='enc'? <EncryptionVisualizer /> : <CTFChallenge />}
      </div>
    </div>
  );
};

export default CyberPanel;
