import React from 'react';
import './SystemAlerts.css';
import { useCity } from '../../context/CityContext';
import { AlertCircle, X, Info, AlertTriangle } from 'lucide-react';

const SystemAlerts: React.FC = () => {
  const { alerts, removeAlert } = useCity();

  if (alerts.length === 0) return null;

  return (
    <div className="alerts-container" role="region" aria-live="polite" aria-label="System alerts">
      {alerts.map(alert => (
        <div key={alert.id} className={`alert-toast alert-${alert.type}`}>
          <div className="alert-icon">
            {alert.type === 'info' && <Info size={18} />}
            {alert.type === 'warning' && <AlertTriangle size={18} />}
            {alert.type === 'critical' && <AlertCircle size={18} />}
          </div>
          <div className="alert-content">
            <div className="alert-header">
              <span className="alert-title">{alert.type.toUpperCase()} ALERT</span>
              <button
                className="alert-close-btn"
                onClick={() => removeAlert(alert.id)}
                type="button"
                aria-label={`Dismiss ${alert.type} alert`}
              >
                <X size={14} />
              </button>
            </div>
            <p className="alert-message">{alert.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SystemAlerts;
