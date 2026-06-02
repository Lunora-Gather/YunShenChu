import React, { useEffect, useRef, useState } from 'react';
import './CitizenFeed.css';
import { MessageSquare, Heart, Share2 } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import type { SignalIntel } from '../../data/signals';

interface FeedItem {
  id: string;
  user: string;
  handle: string;
  content: string;
  timestamp: string;
  likes: number;
  tone?: 'normal' | 'signal';
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

let feedCounter = 0;

const generateItem = (signal?: SignalIntel): FeedItem => {
  feedCounter += 1;
  const user = CITIZEN_NAMES[Math.floor(Math.random() * CITIZEN_NAMES.length)];
  return {
    id: `feed-${feedCounter}`,
    user,
    handle: `@${user.toLowerCase()}`,
    content: signal?.citizenReport ?? MESSAGES[Math.floor(MESSAGES.length * Math.random())],
    timestamp: 'Just now',
    likes: signal ? 70 + Math.floor(Math.random() * 80) : Math.floor(Math.random() * 50),
    tone: signal ? 'signal' : 'normal',
  };
};

const createInitialFeed = () => Array.from({ length: 5 }).map(() => generateItem());

const CitizenFeed: React.FC = () => {
  const { latestSignal, signalIntel, signalTelemetry } = useCity();
  const [feed, setFeed] = useState<FeedItem[]>(createInitialFeed);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const shouldEchoSignal = signalIntel.length > 0 && Math.random() < 0.38;
      const signal = shouldEchoSignal ? signalIntel[Math.floor(Math.random() * signalIntel.length)] : undefined;
      setFeed((prev) => [...prev.slice(-10), generateItem(signal)]);
    }, 5000);

    return () => clearInterval(interval);
  }, [signalIntel]);

  useEffect(() => {
    if (!latestSignal) return;
    const timer = window.setTimeout(() => {
      setFeed((prev) => [...prev.slice(-10), generateItem(latestSignal)]);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [latestSignal]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feed]);

  return (
    <div className="citizen-feed-container glass-panel">
      <div className="feed-header">
        <MessageSquare size={14} />
        <span>CITIZEN FEED</span>
        <strong>{signalTelemetry.pressure}% signal pressure</strong>
      </div>
      <div className="feed-list" ref={scrollRef}>
        {feed.map((item) => (
          <div key={item.id} className={`feed-item tone-${item.tone ?? 'normal'}`}>
            <div className="item-user">
              <span className="user-name">{item.user}</span>
              <span className="user-handle">{item.handle}</span>
            </div>
            <p className="item-content">{item.content}</p>
            <div className="item-footer">
              <button className="item-action item-likes" type="button" aria-label={`Like post from ${item.user}`}>
                <Heart size={10} /> {item.likes}
              </button>
              <button className="item-action item-share" type="button" aria-label={`Share post from ${item.user}`}>
                <Share2 size={10} />
              </button>
              <span className="item-time">{item.timestamp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CitizenFeed;
