import React, { useState, useEffect, useRef } from 'react';
import './DeepTerminal.css';
import { Terminal as TerminalIcon, ChevronDown, ChevronUp, Shield, Globe, Zap } from 'lucide-react';

interface LogEntry {
  type: 'command' | 'response' | 'error';
  text: string;
}

const DeepTerminal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<LogEntry[]>([
    { type: 'response', text: 'DEEP TERMINAL V2.0.4 - SECURE ACCESS GRANTED' },
    { type: 'response', text: 'CONNECTION ESTABLISHED VIA CLOUD-CORE-7' },
    { type: 'response', text: 'Type "help" for available commands.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const addResponse = (text: string) => {
    setIsTyping(true);
    setHistory(prev => [...prev, { type: 'response', text: '' }]);
    
    let currentText = '';
    let i = 0;
    const interval = setInterval(() => {
      currentText += text[i];
      setHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1].text = currentText;
        return newHistory;
      });
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 15);
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const fullCommand = input.trim();
    const cmd = fullCommand.toLowerCase();
    setHistory(prev => [...prev, { type: 'command', text: `> ${fullCommand}` }]);
    setInput('');

    if (cmd === 'help') {
      addResponse('Available commands: WORLD_STATUS, QUERY DISTRICTS, SCAN_ENEMIES, clear, help');
    } else if (cmd === 'world_status') {
      addResponse('WORLD STATUS: STABLE. Energy Index: 88%. Population: 12.4M. Cloud cover: 45%. System Integrity: 99.2%.');
    } else if (cmd === 'query districts') {
      addResponse('DISTRICTS ONLINE: [AETHERIA] [IRONFORGE] [NEON_DISTRICT] [THE_SPIRE] [SUNKEN_CITY] [MID-RING]');
    } else if (cmd === 'scan_enemies') {
      addResponse('SCANNING ALL SECTORS... [||||||||||] 100%. No immediate threats detected in primary sectors. Minor anomaly in Sector 7 sub-levels.');
    } else if (cmd === 'clear') {
      setHistory([]);
    } else {
      addResponse(`ERROR: Command "${fullCommand}" not recognized. Type "help" for valid commands.`);
    }
  };

  return (
    <div className={`deep-terminal-container ${isOpen ? 'open' : 'closed'}`}>
      <button
        className="terminal-header"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close deep terminal' : 'Open deep terminal'}
      >
        <div className="terminal-title">
          <TerminalIcon size={14} className="terminal-icon" />
          <span>DEEP TERMINAL</span>
          {isOpen && <div className="online-indicator"></div>}
        </div>
        <div className="terminal-status-icons">
          <Shield size={12} className={isOpen ? 'active' : ''} />
          <Globe size={12} className={isOpen ? 'active' : ''} />
          <Zap size={12} className={isOpen ? 'active' : ''} />
        </div>
        <div className="terminal-controls">
          {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </button>
      
      <div className="terminal-body">
        <div className="terminal-output" ref={scrollRef}>
          {history.map((entry, i) => (
            <div key={i} className={`terminal-line ${entry.type}`}>
              {entry.text}
            </div>
          ))}
          {isTyping && <span className="typing-cursor"></span>}
        </div>
        <form onSubmit={handleCommand} className="terminal-input-form">
          <span className="terminal-prompt">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="terminal-input"
            autoComplete="off"
            spellCheck="false"
            disabled={isTyping}
            placeholder={isTyping ? "Processing..." : "Enter command..."}
          />
        </form>
      </div>
      <div className="terminal-footer">
        <span>SECURITY LEVEL: APEX</span>
        <span>ENCRYPTION: AES-512</span>
        <span>STATION: OBSERVER-01</span>
      </div>
    </div>
  );
};

export default DeepTerminal;
