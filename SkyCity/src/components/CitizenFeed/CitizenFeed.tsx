import React, { useEffect, useState } from 'react';
import './CitizenFeed.css';
import { Check, MessageSquare } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { getFieldRecord } from '../../data/caseFiles';

interface FeedItem {
  id: string;
  user: string;
  handle: string;
  content: string;
}

const CITIZEN_NAMES = ['SkyWalker', 'CloudDrifter', 'MistRunner', 'AeroPilot', 'VaporArtist', 'NimbusFan'];
const MESSAGES = [
  'Beautiful sunset over Apex today! #CloudLife',
  'Anyone else seeing those wind whales near the East docks?',
  'Best coffee in Mid-Ring is definitely at The Blue Vapor.',
  'Transit delays are getting crazy. When is the new shuttle coming?',
  'Just saw a maintenance drone do a flip! #SkiesOfDeepCloud',
  'Looking for hiking buddies to the floating gardens this weekend.',
  'The ion storm last night was terrifying but gorgeous.',
  'Energy prices are down! Thank the Core.',
  'New art exhibit at the Crystal Gallery is a must-see.',
  'Did the sky just ripple near the Foundation thermal vents?',
  "Gravity Core B-4 is making that heartbeat sound again. My coffee is pulsing.",
  'Anyone else see the shadow? It must have been 500 meters long. #AbyssWhale',
  "I heard a deep, low-frequency hum coming from the Abyss. It's inside my head.",
  'Shadow Ministry agents spotted at the East Docks. What are they hiding?',
  'Emergency lockdown in Sector 7! The ground just tilted. Are the anchors slipping?',
  'If you see the Abyss Whale, do not blink. It is looking at YOU.',
];

const generateItem = (id: number): FeedItem => {
  const user = CITIZEN_NAMES[Math.floor(Math.random() * CITIZEN_NAMES.length)];
  return {
    id: `feed-${id}`,
    user,
    handle: `@${user.toLowerCase()}`,
    content: MESSAGES[Math.floor(MESSAGES.length * Math.random())],
  };
};

const FEED_SIZE = 10;
const createInitialFeed = () => Array.from({ length: 5 }, (_, index) => generateItem(index));
const witnessRecord = getFieldRecord('abyss-whale', 'review-citizens');

const CitizenFeed: React.FC = () => {
  const { completeInvestigationAction, investigationState, latestSignal, signalTelemetry } = useCity();
  const [feed, setFeed] = useState<FeedItem[]>(createInitialFeed);
  const [showAmbient, setShowAmbient] = useState(false);
  const thread = investigationState.latestThread;
  const witness = latestSignal?.id === 'abyss-whale' ? witnessRecord : undefined;
  const witnessFiled = witness && thread?.completedActionIds.includes(witness.actionId);

  useEffect(() => {
    let nextId = 5;
    const interval = setInterval(() => {
      const item = generateItem(nextId++);
      setFeed((prev) => [item, ...prev.slice(0, FEED_SIZE - 1)]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="citizen-feed-container glass-panel">
      <div className="feed-header">
        <MessageSquare size={14} />
        <span>居民来讯</span>
        <strong>信号压力 {signalTelemetry.pressure}%</strong>
      </div>
      {witness && (
        <section className="feed-witness" aria-labelledby="vent-witness-title">
          <div><h2 id="vent-witness-title">{witness.source}</h2><time>{witness.time}</time></div>
          {witness.readings.map(({ id, value }) => <blockquote key={id}>{value}</blockquote>)}
          {witnessFiled ? (
            <p className="feed-witness-status" role="status"><Check size={15} aria-hidden="true" /> 证词已归档</p>
          ) : thread?.nextAction?.id === witness.actionId ? (
            <button className="feed-witness-capture" type="button" onClick={() => completeInvestigationAction(thread.signal.id, witness.actionId)}>
              收录值班证词
            </button>
          ) : <p className="feed-witness-status">先在压力曲线上标出波峰，再收录这份证词。</p>}
        </section>
      )}
      {latestSignal && thread && (
        <div className="feed-filters" aria-label="来讯范围">
          <button type="button" aria-pressed={!showAmbient} onClick={() => setShowAmbient(false)}>本案来讯</button>
          <button type="button" aria-pressed={showAmbient} onClick={() => setShowAmbient(true)}>全城来讯</button>
        </div>
      )}
      <div className="feed-list">
        {latestSignal && thread && !showAmbient ? (
          <div className="feed-item tone-signal">
            <div className="item-user">
              <span className="user-name">{latestSignal.title}</span>
              <span className="user-handle">{thread.stage}</span>
            </div>
            <p className="item-content">{latestSignal.citizenReport}</p>
            {thread.stage !== 'detected' && (
              <p className="item-content feed-corroboration">{thread.stage === 'contained' ? latestSignal.investigation.contained : latestSignal.evidence}</p>
            )}
          </div>
        ) : feed.map((item) => (
          <div key={item.id} className="feed-item">
            <div className="item-user">
              <span className="user-name">{item.user}</span>
              <span className="user-handle">{item.handle}</span>
            </div>
            <p className="item-content">{item.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CitizenFeed;
