import React, { useState, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import profilePhoto from '@/assets/profile-photo.jpg';

interface TerminalLine {
  id: string;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp?: Date;
  animate?: boolean;
}

interface Command {
  name: string;
  description: string;
  execute: () => string[];
}

const Terminal = () => {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('~');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  // Track whether user is currently at (or near) bottom so we only autoscroll then
  const atBottomRef = useRef(true);
  // Track if latest lines change came from executing a command (to limit auto-scroll)
  const justRanCommandRef = useRef(false);

  // Very small virtual filesystem rooted at ~ (only registers directories)
const directorySet = new Set<string>([
    '~',
    '~/projects',
    '~/certifications',
    '~/certifications/cloud',
    '~/certifications/cybersecurity',
    '~/certifications/leadership',
    '~/certifications/participations',
    '~/certifications/programming'
  ]);

  // Dynamic directory data (files inside subfolders)
  // Certification virtual files (alphabetical by filename) with categories
  interface CertFile { name: string; category: string; content: string }
  // ---------------------------------------------------------------------------
  // CERTIFICATION REGISTRY
  // Keep ONLY genuinely earned certificates here. Each entry becomes a virtual
  // file accessible via:  cat ~/certifications/<category>/<file-name>
  //
  // HOW TO ADD A NEW REAL CERT (Example):
  // certificationFiles.push({
  //   name: 'aws-cloud-practitioner.txt', // keep kebab / lowercase w/ .txt
  //   category: 'cloud',                  // must match one of the directories
  //   content: 'AWS Certified Cloud Practitioner – Verified credential summary.'
  // });
  // Then also add preview mapping + meta (display + optional verifyUrl) below
  // in certImageMap & certMeta.
  // ---------------------------------------------------------------------------
  const certificationFiles: CertFile[] = [
    // Verified Certs
  { name: 'cloudCertificate1.txt', category: 'cloud', content: 'Migrate MySQL Databases to Cloud SQL – Verified credential.' },
  { name: 'leadershipCertificate1.txt', category: 'leadership', content: 'Leadership Certificate 1 – Core team leadership principles, communication, and strategic planning.' },
  { name: 'leadershipCertificate2.txt', category: 'leadership', content: 'Leadership Certificate 2 – Advanced leadership focusing on decision-making and organizational impact.' },
  { name: 'participationCertificate1.txt', category: 'participations', content: 'Participation Certificate 1 – Event / workshop acknowledgment.' },
  { name: 'participationCertificate2.txt', category: 'participations', content: 'Participation Certificate 2 – Recognized contribution to program/event.' },
  { name: 'participationCertificate3.txt', category: 'participations', content: 'Participation Certificate 3 – Recognized contribution to program/event.' },
  { name: 'participationCertificate4.txt', category: 'participations', content: 'Participation Certificate 4 – Recognized contribution to program/event.' },
   
    // These will render as a unified professional placeholder card.
    { name: 'on-going.txt', category: 'cloud', content: 'Additional cloud certifications in progress.' },
    { name: 'on-going.txt', category: 'cybersecurity', content: 'Cybersecurity certifications / labs in progress.' },
    { name: 'on-going.txt', category: 'leadership', content: 'Leadership development & training on-going.' },
    { name: 'on-going.txt', category: 'participations', content: 'Community & event participation on-going.' },
    { name: 'on-going.txt', category: 'programming', content: 'Advanced programming / specialization certifications in progress.' },
  ];

  const projectFiles: { name: string; content: string }[] = [
    { name: 'portfolio-terminal.md', content: 'Interactive portfolio terminal + CTF micro puzzle + encryption visualizer.' },
    { name: 'guilds.md', content: 'GDG On Campus UIC Guilds Platform - https://guilds.gdgocuic.org\nFor the University Club Fair' },
  ];

  const fileContents: Record<string, string> = {
  '~/about': `This portfolio looks like a Kali terminal because that's where I think, experiment, and (carefully) break things. I like breaking concepts down, solving puzzles, and hiding a few of my own.\nThere's a tiny CTF woven in—wander the filesystem, read files, and see what you can uncover.\nCurrent focus: cybersecurity, automation, AI, and relentless learning.\n`,
    '~/experience': `• CCTV Technician and Administrator\n• Freelancing Projects\n`,
  '~/contact': `Email: mailto:geoffrey@diapana.dev\nGitHub: https://github.com/yyerf\n`,
    '~/password.txt': `Geof"fr3y"!@yyerf\nfor the CTF(?)\n`,
    // Inject certification file contents
  ...Object.fromEntries(certificationFiles.map(f => [ `~/certifications/${f.category}/${f.name}`, f.content ])),
    // Inject project file contents
    ...Object.fromEntries(projectFiles.map(f => [ `~/projects/${f.name}`, f.content ])),
  };

  const listDirectory = (path: string): { name: string; kind: 'dir' | 'file' }[] => {
    const normalized = normalizePath(path);
    if (normalized === '~') {
      const baseEntries = [
        { name: 'about', kind: 'file' as const },
        { name: 'certifications', kind: 'dir' as const },
        { name: 'contact', kind: 'file' as const },
        { name: 'experience', kind: 'file' as const },
        { name: 'password.txt', kind: 'file' as const },
        { name: 'projects', kind: 'dir' as const },
      ];
      return baseEntries
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(e => ({ name: e.name, kind: e.kind }));
    }
    if (normalized === '~/certifications') {
      const subDirs = [ 'cloud','cybersecurity','leadership','participations','programming' ]
        .map(d => ({ name: d, kind: 'dir' as const }));
      return subDirs.sort((a,b) => a.name.localeCompare(b.name));
    }
    // Category directories
    if (/^~\/certifications\/(cloud|cybersecurity|leadership|participations|programming)$/.test(normalized)) {
      const category = normalized.split('/')[2];
      const files = certificationFiles
        .filter(f => f.category === category)
        .map(f => ({ name: f.name, kind: 'file' as const }));
      // Custom sort: keep alphabetical but always push on-going.txt to the end
      return files.sort((a,b) => {
        const aOngoing = a.name === 'on-going.txt';
        const bOngoing = b.name === 'on-going.txt';
        if (aOngoing && !bOngoing) return 1;
        if (bOngoing && !aOngoing) return -1;
        return a.name.localeCompare(b.name);
      });
    }
    if (normalized === '~/projects') {
      return projectFiles
        .map(f => ({ name: f.name, kind: 'file' as const }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  };

  const commands: Record<string, Command> = {
    help: {
      name: 'help',
      description: 'Show available commands',
      execute: () => [
  'Available commands:',
  '  cat <name>   - Show file ',
        '  cd <dir>     - Change directory ',
        '  clear        - Clear the terminal',
        '  help         - Show this help message',
        '  ls [path]    - List directory contents',
        '  pwd          - Print current directory',
        '  whoami       - Display user info',
        ''
      ]
    },
    whoami: {
      name: 'whoami',
      description: 'Display current user info',
      execute: () => [
        '__avatar__',
        "Hi, I'm Geoffrey – a 3rd Year Computer Science student.",
        '"Builder by passion, breaker by curiosity."',
        'Current Focus: Cloud (GCP), Cybersecurity fundamentals, TypeScript, Python + AI tooling.',
        'Core Skills: React · TypeScript · Python · Networking · Linux · Git · (currently learning Laravel)',
        'Legacy GitHub Pages: https://diapz.github.io',
        'Current GitHub: https://github.com/yyerf',
        "Type 'help' to see all commands.",
        ''
      ]
    },
    clear: {
      name: 'clear',
      description: 'Clear the terminal',
      execute: () => {
        setLines([]);
        return [];
      }
    }
  };

  useEffect(() => {
    // Initial introduction simulating a whoami run (with avatar + profile lines)
    const whoamiOutput = commands.whoami.execute();
    const whoamiLines: TerminalLine[] = whoamiOutput.map((content, index) => ({
      id: `whoami-intro-${index}`,
      type: 'output' as const,
      content,
      timestamp: new Date(),
      animate: false
    }));
    const intro: TerminalLine[] = [
      {
        id: `intro-prompt-top` ,
        type: 'command' as const,
        content: `┌──(yyerf㉿portfolio)-[whoami]`,
        timestamp: new Date()
      },
      {
        id: `intro-prompt-bottom` ,
        type: 'command' as const,
        content: `└─$ whoami`,
        timestamp: new Date(),
        animate: false
      },
      ...whoamiLines
    ];
    setLines(intro);
  }, []);

  useEffect(() => {
    // Auto-focus input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [lines]);

  // Attach scroll listener to detect if user manually scrolled up
  useEffect(() => {
    // Scroll to bottom when new lines are added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Position custom caret based on current input width
  useEffect(() => {
    const repositionCaret = () => {
      if (!caretRef.current || !mirrorRef.current || !inputRef.current || !inputWrapRef.current) return;
      // Ensure mirror text is updated
      mirrorRef.current.textContent = currentInput || '\u00A0';
      const mirrorWidth = mirrorRef.current.offsetWidth;
      caretRef.current.style.left = `${mirrorWidth}px`;
      // Match caret height to input
      caretRef.current.style.height = `${inputRef.current.offsetHeight || 20}px`;
      // Show caret only when focused
      const isFocused = document.activeElement === inputRef.current;
      caretRef.current.style.display = isFocused ? 'block' : 'none';
    };

    repositionCaret();
    const handleResize = () => repositionCaret();
    window.addEventListener('resize', handleResize);
    const fontReady = (document as any).fonts?.ready;
    if (fontReady && typeof fontReady.then === 'function') {
      (document as any).fonts.ready.then(repositionCaret).catch(() => {});
    }
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [currentInput]);

  const handleFocus = () => {
    if (caretRef.current) caretRef.current.style.display = 'block';
  };
  const handleBlur = () => {
    if (caretRef.current) caretRef.current.style.display = 'none';
  };

  const executeCommand = (input: string) => {
    const raw = input.trim();
    const [cmd, ...args] = raw.split(/\s+/);
    const trimmedInput = cmd.toLowerCase();
    
    if (!trimmedInput) return;

    // Add command to history
    setCommandHistory(prev => [...prev, raw]);
    setHistoryIndex(-1);

    // Add two-line prompt to history like Kali
    const promptTop: TerminalLine = {
      id: `cmd-top-${Date.now()}`,
      type: 'command',
      content: `┌──(yyerf㉿portfolio)-[${currentPath}]`,
      timestamp: new Date(),
      animate: false
    };
    const promptBottom: TerminalLine = {
      id: `cmd-bottom-${Date.now()}`,
      type: 'command',
      content: `└─$ ${raw}`,
      timestamp: new Date(),
      animate: false
    };

    // Built-in cd handling
    if (trimmedInput === 'cd') {
      const target = args.join(' ');
      const next = resolvePath(currentPath, target);
      if (next === currentPath) {
        // If attempt to cd into invalid dir, show error
        if (target && target !== '.' && target !== '~') {
          const err = `bash: cd: ${target}: No such file or directory`;
          setLines(prev => [...prev, promptTop, promptBottom, { id: `err-${Date.now()}`, type: 'error', content: err, timestamp: new Date() }]);
        } else {
          setLines(prev => [...prev, promptTop, promptBottom]);
        }
      } else {
        setCurrentPath(next);
        setLines(prev => [...prev, promptTop, promptBottom]);
      }
    } else if (trimmedInput === 'pwd') {
      const outputLines: TerminalLine[] = [
        { id: `pwd-${Date.now()}`, type: 'output' as const, content: currentPath, timestamp: new Date(), animate: true }
      ];
      setLines(prev => [...prev, promptTop, promptBottom, ...outputLines]);
    } else if (trimmedInput === 'ls') {
      const targetArg = args.join(' ');
      const targetPath = targetArg ? resolvePath(currentPath, targetArg) : currentPath; // no arg -> current directory
      const normalized = normalizePath(targetPath);
      const entries = listDirectory(normalized);
      const encoded = entries.map(e => `${e.name}|${e.kind}`).join(' ');
      const marker = '__ls__:' + encoded;
      const outputLines: TerminalLine[] = entries.length ? [
        { id: `ls-${Date.now()}`, type: 'output' as const, content: marker, timestamp: new Date(), animate: true }
      ] : [];
      setLines(prev => [...prev, promptTop, promptBottom, ...outputLines]);
    } else if (trimmedInput === 'cat') {
      const targetArg = args.join(' ');
      if (!targetArg) {
  setLines(prev => [...prev, promptTop, promptBottom, { id: `err-${Date.now()}`, type: 'error', content: 'cat: missing operand', timestamp: new Date(), animate: true }]);
      } else {
          // Build file path manually (files not tracked in directorySet)
          let candidate: string;
          if (targetArg.startsWith('~/')) candidate = targetArg;
          else if (currentPath === '~') candidate = `~/${targetArg}`;
          else candidate = `${currentPath}/${targetArg}`;
          const normalized = normalizePath(candidate);
          const content = fileContents[normalized];
          if (!content) {
            const err = `cat: ${targetArg}: No such file`;
            setLines(prev => [...prev, promptTop, promptBottom, { id: `err-${Date.now()}`, type: 'error', content: err, timestamp: new Date(), animate: true }]);
          } else {
            const outputLines: TerminalLine[] = content.split('\n').map((line, idx) => ({ id: `cat-${Date.now()}-${idx}`, type: 'output' as const, content: line, timestamp: new Date(), animate: true }));
            setLines(prev => [...prev, promptTop, promptBottom, ...outputLines]);
          }
      }
    } else if (commands[trimmedInput]) {
      if (trimmedInput === 'clear') {
        // Clear should not add historical prompt lines; just clear and exit
        commands[trimmedInput].execute();
        setCurrentInput('');
        return;
      }
      // Block direct content commands (must use cat)
  if (['about', 'experience', 'contact', 'skills', 'projects', 'certifications', 'password.txt'].includes(trimmedInput)) {
        const err = `${trimmedInput}: command not found`;
        setLines(prev => [...prev, promptTop, promptBottom, { id: `err-${Date.now()}`, type: 'error', content: err, timestamp: new Date(), animate: true }]);
        setCurrentInput('');
        return;
      }
      const output = commands[trimmedInput].execute();
      const outputLines: TerminalLine[] = output.map((content, index) => ({
        id: `output-${Date.now()}-${index}`,
        type: 'output',
        content,
        timestamp: new Date(),
        animate: true
      }));
      
      setLines(prev => [...prev, promptTop, promptBottom, ...outputLines]);
    } else {
      const errorLine: TerminalLine = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Command not found: ${trimmedInput}. Type 'help' for available commands.`,
        timestamp: new Date(),
        animate: true
      };
      
      setLines(prev => [...prev, promptTop, promptBottom, errorLine]);
    }

    setCurrentInput('');
  // Mark that this lines update came from a command execution
  justRanCommandRef.current = true;
  };

  // Resolve next path for `cd`
  const resolvePath = (current: string, target: string): string => {
    const trimmed = (target || '').trim();
    if (!trimmed) return current; // no change
    if (trimmed === '~') return '~';
    if (trimmed === '.') return current; // stay put
    const currentSegments = current === '~' ? [] : current.replace(/^~\//, '').split('/');
    if (trimmed === '..') {
      if (currentSegments.length === 0) return '~';
      currentSegments.pop();
      return currentSegments.length ? `~/${currentSegments.join('/')}` : '~';
    }
    // Absolute path from home
    const fromHome = trimmed.startsWith('~/') ? trimmed.slice(2) : trimmed;
    const candidateAbs = trimmed.startsWith('~/') ? (fromHome ? `~/${fromHome}` : '~') : `~/${[...currentSegments, fromHome].join('/')}`;
    // Restrict to allowed directories only
    if (candidateAbs === '~') return '~';
    const parts = candidateAbs.split('/');
    const firstLevel = parts.slice(0, 2).join('/'); // '~/<first>'
    // Allow direct cd into first-level known directories
    if (directorySet.has(firstLevel)) {
      if (parts[1] === 'certifications') {
        // allow category depth 3
        if (parts.length === 3) {
          const subPath = parts.slice(0,3).join('/');
            if (directorySet.has(subPath)) return subPath; // category
            return firstLevel; // fallback
        }
      }
      return firstLevel;
    }
    // If invalid, keep current
    return current;
  };

  const normalizePath = (path: string): string => {
    if (path === '~') return '~';
    return path.replace(/\/+$/,'');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(currentInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple autocomplete
      const matches = Object.keys(commands).filter(cmd => 
        cmd.startsWith(currentInput.toLowerCase())
      );
      if (matches.length === 1) {
        setCurrentInput(matches[0]);
      }
    }
  };

  useEffect(() => {
    const initParticles = () => {
      const anyWindow = window as any;
      if (!anyWindow.tsParticles) {
        setTimeout(initParticles, 300);
        return;
      }
      anyWindow.tsParticles.load(`tsparticles-terminal`, {
        fpsLimit: 60,
        interactivity: {
          events: { onHover: { enable: true, mode: 'grab' }, resize: true },
          modes: {
            grab: { distance: 130, links: { opacity: 0.25 } },
            repulse: { distance: 60, duration: 0.25 }
          }
        },
        particles: {
          color: { value: ['#94a3b8','#cbd5e1','#f1f5f9'] },
          links: { color: '#74839a', distance: 150, enable: true, opacity: 0.32, width: 0.55, triangles: { enable: false } },
          move: {
            direction: 'bottom',
            enable: true,
            gravity: { enable: true, acceleration: 0.06 },
            outModes: { default: 'out', bottom: 'out' },
            random: false,
            speed: 0.06,
            straight: false,
            drift: 0.03,
            decay: 0.01
          },
          number: { density: { enable: true, area: 900 }, value: 46 },
          opacity: { value: { min: 0.52, max: 0.78 }, animation: { enable: true, speed: 0.22, sync: false } },
          shape: { type: ['circle','star'] },
          size: { value: { min: 1, max: 2.2 }, animation: { enable: true, speed: 2, minimumValue: 0.9, sync: false } },
          shadow: { enable: false }
        },
        emitters: [
          // Shooting star / meteorite effect across the sky
          {
            rate: { delay: 6, quantity: 1 },
            position: { x: 100, y: 5 }, // top-right corner
            size: { width: 0, height: 0 },
            life: { count: 0 },
            particles: {
              move: {
                direction: 'left',
                speed: { min: 12, max: 20 },
                straight: true,
                outModes: { default: 'destroy' }
              },
              size: { value: { min: 1, max: 2 } },
              opacity: { value: { min: 0.5, max: 0.8 } },
              color: { value: '#ffffff' },
              shape: { type: 'circle' },
              trail: { enable: true, length: 10, fill: { color: '#0f172a' } },
              life: { duration: { value: 2 } }
            }
          },
          // Occasional random meteor from random top position
          {
            rate: { delay: 9, quantity: 1 },
            position: { x: 50, y: 2 },
            size: { width: 100, height: 4 }, // span width for random horizontal start
            life: { count: 0 },
            particles: {
              move: {
                direction: 'bottom-left',
                speed: { min: 10, max: 18 },
                straight: true,
                outModes: { default: 'destroy' }
              },
              size: { value: { min: 1, max: 2 } },
              opacity: { value: { min: 0.45, max: 0.8 } },
              color: { value: '#ffffff' },
              shape: { type: 'circle' },
              trail: { enable: true, length: 12, fill: { color: '#0f172a' } },
              life: { duration: { value: 2.2 } }
            }
          }
        ],
        detectRetina: true,
        smooth: true,
        pauseOnBlur: true
      });
    };
    initParticles();
  }, []);

  return (
  <div
    className="h-full flex flex-col relative text-sm sm:text-base"
    onContextMenu={(e) => {
      e.preventDefault();
      // Provide a subtle toast instead of the default context menu
      toast({
        title: 'No-no-no',
        description: 'Right-click is blocked in this terminal view.'
      });
    }}
  >
      <div 
        ref={terminalRef}
  className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 font-mono text-[13px] sm:text-[15px] leading-relaxed break-words"
      >
        <div id="tsparticles-terminal" className="absolute inset-0 opacity-80 pointer-events-none"></div>
        {lines.map((line) => {
          const isTop = line.type === 'command' && line.content.startsWith('┌──(');
          const isBottom = line.type === 'command' && line.content.startsWith('└─$');
          const isLs = line.type === 'output' && line.content.startsWith('__ls__:');
          const isAvatar = line.type === 'output' && line.content === '__avatar__';
          if (isAvatar) {
            return (
              <div key={line.id} className={"terminal-line mb-3 flex items-center gap-3 " + (line.animate ? 'line-enter' : '')}>
                <div className="h-24 w-24 rounded-full overflow-hidden ring-2 ring-primary/40 shadow-sm flex-shrink-0 mt-3 mb-3">
                  <img src={profilePhoto} alt="Avatar" className="h-full w-full object-cover" />
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground leading-snug">
                  <div className="font-semibold text-primary">Geoffrey Diapz</div>
                  <div className="opacity-80">Google Developer Groups on Campus UIC - Lead</div>
                </div>
              </div>
            );
          }
          if (isTop) {
            const m = line.content.match(/^┌──\((.+)\)-\[(.+)\]$/);
            const userHost = m ? m[1] : '';
            const path = m ? m[2] : '';
            return (
              <div key={line.id} className={"terminal-line break-words " + (line.animate ? 'line-enter' : '')}>
                <span className="whitespace-pre">
                  <span className="text-muted-foreground">┌──</span>
                  <span className="text-accent">(</span>
                  <span className="text-accent">{userHost}</span>
                  <span className="text-accent">)</span>
                  <span className="text-card-foreground">-[</span>
                  <span className="text-primary">{path}</span>
                  <span className="text-card-foreground">]</span>
                </span>
              </div>
            );
          }
          if (isBottom) {
            const m = line.content.match(/^└─\$\s?(.*)$/);
            const cmd = m ? m[1] : '';
            return (
              <div key={line.id} className={"terminal-line break-words " + (line.animate ? 'line-enter' : '')}>
                <span className="whitespace-pre">
                  <span className="text-muted-foreground">└─</span>
                  <span className="text-primary">$ </span>
                  <span className="terminal-command">{cmd}</span>
                </span>
              </div>
            );
          }
          if (isLs) {
            const encoded = line.content.replace(/^__ls__:/, '');
            const items = encoded ? encoded.split(' ') : [];
            // Detect certifications directory by previous command context in lines list (simple heuristic)
            // We'll look back for the immediate preceding bottom prompt line to extract path
            const idxLine = lines.findIndex(l => l.id === line.id);
            let lastPath: string | null = null;
            for (let i = idxLine - 1; i >= 0; i--) {
              const l = lines[i];
              if (l.type === 'command' && l.content.startsWith('┌──(')) {
                const m2 = l.content.match(/-\[(.+)\]$/);
                if (m2) { lastPath = m2[1]; break; }
              }
            }
            const inCertsCategory = /^~\/certifications\/(cloud|cybersecurity|leadership|participations|programming)$/.test(lastPath || '');
            if (!inCertsCategory) {
              const isHome = lastPath === '~';
              if (isHome) {
                return (
                  <div key={line.id} className={"terminal-line break-words " + (line.animate ? 'line-enter' : '')}>
                    <div className="sm:hidden grid grid-cols-3 gap-x-4 gap-y-0.5">
                      {items.map((it, idx) => {
                        const [name, kind] = it.split('|');
                        const isDir = kind === 'dir';
                        return (
                          <span key={idx} className={isDir ? 'text-primary' : 'terminal-output'}>{name}</span>
                        );
                      })}
                    </div>
                    <span className="hidden sm:inline whitespace-pre">
                      {items.map((it, idx) => {
                        const [name, kind] = it.split('|');
                        const isDir = kind === 'dir';
                        return (
                          <span key={idx} className={isDir ? 'text-primary' : 'terminal-output'}>
                            {name}{idx < items.length - 1 ? '  ' : ''}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                );
              }
              return (
                <div key={line.id} className={"terminal-line break-words " + (line.animate ? 'line-enter' : '')}>
                  <div className="sm:hidden grid grid-cols-3 gap-x-4 gap-y-0.5">
                    {items.map((it, idx) => {
                      const [name, kind] = it.split('|');
                      const isDir = kind === 'dir';
                      return (
                        <span key={idx} className={isDir ? 'text-primary' : 'terminal-output'}>{name}</span>
                      );
                    })}
                  </div>
                  <span className="hidden sm:inline whitespace-pre">
                    {items.map((it, idx) => {
                      const [name, kind] = it.split('|');
                      const isDir = kind === 'dir';
                      return (
                        <span key={idx} className={isDir ? 'text-primary' : 'terminal-output'}>
                          {name}{idx < items.length - 1 ? '  ' : ''}
                        </span>
                      );
                    })}
                  </span>
                </div>
              );
            }
            // Certifications gallery (category view)
            // ---------------------------------------------------------------------------
            // PREVIEW MAPPINGS
            // Map virtual text file names to preview assets (image or pdf). Only map
            // real certificates. Placeholders intentionally use a neutral graphic.
            // HOW TO ADD a new preview:
            //  1. Place asset under /public/certs/<category>/your-file.ext
            //  2. Add: 'aws-cloud-practitioner.txt': '/certs/cloud/aws-cloud-practitioner.png'
            //  3. Add meta entry below for display label + optional verify URL.
            // ---------------------------------------------------------------------------
            const certImageMap: Record<string,string> = {
              'cloudCertificate1.txt': '/certs/cloud/cloudCertificate1.png',
              // Leadership PDFs
              'leadershipCertificate1.txt': '/certs/leadership/leadershipCertificate1.pdf',
              'leadershipCertificate2.txt': '/certs/leadership/leadershipCertificate2.pdf',
              // Participation mixed assets (note original typo in first pdf filename)
              'participationCertificate1.txt': '/certs/participations/particiaptionCertificate1.pdf',
              'participationCertificate2.txt': '/certs/participations/participationCertificate2.png',
              'participationCertificate3.txt': '/certs/participations/participationCertificate3.pdf',
              'participationCertificate4.txt': '/certs/participations/participationCertificate4.pdf',
              // Shared placeholder for generic on-going entries
              'on-going.txt': '/placeholder.svg',
            };
            const certMeta: Record<string,{ display:string; verifyUrl?: string; ongoing?: boolean }> = {
              'cloudCertificate1.txt': { display: 'Migrate MySQL Databases to Cloud SQL', verifyUrl: 'https://www.credly.com/badges/0e49fa80-f092-481f-8a57-083a887eccda/public_url' },
              'leadershipCertificate1.txt': { display: 'Leadership Certificate 1' },
              'leadershipCertificate2.txt': { display: 'Leadership Certificate 2' },
              'participationCertificate1.txt': { display: 'Participation Certificate 1' },
              'participationCertificate2.txt': { display: 'Participation Certificate 2' },
              'participationCertificate3.txt': { display: 'Participation Certificate 3' },
              'participationCertificate4.txt': { display: 'Participation Certificate 4' },
              'on-going.txt': { display: 'On-going', ongoing: true },
            };
            return (
              <div key={line.id} className="mt-2 mb-4">
                <div className="grid grid-cols-1 xxs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {items.map((it, idx) => {
                    const [name, kind] = it.split('|');
                    if (kind === 'dir') return null;
                    const meta = certMeta[name];
                    const img = certImageMap[name];
                    const isOngoing = meta?.ongoing;

                    return (
                      <div
                        key={name + '-' + idx}
                        className={`border border-border/60 rounded p-3 bg-background/40 backdrop-blur-sm flex flex-col gap-2 transition ${isOngoing ? 'opacity-85 hover:border-primary/40' : 'hover:border-primary/50'}`}
                      >
                        {img ? (
                          (() => {
                            const isPdf = img.toLowerCase().endsWith('.pdf');
                            if (isPdf) {
                              return (
                                <div className={`aspect-video w-full rounded overflow-hidden relative group flex items-center justify-center ${isOngoing ? 'bg-muted/10' : 'bg-muted/20'}`}>
                                  <iframe
                                    src={img + '#toolbar=0&navpanes=0&scrollbar=0'}
                                    title={meta?.display || name}
                                    className="w-full h-full pointer-events-none select-none"
                                  />
                                  <div className="absolute inset-0 bg-background/5 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] sm:text-[11px] font-medium text-primary/90 backdrop-blur-[1px]">
                                    Click Open ↗ for full view
                                  </div>
                                  <button
                                    onClick={() => window.open(img, '_blank', 'noopener,noreferrer')}
                                    className="absolute bottom-1.5 right-1.5 text-[10px] sm:text-[11px] px-2 py-1 rounded bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary font-medium"
                                    title="Open full PDF"
                                  >Open ↗</button>
                                </div>
                              );
                            }
                            return (
                              <div className={`aspect-video w-full overflow-hidden rounded flex items-center justify-center ${isOngoing ? 'bg-muted/10' : 'bg-muted/20'}`}>
                                {isOngoing ? (
                                  <div className="flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground">
                                    <span className="uppercase tracking-wide font-semibold text-primary/80">On-going</span>
                                    <span className="text-[9px] sm:text-[10px] opacity-75">Credential in progress</span>
                                  </div>
                                ) : (
                                  <img src={img} alt={name} className="object-contain h-full w-full" />
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <div className="aspect-video w-full rounded bg-muted/10 flex items-center justify-center text-[10px] text-muted-foreground">no preview</div>
                        )}

                        {/* ACTION / LABEL AREA */}
                        {name === 'cloudCertificate1.txt' && meta?.verifyUrl ? (
                          <button
                            onClick={() => window.open(meta.verifyUrl, '_blank', 'noopener,noreferrer')}
                            className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary transition border border-primary/30"
                            title="View verified credential"
                          >
                            {meta.display} ↗
                          </button>
                        ) : (
                          <div className="text-[11px] sm:text-xs font-mono break-all text-muted-foreground tracking-tight">
                            {meta?.display || name.replace(/\.txt$/, '')}
                          </div>
                        )}

                        {isOngoing && (
                          <div className="text-[10px] leading-snug text-muted-foreground/70 italic">
                            Some of the credentials are still in progress... busy in school and work.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          return (
              <div key={line.id} className={"terminal-line break-words " + (line.content === "Type 'help' to see all commands." ? 'mb-4' : '') + ' ' + (line.animate ? 'line-enter' : '')}>
              {(() => {
                if (line.type === 'command') return <span className="terminal-command">{line.content}</span>;
                if (line.type === 'error') return <span className="terminal-error">{line.content}</span>;
                // Output with URL highlighting
                const parts: (string | { url: string })[] = [];
                const urlRegex = /(mailto:[^\s]+|https?:\/\/[^\s]+|github\.com\/[^\s]+)/g;
                let lastIndex = 0;
                let m: RegExpExecArray | null;
                while ((m = urlRegex.exec(line.content)) !== null) {
                  if (m.index > lastIndex) parts.push(line.content.slice(lastIndex, m.index));
                  parts.push({ url: m[0] });
                  lastIndex = m.index + m[0].length;
                }
                if (lastIndex < line.content.length) parts.push(line.content.slice(lastIndex));
                return (
                  <span className="terminal-output">
                    {parts.map((p, i) => {
                      if (typeof p === 'string') return p;
                      let href = p.url;
                      let label = p.url;
                      if (href.startsWith('mailto:')) {
                        label = href.replace(/^mailto:/,'');
                      } else if (href.startsWith('github.com')) {
                        href = 'https://' + href;
                      }
                      return (
                        <a
                          key={i}
                          href={href}
                          target={href.startsWith('mailto:') ? '_self' : '_blank'}
                          rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                          className="text-primary underline decoration-dotted hover:decoration-solid hover:text-primary/90 transition-colors"
                        >
                          {label}
                        </a>
                      );
                    })}
                  </span>
                );
              })()}
            </div>
          );
        })}
        <div className="terminal-line flex-col">
          <div className="flex items-center whitespace-pre">
            <span className="text-muted-foreground">┌──</span>
            <span className="text-accent">(</span>
            <span className="text-accent">yyerf</span>
            <span className="text-accent">㉿</span>
            <span className="text-accent">portfolio</span>
            <span className="text-accent">)</span>
            <span className="text-card-foreground">-[</span>
            <span className="text-primary">{currentPath}</span>
            <span className="text-card-foreground">]</span>
          </div>
          <div className="flex items-start w-full whitespace-pre">
            <span className="text-muted-foreground">└─</span>
            <span className="text-primary">$ </span>
            <div ref={inputWrapRef} className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="terminal-input"
                spellCheck={false}
                autoComplete="off"
              />
              <span ref={mirrorRef} className="terminal-input-mirror"></span>
              <div ref={caretRef} className="custom-caret" style={{ left: 0 }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;