import React, { useState, useEffect } from 'react';
import './SecurityCamera.css';

interface SecurityCameraProps {
  isActive: boolean;
  onClose: () => void;
  districtName: string;
}

const SecurityCamera: React.FC<SecurityCameraProps> = ({ isActive, onClose, districtName }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className={`security-camera-overlay ${isActive ? 'active' : ''}`} role="dialog" aria-modal="true" aria-label={`Security camera feed for ${districtName}`}>
      <div className="camera-inner"></div>
      
      <div className="camera-header">
        <div className="rec-indicator">
          <div className="rec-dot"></div>
          REC
        </div>
        <div>CAM 04 - {districtName.toUpperCase()}</div>
      </div>

      <button className="close-camera-btn" onClick={onClose} type="button">EXIT</button>

      <div className="camera-feed-content">
        [ NO SIGNAL DETECTED - SIMULATED FEED ONLY ]
      </div>

      <div className="camera-footer">
        <div>SYS.V.1.3</div>
        <div>{time.toLocaleDateString()} {time.toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default SecurityCamera;
