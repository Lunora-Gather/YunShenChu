/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import worldData from '../data/world.json';
import districtsData from '../data/districts.json';
import entitiesData from '../data/entities.json';
import pastWorldData from '../data/past_world.json';
import pastDistrictsData from '../data/past_districts.json';

interface District {
  id: string;
  name: string;
  description: string;
  coordinates: { x: number; y: number; z: number };
  altitude_range: number[];
  visual_style: string;
  security_level?: string;
  dominant_faction?: string;
  landmarks: Array<{ name: string; type: string; status: string }>;
  population: number;
  social_metrics: {
    happiness: number;
    education: number;
    productivity: number;
  };
}

type DistrictSource = Omit<District, 'population' | 'social_metrics'> & {
  social_metrics?: District['social_metrics'];
};
type WorldState = typeof worldData;
type WeatherState = WorldState['weather'];
type AlertType = SystemAlert['type'];

const presentDistricts = districtsData as DistrictSource[];
const archiveDistricts = pastDistrictsData as DistrictSource[];

export interface DiaryEntry {
  id: string;
  timestamp: Date;
  type: 'visit' | 'discovery' | 'system' | 'secret';
  location?: string;
  message: string;
}

interface CityState {
  currentTime: Date;
  selectedDistrict: District;
  districts: District[];
  activeDirective: string;
  weather: WeatherState;
  alerts: SystemAlert[];
  diary: DiaryEntry[];
  isDay: boolean;
  setDistrict: (id: string) => void;
  playUISound: (type?: 'beep' | 'click') => void;
  lastSoundTrigger: { type: 'beep' | 'click'; timestamp: number } | null;
  addAlert: (message: string, type?: 'info' | 'warning' | 'critical') => void;
  removeAlert: (id: string) => void;
  addDiaryEntry: (message: string, type: DiaryEntry['type'], location?: string) => void;
  world: WorldState;
  entities: typeof entitiesData;
  isPastMode: boolean;
  toggleTemporalView: () => void;
  currentDistricts: District[];
}

interface SystemAlert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  timestamp: Date;
}

const CityContext = createContext<CityState | undefined>(undefined);

export const CityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDistrictId, setSelectedDistrictId] = useState(districtsData[0].id);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [lastSoundTrigger, setLastSoundTrigger] = useState<{ type: 'beep' | 'click'; timestamp: number } | null>(null);
  const [isPastMode, setIsPastMode] = useState(false);
  const idCounterRef = useRef(0);

  const nextId = useCallback((prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}-${idCounterRef.current}`;
  }, []);
  
  // Dynamic City State
  const [districts, setDistricts] = useState<District[]>(() => {
    // Initialize population distribution
    const totalPop = worldData.global_stats.total_population;
    return presentDistricts.map(d => ({
      ...d,
      population: d.id === 'apex' ? Math.floor(totalPop * 0.12) : 
                  d.id === 'mid_ring' ? Math.floor(totalPop * 0.64) : 
                  Math.floor(totalPop * 0.24),
      social_metrics: d.social_metrics || { happiness: 80, education: 80, productivity: 80 }
    }));
  });
  const [activeDirective, setActiveDirective] = useState(worldData.active_directives[0]);
  const [world, setWorld] = useState<WorldState>(worldData);
  const [weather, setWeather] = useState<WeatherState>(worldData.weather);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentDistricts = useMemo<District[]>(() => {
    if (!isPastMode) return districts;

    return archiveDistricts.map(d => ({
      ...d,
      population: 0,
      social_metrics: d.social_metrics || { happiness: 50, education: 50, productivity: 50 }
    }));
  }, [districts, isPastMode]);
  const selectedDistrict = useMemo(() => {
    return currentDistricts.find(d => d.id === selectedDistrictId) || currentDistricts[0];
  }, [currentDistricts, selectedDistrictId]);
  
  // Day/Night logic: 6 AM to 6 PM is day
  const hour = currentTime.getHours();
  const isDay = hour >= 6 && hour < 18;

  const playUISound = useCallback((type: 'beep' | 'click' = 'beep') => {
    setLastSoundTrigger({ type, timestamp: Date.now() });
  }, []);

  const setDistrict = useCallback((id: string) => {
    if (id !== selectedDistrictId) {
      setSelectedDistrictId(id);
      playUISound('beep');
    }
  }, [playUISound, selectedDistrictId]);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const addAlert = useCallback((message: string, type: AlertType = 'info') => {
    const id = nextId('alert');
    const newAlert = { id, message, type, timestamp: new Date() };
    setAlerts(prev => [newAlert, ...prev].slice(0, 5));
    
    // Auto-remove alert after 10 seconds
    setTimeout(() => removeAlert(id), 10000);
  }, [nextId, removeAlert]);

  const addDiaryEntry = useCallback((message: string, type: DiaryEntry['type'], location?: string) => {
    const entry: DiaryEntry = {
      id: nextId('diary'),
      timestamp: new Date(),
      type,
      location,
      message
    };
    setDiary(prev => [entry, ...prev]);
  }, [nextId]);

  const toggleTemporalView = useCallback(() => {
    setIsPastMode(prev => {
      const next = !prev;
      if (next) {
        setWorld(pastWorldData as WorldState);
        setWeather(pastWorldData.weather as WeatherState);
        setSelectedDistrictId(archiveDistricts[0].id);
        addAlert("TEMPORAL SHIFT DETECTED: Accessing Year 01 Archive", "warning");
        addDiaryEntry("Temporal anomaly triggered. System recalibrating to Foundation Era data.", "secret");
      } else {
        setWorld(worldData);
        setWeather(worldData.weather);
        setSelectedDistrictId(presentDistricts[0].id);
        addAlert("TEMPORAL STABILIZED: Returning to Present", "info");
      }
      playUISound('click');
      return next;
    });
  }, [addAlert, addDiaryEntry, playUISound]);

  // Migration Engine: Randomly shift population and productivity
  useEffect(() => {
    const migrationTimer = setInterval(() => {
      setDistricts(prev => {
        const nextDistricts = [...prev];
        const sourceIdx = Math.floor(Math.random() * nextDistricts.length);
        let targetIdx = Math.floor(Math.random() * nextDistricts.length);
        while (targetIdx === sourceIdx) {
          targetIdx = Math.floor(Math.random() * nextDistricts.length);
        }

        const source = { ...nextDistricts[sourceIdx] };
        const target = { ...nextDistricts[targetIdx] };

        // Population shift (commute simulation)
        const popShift = Math.floor(source.population * (0.01 + Math.random() * 0.02));
        source.population -= popShift;
        target.population += popShift;

        // Productivity flux
        const prodShift = (Math.random() - 0.5) * 5;
        source.social_metrics = { 
          ...source.social_metrics, 
          productivity: Math.max(50, Math.min(100, source.social_metrics.productivity + prodShift))
        };
        target.social_metrics = { 
          ...target.social_metrics, 
          productivity: Math.max(50, Math.min(100, target.social_metrics.productivity - prodShift))
        };

        nextDistricts[sourceIdx] = source;
        nextDistricts[targetIdx] = target;
        
        return nextDistricts;
      });

      if (Math.random() > 0.7) {
        addDiaryEntry("City Migration: Heavy transit flow detected between sectors.", "system");
      }
    }, 30000);

    return () => clearInterval(migrationTimer);
  }, [addDiaryEntry]);

  // Active Directive Simulation
  useEffect(() => {
    const directiveTimer = setInterval(() => {
      const directives = worldData.active_directives;
      const nextDirective = directives[Math.floor(Math.random() * directives.length)];
      
      setActiveDirective(current => {
        if (current !== nextDirective) {
          addAlert(`NEW DIRECTIVE ISSUED: ${nextDirective}`, "info");
          addDiaryEntry(`Governance Update: High Council issued directive "${nextDirective}".`, "system");
        }
        return nextDirective;
      });
    }, 45000);

    return () => clearInterval(directiveTimer);
  }, [addAlert, addDiaryEntry]);

  // Ecology Engine: Weather-Energy-Economy Dynamics
  useEffect(() => {
    const ecologyTimer = setInterval(() => {
      setWorld(prev => {
        const isStorm = weather.current_condition.toLowerCase().includes('storm') || 
                        weather.current_condition.toLowerCase().includes('ion');
        
        let energyChange = 0;
        let economyTrend: string;
        let tradeVolumeChange: number;

        if (isStorm) {
          // Storms drain energy and crash markets
          energyChange = -(Math.random() * 2);
          economyTrend = 'Bearish';
          tradeVolumeChange = -(Math.random() * 50000);
        } else {
          // Normal weather allows slow recovery and steady markets
          if (prev.global_stats.energy_index < 98.5) {
            energyChange = Math.random() * 0.5;
          }
          economyTrend = Math.random() > 0.5 ? 'Bullish' : 'Stable';
          tradeVolumeChange = Math.random() * 20000;
        }

        const nextEnergy = Math.max(70, Math.min(100, prev.global_stats.energy_index + energyChange));
        const nextVolume = Math.max(500000, Math.min(2000000, (prev.economy?.trade_volume || 1250000) + tradeVolumeChange));
        
        // Critical alerts
        if (nextEnergy < 85 && prev.global_stats.energy_index >= 85) {
          addAlert("CRITICAL ENERGY DROP: Gravity Cores under-performing", "critical");
          addDiaryEntry("Critical System Failure: Energy levels dropped below safety threshold.", "system");
        }

        return {
          ...prev,
          global_stats: {
            ...prev.global_stats,
            energy_index: Number(nextEnergy.toFixed(1))
          },
          economy: {
            ...prev.economy,
            currency: 'Aether-Credits',
            market_trend: economyTrend,
            trade_volume: Math.floor(nextVolume)
          }
        };
      });
    }, 5000);

    return () => clearInterval(ecologyTimer);
  }, [weather, addAlert, addDiaryEntry]);

  // Random event simulator
  useEffect(() => {
    const events: Array<{ condition: string; type: AlertType; weather: string }> = [
      { condition: "Ion Storm Incoming", type: "warning", weather: "Heavy Ion Storm" },
      { condition: "Traffic Congestion", type: "info", weather: "Clear Sky with Ion Clouds" },
      { condition: "Gravity Core Flux", type: "critical", weather: "Static Cloud Cover" },
      { condition: "Clear Skies", type: "info", weather: "Perfectly Clear" }
    ];

    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const event = events[Math.floor(Math.random() * events.length)];
        addAlert(event.condition, event.type);
        
        // Update actual weather state
        if (event.weather) {
          setWeather(prev => ({ ...prev, current_condition: event.weather }));
        }
        
        if (event.type === 'critical' || event.type === 'warning') {
          addDiaryEntry(`Weather Shift: ${event.weather}. Observer warned of atmospheric volatility.`, 'system');
        }
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [addAlert, addDiaryEntry]);

  return (
    <CityContext.Provider value={{ 
      currentTime, 
      selectedDistrict, 
      districts,
      currentDistricts,
      activeDirective,
      weather, 
      alerts, 
      diary,
      isDay,
      setDistrict,
      playUISound,
      lastSoundTrigger,
      addAlert,
      removeAlert,
      addDiaryEntry,
      world,
      entities: entitiesData,
      isPastMode,
      toggleTemporalView
    }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
};
