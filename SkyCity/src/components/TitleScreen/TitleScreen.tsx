import { ArrowRight, Moon, Radio } from 'lucide-react';
import cityPanorama from '../../assets/city-panorama.jpg';
import { watchResume } from '../../data/nightWatch';
import type { WatchBook } from '../../data/nightWatch';

interface TitleScreenProps {
  replay: boolean;
  locked: number;
  filed: number;
  finished: boolean;
  lead?: string;
  premise?: string;
  canPersist: boolean;
  nightWatch?: WatchBook;
  onEnter: () => void;
  onManageSaves: (opener: HTMLElement) => void;
}

export default function TitleScreen({ replay, locked, filed, finished, lead, premise, canPersist, nightWatch, onEnter, onManageSaves }: TitleScreenProps) {
  const destination = new URL(window.location.href);
  destination.hash = '';
  destination.searchParams.delete('view');
  if (replay) destination.searchParams.delete('replay');
  else destination.searchParams.set('replay', '');

  const watch = watchResume(nightWatch, filed === 5);
  const hasProgress = locked > 0 || Boolean(nightWatch);
  const mainLabel = finished ? '重返云城' : locked ? '继续调查' : '开始调查';

  return (
    <main className="game-title" lang="zh-CN">
      <img className="title-art" src={cityPanorama} alt="" fetchPriority="high" width="1536" height="1024" />
      <div className="title-gradient" aria-hidden="true" />
      <div className="title-content">
        <p className="title-mark" lang="en">The Deep Cloud</p>
        <h1>云深处</h1>
        <p className="title-premise">{finished ? '零号月台的调度回执已经送达。天亮以前，三环还留着几盏值班灯。'
          : premise ?? '云层底下传来第二声回响。你摊开航道图，图上只画到脚下这座栈桥。'}</p>
        <div className="title-actions">
          <button className="title-play title-route" type="button" onClick={onEnter}>
            <Radio size={20} aria-hidden="true" />
            <span><b>{mainLabel}</b><small>{finished ? '重读案卷与零号月台回执' : lead ?? '下环栈桥 · 查访云下回波'}</small></span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <a className="title-watch title-route" href="#watch">
            <Moon size={19} aria-hidden="true" /><span><b>{watch.label}</b><small>{watch.detail}</small></span>
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <div className="title-save-row">
          <p className="title-save">
            {replay && <span>重玩档</span>}
            {locked > 0 && <span>已结案 {filed} / 5</span>}
            <span>{canPersist ? '本机自动存档' : '本次进度仅存于此页'}</span>
          </p>
          <button className="title-manage" type="button" onClick={event => onManageSaves(event.currentTarget)}>管理存档</button>
          {(replay || (hasProgress && canPersist)) && <a className="title-replay" href={destination.href}>
            {replay ? '返回主存档' : '打开独立重玩档'}
          </a>}
        </div>
      </div>
    </main>
  );
}
