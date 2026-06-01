import React from 'react';
import './Chronicle.css';

interface Event {
  year: string;
  event: string;
}

interface ChronicleProps {
  timeline: Event[];
}

const Chronicle: React.FC<ChronicleProps> = ({ timeline }) => {
  return (
    <div className="chronicle-container">
      <h4 className="chronicle-title">CITY CHRONICLE</h4>
      <div className="chronicle-track">
        {timeline.map((item, idx) => (
          <div key={idx} className="chronicle-item">
            <span className="chronicle-year">YR {item.year}</span>
            <span className="chronicle-dot"></span>
            <span className="chronicle-event">{item.event}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Chronicle;
