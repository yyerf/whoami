import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Types
interface Misconfig {
  id: string;
  label: string;
  weight: number; // contribution to risk (0-25 typical)
  category: 'network' | 'identity' | 'data' | 'config';
  hint: string;
  fixed?: boolean;
}

interface EventItem {
  id: string;
  ts: number;
  severity: 1 | 2 | 3 | 4 | 5;
  type: string;
  msg: string;
}

// Utility
const rand = (min:number,max:number)=> Math.random()*(max-min)+min;
const shortId = ()=> Math.random().toString(36).slice(2,8);

const BASE_MISCONFIG: Misconfig[] = [
  { id: 'open-ssh', label: 'Weak SSH Cipher Suite', weight: 18, category: 'network', hint: 'Remove deprecated ciphers + enforce ed25519 keys' },
  { id: 'default-creds', label: 'Default Credentials Detected', weight: 22, category: 'identity', hint: 'Rotate + enforce unique random secrets' },
  { id: 's3-public', label: 'Public Object Storage Bucket', weight: 20, category: 'data', hint: 'Restrict bucket policy + enable block public access' },
  { id: 'no-waf', label: 'Missing WAF/Layer7 Filtering', weight: 12, category: 'network', hint: 'Deploy WAF with baseline OWASP ruleset' },
  { id: 'jwt-long', label: 'Excessive JWT Lifetime', weight: 10, category: 'identity', hint: 'Reduce TTL & introduce refresh rotation' },
  { id: 'db-unencrypted', label: 'Database Volume Unencrypted', weight: 16, category: 'data', hint: 'Enable at-rest encryption (AES-256/GCM)' },
  { id: 'audit-off', label: 'Audit Logging Disabled', weight: 15, category: 'config', hint: 'Enable append-only audit logs + central shipping' },
];

const EVENT_TEMPLATES = [
  (sev: number) => ({ type: 'auth', msg: `Failed admin login from ${Math.floor(rand(10,250))}.x.x.${Math.floor(rand(1,255))}` , severity: sev as 1|2|3|4|5 }),
  (sev: number) => ({ type: 'scan', msg: `Port sweep detected on 10.0.0.${Math.floor(rand(10,240))}` , severity: sev as 1|2|3|4|5 }),
  (sev: number) => ({ type: 'policy', msg: 'IAM anomaly: token used from new geo', severity: sev as 1|2|3|4|5 }),
  (sev: number) => ({ type: 'db', msg: 'Abnormal query burst (possible exfil)', severity: sev as 1|2|3|4|5 }),
  (sev: number) => ({ type: 'edge', msg: 'Spike in 429 responses (rate limiting engaged)', severity: sev as 1|2|3|4|5 }),
];

// Gauge component (pure SVG)
const RiskGauge: React.FC<{score:number,max?:number}> = ({ score, max=100 }) => {
  const pct = Math.min(1, score / max);
  const angle = pct * 180; // semicircle
  const radius = 70;
  const cx = 80; const cy = 80; // center bottom aligned
  const startAngle = 180; // left
  const endAngle = 180 + angle;
  const polar = (ang:number)=> [cx + radius * Math.cos(ang*Math.PI/180), cy + radius * Math.sin(ang*Math.PI/180)];
  const [sx,sy] = polar(startAngle);
  const [ex,ey] = polar(endAngle);
  const largeArc = angle > 180 ? 1 : 0;
  const pathD = `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`;
  let tone = 'stroke-emerald-500';
  if (pct > 0.66) tone = 'stroke-red-500'; else if (pct > 0.33) tone = 'stroke-amber-500';
  return (
    <div className="relative flex flex-col items-center">
      <svg width={160} height={100} className="overflow-visible">
        <path d="M 10 80 A 70 70 0 0 1 150 80" className="stroke-muted/40" strokeWidth={14} fill="none" strokeLinecap="round" />
        <path d={pathD} className={cn(tone)} strokeWidth={14} fill="none" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={6} className="fill-background stroke-muted" strokeWidth={2} />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={cx + (radius-8) * Math.cos(endAngle*Math.PI/180)} y2={cy + (radius-8) * Math.sin(endAngle*Math.PI/180)} className="stroke-primary" strokeWidth={3} strokeLinecap="round" />
      </svg>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Risk Score</div>
      <div className="text-2xl font-bold text-card-foreground tabular-nums">{score}</div>
      <div className="text-[10px] text-muted-foreground">/ {max}</div>
    </div>
  );
};

const CategoryBadge: React.FC<{c:Misconfig['category']}> = ({ c }) => {
  const map: Record<string,string> = {
    network: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    identity: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    data: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    config: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  };
  return <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', map[c])}>{c}</span>;
};

const severityDot = (s:number)=> ({
  className: cn('inline-block w-2 h-2 rounded-full',
    s>=4 ? 'bg-red-500 animate-pulse' : s===3 ? 'bg-amber-400' : s===2 ? 'bg-yellow-300' : 'bg-emerald-500')
});

const SecurityRiskPanel: React.FC = () => {
  // Misconfig state
  const [items, setItems] = useState<Misconfig[]>(BASE_MISCONFIG.slice(0,5));
  const [showAll, setShowAll] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [auto, setAuto] = useState(true);

  // Derived risk
  const risk = useMemo(()=> items.filter(i=>!i.fixed).reduce((a,b)=> a + b.weight, 0), [items]);
  const max = useMemo(()=> BASE_MISCONFIG.slice(0,5).reduce((a,b)=> a + b.weight, 0), []);

  // Event generator
  useEffect(()=>{
    if(!auto) return;
    const id = setInterval(()=>{
      setEvents(ev=>{
        const tmpl = EVENT_TEMPLATES[Math.floor(Math.random()*EVENT_TEMPLATES.length)];
        const sev = Math.ceil(rand(1,5));
        const { type, msg, severity } = tmpl(sev);
        const e: EventItem = { id: shortId(), ts: Date.now(), type, msg, severity };
        return [e, ...ev].slice(0,25);
      });
    }, 2500);
    return ()=> clearInterval(id);
  }, [auto]);

  const toggleFix = (id:string) => {
    setItems(list => list.map(m => m.id === id ? { ...m, fixed: !m.fixed } : m));
  };

  const addMore = () => {
    setItems(list => {
      const remaining = BASE_MISCONFIG.filter(b => !list.find(l => l.id === b.id));
      if(!remaining.length) return list;
      return [...list, remaining[0]];
    });
  };

  return (
    <Card className="p-4 bg-card/70 backdrop-blur relative flex flex-col gap-4 h-full border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-primary tracking-wide">Security Posture</h2>
          <p className="text-[11px] text-muted-foreground">Simulated environment metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setAuto(a=>!a)} className={cn('text-[11px] px-2 py-1 rounded border transition', auto ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-muted text-muted-foreground hover:text-card-foreground')}>{auto? 'Live':'Paused'}</button>
          <button onClick={addMore} className="text-[11px] px-2 py-1 rounded border border-muted text-muted-foreground hover:text-card-foreground">Add</button>
        </div>
      </div>

      {/* Gauge + Summary */}
      <div className="flex gap-4">
        <RiskGauge score={Math.round(risk)} max={Math.round(max)} />
        <div className="flex-1 grid grid-cols-2 gap-3 text-[11px] content-start">
          <div className="col-span-2 font-mono text-muted-foreground">risk = Σ(weightᵢ) of unresolved misconfigurations</div>
          <div><span className="text-card-foreground font-semibold">{items.filter(i=>!i.fixed).length}</span> open issues</div>
          <div><span className="text-card-foreground font-semibold">{events.slice(0,5).filter(e=>e.severity>=4).length}</span> high alerts (recent)</div>
          <div className="col-span-2 ">
            <div className="h-1.5 w-full bg-muted/40 rounded overflow-hidden">
              <div style={{ width: `${(risk/max)*100}%`}} className={cn('h-full transition-all duration-700', risk/max > .66 ? 'bg-red-500' : risk/max > .33 ? 'bg-amber-400' : 'bg-emerald-500')} />
            </div>
            <div className="text-[10px] mt-1 text-muted-foreground">Mitigate issues to lower score.</div>
          </div>
        </div>
      </div>

      {/* Misconfigurations list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Misconfigurations</h3>
          <button onClick={()=>setShowAll(s=>!s)} className="text-[10px] text-accent hover:underline">{showAll? 'collapse':'expand'}</button>
        </div>
        <ul className="space-y-1 pr-1 max-h-40 overflow-y-auto thin-scroll">
          {items.slice(0, showAll? items.length : 4).map(m => {
            const disabled = !!m.fixed;
            return (
              <li key={m.id} className={cn('group border border-border/60 rounded px-2 py-1.5 flex items-start gap-2 text-[11px] transition bg-gradient-to-br from-background/60 to-background/20', disabled && 'opacity-50')}>                
                <button onClick={()=>toggleFix(m.id)} className={cn('mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] font-bold', disabled ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-400':'border-red-500/50 text-red-500 hover:bg-red-500/10')} title={disabled? 'Re-open':'Mark fixed'}>
                  {disabled? '✓':'!'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-card-foreground truncate" title={m.label}>{m.label}</span>
                    <CategoryBadge c={m.category} />
                    <span className="text-[10px] text-muted-foreground">w:{m.weight}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 group-hover:line-clamp-none">{m.hint}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Recent Events */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-1">
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Recent Events</h3>
            <div className="flex gap-2 items-center">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full" /> <span className="text-[9px] text-muted-foreground">high</span>
                <span className="w-2 h-2 bg-amber-400 rounded-full" /> <span className="text-[9px] text-muted-foreground">med</span>
                <span className="w-2 h-2 bg-emerald-500 rounded-full" /> <span className="text-[9px] text-muted-foreground">low</span>
              </div>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 space-y-1 thin-scroll">
          {events.map(e => (
            <div key={e.id} className="flex items-start gap-2 text-[11px] px-2 py-1 rounded border border-border/60 bg-background/40">
              <span {...severityDot(e.severity)} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-card-foreground truncate">{e.type}</span>
                  <span className="text-[9px] text-muted-foreground tabular-nums">{new Date(e.ts).toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate" title={e.msg}>{e.msg}</div>
              </div>
            </div>
          ))}
          {!events.length && <div className="text-[10px] text-muted-foreground italic px-2 py-2">No events yet...</div>}
        </div>
      </div>

      <div className="pt-1 border-t border-border/50 mt-2 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>Interactive demo only</span>
        <button onClick={()=>setItems(BASE_MISCONFIG.slice(0,5))} className="underline hover:text-card-foreground">reset</button>
      </div>

      {/* Subtle radial accent */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
    </Card>
  );
};

export default SecurityRiskPanel;
