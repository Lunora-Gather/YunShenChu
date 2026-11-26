import { useRef, useState } from 'react';
import { Download, FileCheck2, FolderOpen, X } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { MAX_OBSERVER_BACKUP_BYTES, parseObserverBackup } from '../../context/observerStorage';
import type { ObserverBackup } from '../../context/observerStorage';
import { REPORT_ACTION_ID } from '../../data/caseFiles';
import ConsoleDialog from '../ConsoleDialog/ConsoleDialog';
import './SaveDesk.css';

interface SaveDeskProps {
  opener: HTMLElement | null;
  onClose: () => void;
  replay: boolean;
}

const sourceLabels = {
  original: '主存档',
  replay: '重玩档',
  legacy: '旧版调查档',
} as const;

export default function SaveDesk({ opener, onClose, replay }: SaveDeskProps) {
  const { observerMemory, exportObserverBackup, restoreObserverBackup } = useCity();
  const [selected, setSelected] = useState<{ name: string; backup: ObserverBackup } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const fileSequence = useRef(0);
  const restoring = useRef(false);
  const slotLabel = replay ? sourceLabels.replay : sourceLabels.original;

  const downloadBackup = () => {
    const url = URL.createObjectURL(new Blob([exportObserverBackup()], { type: 'application/json' }));
    const link = document.createElement('a');
    const now = new Date();
    const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((part) => String(part).padStart(2, '0')).join('-');
    link.href = url;
    link.download = `the-deep-cloud-${replay ? 'replay' : 'investigation'}-${date}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const chooseBackup = async (file: File) => {
    const sequence = ++fileSequence.current;
    setError('');
    setNotice('');
    setSelected(null);

    if (file.size > MAX_OBSERVER_BACKUP_BYTES) {
      setError('备份文件超过 256 KB 上限。');
      return;
    }
    try {
      const text = await file.text();
      if (sequence !== fileSequence.current) return;
      const result = parseObserverBackup(text);
      if ('error' in result) setError(result.error);
      else setSelected({ name: file.name, backup: result.backup });
    } catch {
      if (sequence === fileSequence.current) setError('文件读取失败，请重新选择。');
    }
  };

  const restore = async () => {
    if (!selected || restoring.current) return;
    restoring.current = true;
    setBusy(true);
    setError('');
    const result = await restoreObserverBackup(selected.backup);
    restoring.current = false;
    setBusy(false);
    if (!result.saved) {
      setError(result.message);
      return;
    }
    setSelected(null);
    setNotice(result.keptEnding ? `已合并至${slotLabel}，沿用本档已有的结局。`
      : `已合并至${slotLabel}。`);
    requestAnimationFrame(() => chooseButton.current?.focus({ preventScroll: true }));
  };

  const close = () => {
    if (!restoring.current) onClose();
  };

  const progress = selected?.backup.progress;
  const filed = progress ? Object.values(progress.completedInvestigationActions)
    .filter((actions) => actions.includes(REPORT_ACTION_ID)).length : 0;

  return (
    <ConsoleDialog className="save-overlay" titleId="save-desk-title" opener={opener} onClose={close}>
      <section lang="zh-CN" className="save-desk" aria-busy={busy}>
        <header className="save-heading">
          <div>
            <p>{slotLabel}</p>
            <h2 id="save-desk-title">管理存档</h2>
          </div>
          <button className="save-close" type="button" aria-label="关闭存档管理"
            data-dialog-focus onClick={close} disabled={busy}><X size={19} aria-hidden="true" /></button>
        </header>
        <div className="save-body">
          <p>可以下载当前案卷和交班簿，也可以从备份合并进度。</p>
          {!observerMemory.canPersist && (
            <p className="save-advice">进度暂存在这个页面。关闭前请下载备份。</p>
          )}
          <div className="save-actions">
            <button type="button" className="save-action" onClick={downloadBackup} disabled={busy}>
              <Download size={17} aria-hidden="true" /> 下载备份
            </button>
            <button ref={chooseButton} type="button" className="save-action" onClick={() => uploadRef.current?.click()} disabled={busy}>
              <FolderOpen size={17} aria-hidden="true" /> 选择备份
            </button>
            <input ref={uploadRef} type="file" accept=".json,application/json" aria-label="备份文件" hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) void chooseBackup(file);
              }} />
          </div>
          {selected && progress && (
            <div className="save-preview">
              <h3><FileCheck2 size={17} aria-hidden="true" />{selected.name}</h3>
              <p aria-live="polite">{sourceLabels[selected.backup.source]} · 已锁定 {progress.discoveredSignalIds.length} 个信号 · 已结案 {filed} 起</p>
              {progress.nightWatch && <p>巡查已交 {progress.nightWatch.number - 1} 班，合并时采用进度较远的巡查簿。</p>}
              <p>合并会补入案卷记录，并保留本档已有的结局。</p>
              <div className="save-actions">
                <button type="button" className="save-merge" onClick={() => void restore()} disabled={busy}>
                  {busy ? '正在合并…' : '合并进度'}
                </button>
                <button className="save-action" type="button" disabled={busy}
                  onClick={() => {
                    setSelected(null);
                    setError('');
                    chooseButton.current?.focus({ preventScroll: true });
                  }}>取消</button>
              </div>
            </div>
          )}
          <p className="save-feedback" role="status">{error || notice}</p>
        </div>
      </section>
    </ConsoleDialog>
  );
}
