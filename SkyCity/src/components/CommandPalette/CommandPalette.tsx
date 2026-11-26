import { useState } from 'react';
import { BookOpen, Camera, Radio, Search, Terminal, X } from 'lucide-react';
import ConsoleDialog from '../ConsoleDialog/ConsoleDialog';

const commands = [
  { id: 'signals', label: '信号接收器', aliases: 'signal interceptor signals 全城扫频 监听', icon: Radio },
  { id: 'camera', label: '城区监控', aliases: 'security camera 摄像 监控底片', icon: Camera },
  { id: 'archive', label: '调查档案', aliases: 'anomaly archive 案卷 证据', icon: BookOpen },
  { id: 'diary', label: '观察者日记', aliases: 'observer diary 日志 记录', icon: BookOpen },
  { id: 'terminal', label: '深层终端', aliases: 'deep terminal 指令 命令行', icon: Terminal },
] as const;

export type ConsoleCommand = typeof commands[number]['id'];

interface CommandPaletteProps {
  opener: HTMLElement | null;
  onClose: () => void;
  onSelect: (command: ConsoleCommand) => void;
}

export default function CommandPalette({ opener, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const matches = commands.filter(({ label, aliases }) => (label + ' ' + aliases).includes(query.trim().toLowerCase()));

  return (
    <ConsoleDialog className="palette-overlay" titleId="command-palette-title" opener={opener} onClose={onClose}>
      <section className="command-palette">
        <header>
          <h2 id="command-palette-title">调查台指令</h2>
          <button type="button" className="palette-close" aria-label="关闭指令搜索" onClick={onClose}><X size={18} /></button>
        </header>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (matches[0]) onSelect(matches[0].id);
        }}>
          <Search size={16} aria-hidden="true" />
          <input data-dialog-focus type="search" aria-label="搜索调查台指令" placeholder="搜索调查台指令" value={query}
            onKeyDown={event => {
              if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.preventDefault();
            }}
            onChange={(event) => setQuery(event.target.value)} />
        </form>
        <div className="palette-list">
          {matches.length === 0 ? <p role="status">没有找到指令，试试“档案”或“信号”。</p> : matches.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => onSelect(id)}><Icon size={16} aria-hidden="true" />{label}</button>
          ))}
        </div>
      </section>
    </ConsoleDialog>
  );
}
