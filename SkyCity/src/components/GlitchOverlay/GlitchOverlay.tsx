import { Radio } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import './GlitchOverlay.css';

export default function GlitchOverlay() {
  const { world, alerts, isPastMode, signalTelemetry } = useCity();
  if (isPastMode) return null;

  const warning = signalTelemetry.pressure >= 72 || signalTelemetry.level === 'breach'
    ? '信号干扰' : world.global_stats.energy_index < 85
    ? '供电偏低' : alerts.some(alert => alert.message.toLowerCase().includes('ion storm'))
    ? '离子风暴' : null;

  return warning && <small className="scene-warning"><Radio size={13} aria-hidden="true" />{warning}</small>;
}
