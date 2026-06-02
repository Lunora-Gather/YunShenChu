import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './DeepTerminal.css';
import { Terminal as TerminalIcon, ChevronDown, ChevronUp, Shield, Globe, Zap } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { SIGNAL_CATALOG } from '../../data/signals';

interface LogEntry {
  type: 'command' | 'response' | 'error';
  text: string;
}

const DeepTerminal: React.FC = () => {
  const {
    activeDirective,
    addDiaryEntry,
    completeInvestigationAction,
    currentDistricts,
    discoveredSignalIds,
    focusSignal,
    investigationState,
    isPastMode,
    latestSignal,
    observerMemory,
    playUISound,
    selectedDistrict,
    setDistrict,
    signalIntel,
    signalTelemetry,
    terminalCommandRequest,
    weather,
    world,
  } = useCity();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<LogEntry[]>([
    { type: 'response', text: 'DEEP TERMINAL V2.0.4 - SECURE ACCESS GRANTED' },
    { type: 'response', text: 'CONNECTION ESTABLISHED VIA CLOUD-CORE-7' },
    { type: 'response', text: 'Type "help" for available commands.' },
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [commandHistoryIndex, setCommandHistoryIndex] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAnnouncedSignalRef = useRef<string | null>(null);
  const lastTerminalCommandRequestRef = useRef<number | null>(null);

  const discoveredSignalSet = useMemo(() => new Set(discoveredSignalIds), [discoveredSignalIds]);

  const findSignal = useCallback((target: string) => {
    const normalized = target.trim().toLowerCase();
    if (!normalized) return null;

    return SIGNAL_CATALOG.find((signal) => {
      const frequency = signal.freq.toFixed(1);
      return (
        signal.id.toLowerCase() === normalized ||
        signal.title.toLowerCase().includes(normalized) ||
        signal.origin.toLowerCase().includes(normalized) ||
        frequency === normalized
      );
    }) ?? null;
  }, []);

  const findDistrict = useCallback((target: string) => {
    const normalized = target.trim().toLowerCase().replace(/-/g, '_');
    if (!normalized) return null;

    return currentDistricts.find((district) => {
      const aliases = [
        district.id,
        district.name,
        district.name.replace(/[·\s]/g, ''),
        district.id.replace(/_/g, ''),
      ].map((value) => value.toLowerCase());

      return aliases.some((alias) => alias === normalized || alias.includes(normalized));
    }) ?? null;
  }, [currentDistricts]);

  const summarizeUnlockedSignal = useCallback((signalId: string) => {
    const signal = SIGNAL_CATALOG.find((item) => item.id === signalId);
    if (!signal) return null;
    return `${signal.freq.toFixed(1)}MHz ${signal.title} / ${signal.evidence}`;
  }, []);

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

  useEffect(() => {
    if (!isOpen || !latestSignal || lastAnnouncedSignalRef.current === latestSignal.id) return;
    lastAnnouncedSignalRef.current = latestSignal.id;
    setHistory((prev) => [
      ...prev,
      { type: 'response' as const, text: `AUTO-LINK: ${latestSignal.title} is now the focused anomaly thread.` },
    ].slice(-80));
  }, [isOpen, latestSignal]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setIsTyping(false);
        setIsOpen(false);
        playUISound('click');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, playUISound]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  const addLine = useCallback((text: string, type: LogEntry['type'] = 'response') => {
    setHistory((prev) => [...prev, { type, text }].slice(-80));
  }, []);

  const addResponse = useCallback((text: string, type: LogEntry['type'] = 'response') => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const characters = [...text];
    if (!characters.length) {
      addLine('', type);
      return;
    }

    setIsTyping(true);
    setHistory((prev) => [...prev, { type, text: '' }].slice(-80));

    let index = 0;
    typingTimerRef.current = setInterval(() => {
      index += 1;
      const currentText = characters.slice(0, index).join('');
      setHistory((prev) => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1].text = currentText;
        return newHistory;
      });

      if (index >= characters.length) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setIsTyping(false);
      }
    }, 12);
  }, [addLine]);

  const completeMatchingTerminalCommand = useCallback((command: string) => {
    if (!latestSignal || !discoveredSignalSet.has(latestSignal.id)) return false;

    const normalizedCommand = command.trim().toLowerCase();
    const thread = investigationState.threads[latestSignal.id];
    const action = latestSignal.investigation.actions.find((item) => (
      item.type === 'terminal' &&
      item.command?.toLowerCase() === normalizedCommand &&
      !thread?.completedActionIds.includes(item.id)
    ));

    if (!action) return false;

    completeInvestigationAction(latestSignal.id, action.id);
    return true;
  }, [completeInvestigationAction, discoveredSignalSet, investigationState.threads, latestSignal]);

  const runCommand = useCallback((fullCommand: string, options?: { force?: boolean }) => {
    if (!fullCommand.trim() || (!options?.force && isTyping)) return;

    const normalizedCommand = fullCommand.trim();
    const cmd = normalizedCommand.toLowerCase();
    const [verb, ...rest] = cmd.split(/\s+/);
    const target = rest.join(' ');

    setCommandHistory((prev) => [normalizedCommand, ...prev.filter((item) => item !== normalizedCommand)].slice(0, 30));
    setCommandHistoryIndex(null);
    addLine(`> ${normalizedCommand}`, 'command');
    playUISound('click');

    if (cmd === 'clear') {
      setHistory([]);
      return;
    }

    if (cmd === 'help') {
      addResponse('Available commands: WORLD_STATUS, QUERY DISTRICTS, GO <district>, DISTRICT <district>, SIGNALS, MEMORY, INVESTIGATION, NEXT_ACTION, COMPLETE <action>, SIGNAL_PRESSURE, NEXT_LEAD, LATEST_SIGNAL, TRACE <signal>, FOCUS <signal>, SCAN_ENEMIES, CLEAR.');
      return;
    }

    if (cmd === 'world_status') {
      addResponse(`WORLD STATUS: ${world.global_stats.status.toUpperCase()} / mode=${isPastMode ? 'FOUNDATION_ARCHIVE' : 'LIVE_CITY'} / energy=${world.global_stats.energy_index.toFixed(1)}% / population=${world.global_stats.total_population.toLocaleString('en-US')} / weather=${weather.current_condition} / directive=${activeDirective} / signal_pressure=${signalTelemetry.pressure}% ${signalTelemetry.level}.`);
      return;
    }

    if (cmd === 'query districts') {
      addResponse(currentDistricts.map((district) => (
        `[${district.id.toUpperCase()}] ${district.name} / ${district.altitude_range[0]}-${district.altitude_range[1]}m / ${district.security_level ?? 'Standard'}`
      )).join('\n'));
      return;
    }

    if (verb === 'go' || verb === 'district') {
      const district = findDistrict(target);
      if (!district) {
        addResponse(`DISTRICT ROUTE FAILED: "${target || normalizedCommand}" is not a known sector. Run QUERY DISTRICTS for valid ids.`, 'error');
        return;
      }

      setDistrict(district.id);
      addDiaryEntry(`Terminal navigation set observer focus to ${district.name}.`, 'visit', district.name);
      addResponse(`DISTRICT FOCUS SET: ${district.name} / ${district.id.toUpperCase()} / ${district.altitude_range[0]}-${district.altitude_range[1]}m.`);
      return;
    }

    if (cmd === 'signals') {
      const signalLines = SIGNAL_CATALOG.map((signal) => {
        const unlocked = discoveredSignalSet.has(signal.id);
        return `${unlocked ? 'UNLOCKED' : 'SEALED'} / ${signal.id} / ${unlocked ? summarizeUnlockedSignal(signal.id) : 'sweep interceptor bands for evidence'}`;
      });
      addResponse(`SIGNAL MEMORY ${signalIntel.length}/${SIGNAL_CATALOG.length}\n${signalLines.join('\n')}`);
      return;
    }

    if (cmd === 'memory' || cmd === 'observer_memory') {
      completeMatchingTerminalCommand(cmd);
      addResponse(`OBSERVER MEMORY: ${observerMemory.canPersist ? 'PERSISTENT' : 'VOLATILE'} / restored=${observerMemory.restored ? 'YES' : 'NO'} / signals=${observerMemory.discoveredCount}/${SIGNAL_CATALOG.length} / diary=${observerMemory.diaryCount}/${observerMemory.diaryLimit} / persisted_cap=${observerMemory.persistedDiaryLimit} / latest=${latestSignal?.title ?? 'NONE'}.`);
      return;
    }

    if (cmd === 'investigation' || cmd === 'investigations') {
      const lines = discoveredSignalIds.length
        ? discoveredSignalIds.map((signalId) => {
          const thread = investigationState.threads[signalId];
          if (!thread) return null;
          return `${thread.signal.id}: ${thread.stage.toUpperCase()} / ${thread.completedActionIds.length}/${thread.totalActions} actions / next=${thread.nextAction?.id ?? 'none'}`;
        }).filter(Boolean)
        : ['No unlocked investigation threads.'];
      addResponse(`INVESTIGATION STATE\n${lines.join('\n')}`);
      return;
    }

    if (cmd === 'next_action' || cmd === 'next action' || cmd === 'action') {
      if (!investigationState.nextAction) {
        addResponse('NEXT ACTION: none. Lock a signal or complete the remaining investigation actions.');
        return;
      }

      const { signal, action } = investigationState.nextAction;
      addResponse(`NEXT ACTION: ${signal.title} / ${action.id}\n${action.label}: ${action.description}${action.command ? `\nCommand: ${action.command}` : ''}`);
      return;
    }

    if (verb === 'complete') {
      const latestThread = investigationState.latestThread;
      const [firstArg, secondArg] = rest;
      const explicitSignal = firstArg ? findSignal(firstArg) : null;
      const signal = explicitSignal ?? latestThread?.signal ?? null;
      const actionId = explicitSignal ? secondArg : firstArg;

      if (!signal || !actionId) {
        addResponse('COMPLETE FAILED: use COMPLETE <action> for the focused signal or COMPLETE <signal> <action>.', 'error');
        return;
      }

      const action = signal.investigation.actions.find((item) => item.id === actionId);
      if (!action) {
        addResponse(`COMPLETE FAILED: "${actionId}" is not a valid action for ${signal.title}.`, 'error');
        return;
      }

      if (!discoveredSignalSet.has(signal.id)) {
        addResponse(`COMPLETE DENIED: ${signal.title} is still sealed.`, 'error');
        return;
      }

      completeInvestigationAction(signal.id, action.id);
      addResponse(`ACTION COMPLETE: ${signal.title} / ${action.label}`);
      return;
    }

    if (cmd === 'signal_pressure' || cmd === 'pressure') {
      const impacts = signalTelemetry.activeImpacts.length
        ? signalTelemetry.activeImpacts.map((impact) => `- ${impact}`).join('\n')
        : '- No active anomaly impact.';
      addResponse(`SIGNAL PRESSURE: ${signalTelemetry.pressure}% / ${signalTelemetry.level.toUpperCase()}\nSEALED THREADS: ${signalTelemetry.unresolvedCount}\nACTIVE IMPACTS:\n${impacts}`);
      return;
    }

    if (cmd === 'next_lead' || cmd === 'lead') {
      addResponse(`NEXT LEAD: ${signalTelemetry.nextLead}`);
      return;
    }

    if (cmd === 'latest_signal' || cmd === 'last_signal') {
      if (!latestSignal) {
        addResponse('NO FOCUSED SIGNAL. Open the interceptor and lock a hidden frequency first.', 'error');
        return;
      }
      addResponse(`${latestSignal.freq.toFixed(1)}MHz ${latestSignal.title}\n${latestSignal.message}\nEvidence: ${latestSignal.evidence}`);
      return;
    }

    if (verb === 'focus') {
      const signal = findSignal(target);
      if (!signal) {
        addResponse(`FOCUS FAILED: "${target || normalizedCommand}" is not a known anomaly key.`, 'error');
        return;
      }

      if (!discoveredSignalSet.has(signal.id)) {
        addResponse(`FOCUS DENIED: ${signal.title} is still sealed. Lock the frequency before focusing it.`, 'error');
        return;
      }

      focusSignal(signal.id);
      addDiaryEntry(`Terminal focus set to ${signal.title}.`, 'secret', selectedDistrict.name);
      addResponse(`FOCUS SET: ${signal.title} / ${signal.freq.toFixed(1)}MHz / ${signal.mapFocus.toUpperCase()}`);
      return;
    }

    if (verb === 'trace' || verb === 'signal' || SIGNAL_CATALOG.some((signal) => signal.id === cmd)) {
      const signal = findSignal(target || cmd);
      if (!signal) {
        addResponse(`TRACE FAILED: "${target || normalizedCommand}" is not a known anomaly key.`, 'error');
        return;
      }

      if (!discoveredSignalSet.has(signal.id)) {
        addResponse(`TRACE DENIED: ${signal.title} is still sealed. The interceptor must collect signal evidence first.`, 'error');
        return;
      }

      focusSignal(signal.id);
      addDiaryEntry(`Terminal trace opened for ${signal.title}.`, 'secret', selectedDistrict.name);
      const terminalAction = signal.investigation.actions.find((action) => action.type === 'terminal' && action.command?.toLowerCase() === `trace ${signal.id}`);
      if (terminalAction) {
        completeInvestigationAction(signal.id, terminalAction.id);
      }
      addResponse(`${signal.title} / ${signal.freq.toFixed(1)}MHz\n${signal.message}\nMap focus: ${signal.mapFocus.toUpperCase()} / Origin: ${signal.origin}`);
      return;
    }

    if (cmd === 'scan_enemies') {
      addResponse(`SCANNING ALL SECTORS... [||||||||||] 100%.\nNo declared enemies in civic space. ${latestSignal ? `Anomaly pressure remains attached to ${latestSignal.title}.` : 'Unexplained pressure persists below foundation vents.'}`);
      return;
    }

    addResponse(`ERROR: Command "${normalizedCommand}" not recognized. Type "help" for valid commands.`, 'error');
  }, [
    activeDirective,
    completeInvestigationAction,
    completeMatchingTerminalCommand,
    addDiaryEntry,
    addLine,
    addResponse,
    currentDistricts,
    discoveredSignalIds,
    discoveredSignalSet,
    findDistrict,
    findSignal,
    focusSignal,
    investigationState,
    isPastMode,
    isTyping,
    latestSignal,
    observerMemory,
    playUISound,
    selectedDistrict.name,
    setDistrict,
    signalIntel.length,
    signalTelemetry,
    summarizeUnlockedSignal,
    weather.current_condition,
    world.global_stats.energy_index,
    world.global_stats.status,
    world.global_stats.total_population,
  ]);

  useEffect(() => {
    if (!terminalCommandRequest || lastTerminalCommandRequestRef.current === terminalCommandRequest.id) return;

    lastTerminalCommandRequestRef.current = terminalCommandRequest.id;

    const routeTimer = window.setTimeout(() => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      setIsTyping(false);
      setIsOpen(true);

      if (terminalCommandRequest.autoRun) {
        setInput('');
        setHistory((prev) => [
          ...prev,
          {
            type: 'response' as const,
            text: `COMMAND ROUTED: ${terminalCommandRequest.label}.`,
          },
        ].slice(-80));
        runCommand(terminalCommandRequest.command, { force: true });
        return;
      }

      setInput(terminalCommandRequest.command);
      setHistory((prev) => [
        ...prev,
        {
          type: 'response' as const,
          text: `COMMAND READY: ${terminalCommandRequest.label}. Press Enter to run "${terminalCommandRequest.command}".`,
        },
      ].slice(-80));
    }, 0);

    return () => window.clearTimeout(routeTimer);
  }, [runCommand, terminalCommandRequest]);

  const submitQuickCommand = (command: string) => {
    runCommand(command);
    setInput('');
  };

  const submitCurrentInput = useCallback(() => {
    const fullCommand = input.trim();
    if (!fullCommand || isTyping) return;
    runCommand(fullCommand);
    setInput('');
  }, [input, isTyping, runCommand]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    submitCurrentInput();
  };

  const recallCommand = useCallback((direction: 'older' | 'newer') => {
    if (!commandHistory.length) return;

    const nextIndex = direction === 'older'
      ? Math.min(commandHistory.length - 1, commandHistoryIndex === null ? 0 : commandHistoryIndex + 1)
      : Math.max(-1, commandHistoryIndex === null ? -1 : commandHistoryIndex - 1);

    if (nextIndex === -1) {
      setCommandHistoryIndex(null);
      setInput('');
      return;
    }

    setCommandHistoryIndex(nextIndex);
    setInput(commandHistory[nextIndex]);
  }, [commandHistory, commandHistoryIndex]);

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
        <div className="terminal-quick-actions" aria-label="Terminal command shortcuts">
          <button type="button" onClick={() => submitQuickCommand('world_status')} disabled={isTyping}>world</button>
          <button type="button" onClick={() => submitQuickCommand('signals')} disabled={isTyping}>signals</button>
          <button type="button" onClick={() => submitQuickCommand('memory')} disabled={isTyping}>memory</button>
          <button type="button" onClick={() => submitQuickCommand('latest_signal')} disabled={isTyping}>latest</button>
          <button type="button" onClick={() => submitQuickCommand('signal_pressure')} disabled={isTyping}>pressure</button>
        </div>
        <form onSubmit={handleCommand} className="terminal-input-form">
          <span className="terminal-prompt">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCommandHistoryIndex(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitCurrentInput();
              }

              if (event.key === 'ArrowUp') {
                event.preventDefault();
                recallCommand('older');
              }

              if (event.key === 'ArrowDown') {
                event.preventDefault();
                recallCommand('newer');
              }
            }}
            className="terminal-input"
            autoComplete="off"
            spellCheck="false"
            disabled={isTyping}
            placeholder={isTyping ? "Processing..." : "Enter command..."}
          />
        </form>
      </div>
      <div className="terminal-footer">
        <span>ZONE: {selectedDistrict.id.toUpperCase()}</span>
        <span>PRESSURE: {signalTelemetry.pressure}%</span>
        <span>MODE: {isPastMode ? 'ARCHIVE' : 'LIVE'}</span>
      </div>
    </div>
  );
};

export default DeepTerminal;
