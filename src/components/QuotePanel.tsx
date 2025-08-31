import React, { useMemo, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

// Simple deterministic quote-of-the-day (no network). Index based on day-of-year.
const QUOTES: { text: string; author: string }[] = [
  { text: 'Security is not a product, but a process.', author: 'Bruce Schneier' },
  { text: 'The only truly secure system is one that is powered off.', author: 'Gene Spafford' },
  { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Amateurs hack systems, professionals hack people.', author: 'Bruce Schneier' },
  { text: 'Code is like humor. When you have to explain it, it’s bad.', author: 'Cory House' },
  { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
  { text: 'Innovation is often the ability to reach into the past and bring back what is good.', author: 'Bill Bernbach' },
  { text: 'Knowledge increases by sharing but not by saving.', author: 'Kamari aka Lyrikal' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
];

const getDayOfYear = (d: Date) => {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

const QuotePanel: React.FC = () => {
  const quote = useMemo(() => {
    const idx = getDayOfYear(new Date()) % QUOTES.length;
    return QUOTES[idx];
  }, []);

  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formatted = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2,'0');
    const y = now.getFullYear();
    const m = pad(now.getMonth()+1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }, [now]);

  return (
    <Card className="p-4 bg-card/60 backdrop-blur border-border/70 flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-primary/80">Quote of the Day</h2>
      <p className="text-[11px] leading-relaxed text-muted-foreground italic">“{quote.text}”</p>
      <div className="text-[10px] text-accent/80 font-mono self-end">— {quote.author}</div>
      <div className="text-[9px] text-muted-foreground/70 pt-1 border-t border-border/50 font-mono tracking-tight flex justify-between">
        <span>{formatted}</span>
        <span className="opacity-60">GMT+8</span>
      </div>
    </Card>
  );
};

export default QuotePanel;
