import React, { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import './DeepTerminal.css';
import { Terminal as TerminalIcon, ChevronDown, ChevronUp, Shield, Globe, Zap } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { SIGNAL_CATALOG } from '../../data/signals';
import { caseNames } from '../../data/fieldSites';
import { getFieldRecord } from '../../data/caseFiles';
import { getInstrument } from '../../data/instruments';

interface LogEntry {
  type: 'command' | 'response' | 'error';
  text: string;
}

const COMMANDS = ['help', 'world_status', 'query districts', 'go', 'district', 'signals', 'memory', 'investigation',
  'next_action', 'complete', 'signal_pressure', 'next_lead', 'latest_signal', 'trace', 'focus', 'scan_enemies', 'clear'];

function formatCapturedRecord(signalId: string, actionId: string) {
  const record = getFieldRecord(signalId, actionId);
  if (!record) return '';
  return `\n\n${record.source.toUpperCase()} · ${record.time}\n${record.readings.map(({ label, value }) => `${label}: ${value}`).join('\n')}`;
}

interface DeepTerminalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const DeepTerminal: React.FC<DeepTerminalProps> = ({ isOpen, onOpenChange }) => {
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
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<LogEntry[]>([
    { type: 'response', text: 'DEEP TERMINAL V2.0.4 - SECURE ACCESS GRANTED' },
    { type: 'response', text: 'CONNECTION ESTABLISHED VIA CLOUD-CORE-7' },
    { type: 'response', text: 'Type "help" for available commands.' },
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [commandHistoryIndex, setCommandHistoryIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
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
        caseNames[signal.id].includes(normalized) ||
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

  const addLine = useCallback((text: string, type: LogEntry['type'] = 'response') => {
    setHistory((prev) => [...prev, { type, text }].slice(-80));
  }, []);

  const readTerminalRecord = useCallback((command: string) => {
    if (!latestSignal || !discoveredSignalSet.has(latestSignal.id)) return '';

    const thread = investigationState.threads[latestSignal.id];
    const action = latestSignal.investigation.actions.find((item) => (
      item.type === 'terminal' && item.command?.toLowerCase() === command
    ));

    if (!action) return '';

    if (!thread?.completedActionIds.includes(action.id)) completeInvestigationAction(latestSignal.id, action.id);
    return formatCapturedRecord(latestSignal.id, action.id);
  }, [completeInvestigationAction, discoveredSignalSet, investigationState.threads, latestSignal]);

  const runCommand = useCallback((fullCommand: string) => {
    if (!fullCommand.trim()) return;

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
      addLine('Available commands: WORLD_STATUS, QUERY DISTRICTS, GO <district>, DISTRICT <district>, SIGNALS, MEMORY, INVESTIGATION, NEXT_ACTION, COMPLETE <action>, SIGNAL_PRESSURE, NEXT_LEAD, LATEST_SIGNAL, TRACE <signal>, FOCUS <signal>, SCAN_ENEMIES, CLEAR.');
      return;
    }

    if (cmd === 'world_status') {
      addLine(`WORLD STATUS: ${world.global_stats.status.toUpperCase()} / mode=${isPastMode ? 'FOUNDATION_ARCHIVE' : 'LIVE_CITY'} / energy=${world.global_stats.energy_index.toFixed(1)}% / population=${world.global_stats.total_population.toLocaleString('en-US')} / weather=${weather.current_condition} / directive=${activeDirective} / signal_pressure=${signalTelemetry.pressure}% ${signalTelemetry.level}.`);
      return;
    }

    if (cmd === 'query districts') {
      addLine(currentDistricts.map((district) => (
        `[${district.id.toUpperCase()}] ${district.name} / ${district.altitude_range[0]}-${district.altitude_range[1]}m / ${district.security_level ?? 'Standard'}`
      )).join('\n'));
      return;
    }

    if (verb === 'go' || verb === 'district') {
      const district = findDistrict(target);
      if (!district) {
        addLine(`DISTRICT ROUTE FAILED: "${target || normalizedCommand}" is not a known sector. Run QUERY DISTRICTS for valid ids.`, 'error');
        return;
      }

      setDistrict(district.id);
      addLine(`DISTRICT FOCUS SET: ${district.name} / ${district.id.toUpperCase()} / ${district.altitude_range[0]}-${district.altitude_range[1]}m.`);
      return;
    }

    if (cmd === 'signals') {
      const signalLines = SIGNAL_CATALOG.map((signal) => {
        const unlocked = discoveredSignalSet.has(signal.id);
        return `${unlocked ? 'UNLOCKED' : 'SEALED'} / ${signal.id} / ${unlocked ? summarizeUnlockedSignal(signal.id) : 'sweep interceptor bands for evidence'}`;
      });
      addLine(`SIGNAL MEMORY ${signalIntel.length}/${SIGNAL_CATALOG.length}\n${signalLines.join('\n')}`);
      return;
    }

    if (cmd === 'memory' || cmd === 'observer_memory') {
      const record = readTerminalRecord('memory');
      addLine(`OBSERVER MEMORY: ${observerMemory.canPersist ? 'PERSISTENT' : 'VOLATILE'} / restored=${observerMemory.restored ? 'YES' : 'NO'} / signals=${observerMemory.discoveredCount}/${SIGNAL_CATALOG.length} / diary=${observerMemory.diaryCount}/${observerMemory.diaryLimit} / persisted_cap=${observerMemory.persistedDiaryLimit} / latest=${latestSignal?.title ?? 'NONE'}.${record}`);
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
      addLine(`INVESTIGATION STATE\n${lines.join('\n')}`);
      return;
    }

    if (cmd === 'next_action' || cmd === 'next action' || cmd === 'action') {
      if (!investigationState.nextAction) {
        addLine('NEXT ACTION: none. Lock a signal or complete the remaining investigation actions.');
        return;
      }

      const { signal, action } = investigationState.nextAction;
      addLine(`NEXT ACTION: ${signal.title} / ${action.id}\n${action.label}: ${action.description}${action.command ? `\nCommand: ${action.command}` : ''}`);
      return;
    }

    if (verb === 'complete') {
      const latestThread = investigationState.latestThread;
      const [firstArg, secondArg] = rest;
      const explicitSignal = firstArg ? findSignal(firstArg) : null;
      const signal = explicitSignal ?? latestThread?.signal ?? null;
      const actionId = explicitSignal ? secondArg : firstArg;

      if (!signal || !actionId) {
        addLine('COMPLETE FAILED: use COMPLETE <action> for the focused signal or COMPLETE <signal> <action>.', 'error');
        return;
      }

      const action = signal.investigation.actions.find((item) => item.id === actionId);
      if (!action) {
        addLine(`COMPLETE FAILED: "${actionId}" is not a valid action for ${signal.title}.`, 'error');
        return;
      }

      if (!discoveredSignalSet.has(signal.id)) {
        addLine(`COMPLETE DENIED: ${signal.title} is still sealed.`, 'error');
        return;
      }

      const recorded = investigationState.threads[signal.id]?.completedActionIds.includes(action.id);
      if (recorded) addLine(`ALREADY RECORDED: ${signal.title} / ${action.label}.`);
      else if (action.type === 'report') addLine('待结案 · 请打开案卷，引用两份不同来源的证据。', 'error');
      else addLine(`RECORD PENDING: ${action.description}`, 'error');
      return;
    }

    if (cmd === 'signal_pressure' || cmd === 'pressure') {
      const impacts = signalTelemetry.activeImpacts.length
        ? signalTelemetry.activeImpacts.map((signal) => `- ${signal.impact}`).join('\n')
        : '- No active anomaly impact.';
      addLine(`SIGNAL PRESSURE: ${signalTelemetry.pressure}% / ${signalTelemetry.level.toUpperCase()}\nSEALED THREADS: ${signalTelemetry.unresolvedCount}\nACTIVE IMPACTS:\n${impacts}`);
      return;
    }

    if (cmd === 'next_lead' || cmd === 'lead') {
      addLine(`NEXT LEAD: ${signalTelemetry.nextLead}`);
      return;
    }

    if (cmd === 'latest_signal' || cmd === 'last_signal') {
      if (!latestSignal) {
        addLine('NO FOCUSED SIGNAL. Open the interceptor and lock a hidden frequency first.', 'error');
        return;
      }
      addLine(`${latestSignal.freq.toFixed(1)}MHz ${latestSignal.title}\n${latestSignal.message}\nEvidence: ${latestSignal.evidence}`);
      return;
    }

    if (verb === 'focus') {
      const signal = findSignal(target);
      if (!signal) {
        addLine(`FOCUS FAILED: "${target || normalizedCommand}" is not a known anomaly key.`, 'error');
        return;
      }

      if (!discoveredSignalSet.has(signal.id)) {
        addLine(`FOCUS DENIED: ${signal.title} is still sealed. Lock the frequency before focusing it.`, 'error');
        return;
      }

      focusSignal(signal.id);
      addDiaryEntry(`Terminal focus set to ${signal.title}.`, 'secret', selectedDistrict.name);
      addLine(`FOCUS SET: ${signal.title} / ${signal.freq.toFixed(1)}MHz / ${signal.mapFocus.toUpperCase()}`);
      return;
    }

    if (verb === 'trace' || verb === 'signal' || SIGNAL_CATALOG.some((signal) => signal.id === cmd)) {
      const signal = findSignal(target || cmd);
      if (!signal) {
        addLine(`TRACE FAILED: "${target || normalizedCommand}" is not a known anomaly key.`, 'error');
        return;
      }

      if (!discoveredSignalSet.has(signal.id)) {
        addLine(`TRACE DENIED: ${signal.title} is still sealed. The interceptor must collect signal evidence first.`, 'error');
        return;
      }

      focusSignal(signal.id);
      addDiaryEntry(`Terminal trace opened for ${signal.title}.`, 'secret', selectedDistrict.name);
      const terminalAction = signal.investigation.actions.find((action) => action.type === 'terminal' && action.command?.toLowerCase() === `trace ${signal.id}`);
      const instrument = terminalAction ? getInstrument(signal.id, terminalAction.id) : undefined;
      const alreadyCaptured = terminalAction && investigationState.threads[signal.id]?.completedActionIds.includes(terminalAction.id);
      if (terminalAction && !instrument) {
        completeInvestigationAction(signal.id, terminalAction.id);
      }
      const record = instrument && !alreadyCaptured
        ? `\n${instrument.title.toUpperCase()}: 请回到调查台采集原始曲线。`
        : terminalAction ? formatCapturedRecord(signal.id, terminalAction.id) : '';
      addLine(`${signal.title} / ${signal.freq.toFixed(1)}MHz\n${signal.message}\n地图标记 ${signal.mapFocus.toUpperCase()} · 来源 ${signal.origin}${record}`);
      return;
    }

    if (cmd === 'scan_enemies') {
      addLine(`SCANNING ALL SECTORS... [||||||||||] 100%.\nNo declared enemies in civic space. ${latestSignal ? `Anomaly pressure remains attached to ${latestSignal.title}.` : 'Unexplained pressure persists below foundation vents.'}`);
      return;
    }

    addLine(`ERROR: Command "${normalizedCommand}" not recognized. Type "help" for valid commands.`, 'error');
  }, [
    activeDirective,
    completeInvestigationAction,
    readTerminalRecord,
    addDiaryEntry,
    addLine,
    currentDistricts,
    discoveredSignalIds,
    discoveredSignalSet,
    findDistrict,
    findSignal,
    focusSignal,
    investigationState,
    isPastMode,
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

  const runRoutedCommand = useEffectEvent(() => {
    if (!terminalCommandRequest || lastTerminalCommandRequestRef.current === terminalCommandRequest.id) return;
    lastTerminalCommandRequestRef.current = terminalCommandRequest.id;
    onOpenChange(true);
    setInput('');
    addLine(`COMMAND ROUTED: ${terminalCommandRequest.label}.`);
    runCommand(terminalCommandRequest.command);
  });

  useEffect(() => {
    if (!terminalCommandRequest) return;
    const routeTimer = window.setTimeout(runRoutedCommand, 0);
    return () => window.clearTimeout(routeTimer);
  }, [terminalCommandRequest]);

  const submitQuickCommand = (command: string) => {
    runCommand(command);
    setInput('');
  };

  const submitCurrentInput = useCallback(() => {
    const fullCommand = input.trim();
    if (!fullCommand) return;
    runCommand(fullCommand);
    setInput('');
  }, [input, runCommand]);

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

  const prefix = input.toLowerCase().trimStart().replace(/\s+/g, ' ');
  const [verb] = prefix.split(' ');
  const getCandidates = () => {
    if (!prefix.includes(' ')) return COMMANDS;
    if (verb === 'go' || verb === 'district') return currentDistricts.map((district) => `${verb} ${district.id}`);
    if (verb === 'trace' || verb === 'focus') return discoveredSignalIds.map((id) => `${verb} ${id}`);
    if (verb === 'complete' && latestSignal) return latestSignal.investigation.actions.map((action) => `complete ${action.id}`);
    return COMMANDS;
  };
  const suggestion = prefix ? getCandidates().find((candidate) => candidate.startsWith(prefix) && candidate !== prefix) : undefined;

  const applySuggestion = () => {
    if (!suggestion) return;
    const supportsArguments = ['go', 'district', 'trace', 'focus', 'complete'].includes(suggestion);
    setInput(supportsArguments ? `${suggestion} ` : suggestion);
    setCommandHistoryIndex(null);
    inputRef.current?.focus();
  };

  return (
    <div className={`deep-terminal-container ${isOpen ? 'open' : 'closed'}`} onKeyDown={(event) => {
      if (event.key !== 'Escape' || !isOpen || event.nativeEvent.isComposing) return;
      event.preventDefault();
      onOpenChange(false);
      playUISound('click');
      toggleRef.current?.focus({ preventScroll: true });
    }}>
      <button
        ref={toggleRef}
        className="terminal-header"
        onClick={() => onOpenChange(!isOpen)}
        type="button"
        aria-expanded={isOpen}
        aria-controls="deep-terminal-content"
        aria-label={isOpen ? '收起深层终端' : '打开深层终端'}
      >
        <div className="terminal-title">
          <TerminalIcon size={14} className="terminal-icon" />
          <span>{isOpen ? '深层终端' : '终端'}</span>
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
      
      <div className="terminal-body" id="deep-terminal-content" inert={!isOpen}>
        <div className="terminal-output" ref={scrollRef} role="log" aria-label="终端输出">
          {history.map((entry, i) => (
            <div key={i} className={`terminal-line ${entry.type}`}>
              {entry.text}
            </div>
          ))}
        </div>
        <div className="terminal-quick-actions" aria-label="终端快捷指令">
          <button type="button" onClick={() => submitQuickCommand('world_status')}>world</button>
          <button type="button" onClick={() => submitQuickCommand('signals')}>signals</button>
          <button type="button" onClick={() => submitQuickCommand('memory')}>memory</button>
          <button type="button" onClick={() => submitQuickCommand('latest_signal')}>latest</button>
          <button type="button" onClick={() => submitQuickCommand('signal_pressure')}>pressure</button>
        </div>
        <form onSubmit={handleCommand} className="terminal-input-form">
          <span className="terminal-prompt">&gt;</span>
          <input
            ref={inputRef}
            aria-label="终端指令"
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCommandHistoryIndex(null);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;

              if (event.key === 'Tab' && suggestion && !event.shiftKey) {
                event.preventDefault();
                applySuggestion();
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
            placeholder="Enter command..."
          />
        </form>
        {suggestion && (
          <button type="button" className="terminal-suggestion" onClick={applySuggestion}>
            <kbd>Tab</kbd> {suggestion}
          </button>
        )}
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
