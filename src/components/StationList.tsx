import { useState, useEffect } from "react";
import { BroadcastStation, LocationGeoProfile } from "../types";
import { Radio, Play, Volume2, ShieldAlert, BadgeCheck, Tv, Search, Activity, Zap, Wifi } from "lucide-react";

interface StationListProps {
  currentCountryProfile: LocationGeoProfile | null;
  onSelectStation: (station: BroadcastStation) => void;
  activeStation: BroadcastStation | null;
  isPlaying: boolean;
  isProfileLoading?: boolean;
}

export default function StationList({
  currentCountryProfile,
  onSelectStation,
  activeStation,
  isPlaying,
  isProfileLoading = false,
}: StationListProps) {
  const [stations, setStations] = useState<BroadcastStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [broadcastType, setBroadcastType] = useState<'radio' | 'tv'>('radio');
  const [error, setError] = useState<string | null>(null);

  // Default Global Broadcast fallbacks
  const DEFAULT_GLOBAL_STATIONS: BroadcastStation[] = [
    {
      type: 'radio',
      changeid: "glob-1",
      stationuuid: "global-bbc",
      name: "BBC World Service",
      url: "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service",
      url_resolved: "https://bbradio.gcdn.co/bbcworldservice",
      homepage: "https://bbc.co.uk",
      favicon: "https://www.bbc.co.uk/favicon.ico",
      tags: "news,talk,world,english",
      country: "United Kingdom",
      countrycode: "GB",
      state: "London",
      language: "english",
      votes: 12053,
      clickcount: 24520,
      codec: "MP3",
      bitrate: 128
    },
    {
      type: 'radio',
      changeid: "glob-2",
      stationuuid: "global-fip",
      name: "FIP Paris",
      url: "https://stream.radiofrance.fr/fip/fip.m3u8",
      url_resolved: "https://stream.radiofrance.fr/fip/fip_hifi.mp3",
      homepage: "https://fip.fr",
      favicon: "https://www.radiofrance.fr/favicon.ico",
      tags: "eclectic,jazz,rock,chanson,france",
      country: "France",
      countrycode: "FR",
      state: "Paris, Île-de-France",
      language: "french",
      votes: 9540,
      clickcount: 18451,
      codec: "MP3",
      bitrate: 192
    },
    {
      type: 'radio',
      changeid: "glob-3",
      stationuuid: "global-somafm",
      name: "SomaFM - Groove Salad",
      url: "https://somafm.com/groovesalad130.pls",
      url_resolved: "https://ice1.somafm.com/groovesalad-128-mp3",
      homepage: "https://somafm.com",
      favicon: "https://somafm.com/img3/groovesalad120.png",
      tags: "ambient,chillout,downtempo,groove",
      country: "United States",
      countrycode: "US",
      state: "San Francisco, California",
      language: "english",
      votes: 8450,
      clickcount: 14500,
      codec: "MP3",
      bitrate: 128
    }
  ];

  const fetchRadioStations = (codesToQuery: string[]) => {
    const fetchPromises = codesToQuery.map(codeString => {
      const code = codeString.toLowerCase().trim();
      return fetch(`https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/${code}?limit=30&hidebroken=true&order=clickcount&reverse=true`)
        .then((res) => res.ok ? res.json() : [])
        .catch(() => []);
    });

    return Promise.all(fetchPromises).then(results => {
      let combined: BroadcastStation[] = results.flat().map(s => ({ ...s, type: 'radio' }));
      const seen = new Set<string>();
      return combined.filter(s => {
        const url = s.url_resolved || s.url;
        if (!url || !url.startsWith("http") || seen.has(s.stationuuid)) return false;
        seen.add(s.stationuuid);
        return true;
      }).sort((a, b) => (b.clickcount || 0) - (a.clickcount || 0)).slice(0, 45);
    });
  };

  const fetchTvStations = async (codesToQuery: string[]) => {
    try {
      // IPTV-ORG API endpoints
      const channelsRes = await fetch("https://iptv-org.github.io/api/channels.json");
      const streamsRes = await fetch("https://iptv-org.github.io/api/streams.json");
      
      if (!channelsRes.ok || !streamsRes.ok) return [];
      
      const allChannels = await channelsRes.json();
      const allStreams = await streamsRes.json();
      
      const codes = codesToQuery.map(c => c.toUpperCase());
      
      // Map streams by channel ID for fast lookup
      const streamMap = new Map();
      allStreams.forEach((s: any) => {
        if (!streamMap.has(s.channel)) streamMap.set(s.channel, s.url);
      });
      
      const filtered: BroadcastStation[] = allChannels
        .filter((c: any) => streamMap.has(c.id) && (codes.length === 0 || codes.includes(c.country)))
        .map((c: any) => ({
          type: 'tv',
          changeid: c.id,
          stationuuid: c.id,
          name: c.name,
          url: streamMap.get(c.id),
          url_resolved: streamMap.get(c.id),
          homepage: c.website || "",
          favicon: c.logo || "",
          tags: (c.categories || []).join(","),
          country: c.country,
          countrycode: c.country,
          state: c.city || "",
          language: (c.languages || [])[0] || "",
          votes: 0,
          clickcount: 0,
          codec: "HLS",
          bitrate: 0
        }));
        
      return filtered;
    } catch (e) {
      console.error("IPTV fetch error", e);
      return [];
    }
  };

  useEffect(() => {
    if (!currentCountryProfile) {
      if (broadcastType === 'tv') {
        setLoading(true);
        fetchTvStations([]).then(results => {
          setStations(results);
          setLoading(false);
        });
      } else {
        setStations(DEFAULT_GLOBAL_STATIONS.filter(s => s.type === broadcastType));
      }
      return;
    }

    setLoading(true);
    setError(null);
    setSearchQuery("");

    const rawCodes = currentCountryProfile?.countryCodes?.length 
      ? currentCountryProfile.countryCodes 
      : [currentCountryProfile?.countryCode];

    const codesToQuery = (rawCodes || []).filter(c => typeof c === "string" && c.trim().length > 0);

    const fetchTask = broadcastType === 'radio' 
      ? fetchRadioStations(codesToQuery)
      : fetchTvStations(codesToQuery);

    fetchTask.then(results => {
      setStations(results.length > 0 ? results : DEFAULT_GLOBAL_STATIONS.filter(s => s.type === broadcastType));
      setLoading(false);
    }).catch(() => {
      setStations(DEFAULT_GLOBAL_STATIONS.filter(s => s.type === broadcastType));
      setLoading(false);
    });
  }, [currentCountryProfile, broadcastType]);

  const filteredStations = stations.filter((station) => {
    const sQuery = searchQuery.trim().toLowerCase();
    const tQuery = tagQuery.trim().toLowerCase();
    
    const matchesKeyword = sQuery
      ? (station.name || '').toLowerCase().includes(sQuery) ||
        (station.state && String(station.state).toLowerCase().includes(sQuery)) ||
        (station.tags && String(station.tags).toLowerCase().includes(sQuery)) ||
        (station.country && String(station.country).toLowerCase().includes(sQuery))
      : true;

    const matchesTag = tQuery
      ? station.tags && String(station.tags).toLowerCase().includes(tQuery)
      : true;

    return matchesKeyword && matchesTag;
  }).slice(0, 500);

  const isCurrentlyLoading = loading || isProfileLoading;

  return (
    <div className="flex flex-col h-full bg-transparent gap-4">
      
      {/* Type Toggle & Search Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-display font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">
            {isCurrentlyLoading
              ? "Scanning Frequencies..."
              : broadcastType === 'radio' ? "Radio Streams" : "TV Channels"}
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-300 font-mono flex items-center gap-2">
            <span>{filteredStations.length} active in region</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, country, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-64 placeholder:text-slate-400"
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setBroadcastType('radio')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 ${
                broadcastType === 'radio' 
                  ? "bg-white dark:bg-slate-800 text-emerald-500 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              RADIO
            </button>
            <button
              onClick={() => setBroadcastType('tv')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 ${
                broadcastType === 'tv' 
                  ? "bg-white dark:bg-slate-800 text-emerald-500 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              TV
            </button>
          </div>
        </div>
      </div>

      {isCurrentlyLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col gap-3 animate-pulse h-[135px]" />
          ))}
        </div>
      ) : filteredStations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStations.map((station) => {
            const isCurrent = activeStation?.stationuuid === station.stationuuid;
            const tagsList = station.tags ? station.tags.split(",").slice(0, 3) : ["variety"];

            return (
              <div
                key={station.stationuuid}
                onClick={() => onSelectStation(station)}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-[150px] relative cursor-pointer group bg-white dark:bg-slate-900 shadow-sm ${
                  isCurrent
                    ? "border-emerald-500 ring-1 ring-emerald-500/20"
                    : "border-slate-200/60 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow"
                }`}
              >
                <div className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-950 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-200/50 dark:border-slate-800/40">
                    {station.favicon ? (
                      <img src={station.favicon} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
                        {station.type === 'tv' ? <Tv className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-display font-bold text-xs text-slate-800 dark:text-slate-100 truncate flex items-center gap-1 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                      {station.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 dark:text-slate-300 truncate block mt-0.5">
                      {station.state || (station.type === 'tv' ? "Live TV" : "Radio Stream")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-2.5 h-6 overflow-hidden">
                  {tagsList.map((tag, i) => (
                    <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 rounded">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/50 pt-3 mt-3">
                  <div className="flex items-center gap-3 text-[9px] text-slate-400 dark:text-slate-300 font-mono tracking-wider">
                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded uppercase">
                      <Zap className="w-3 h-3 text-emerald-500" />
                      {station.codec || (station.type === 'tv' ? "HLS" : "MP3")}
                    </span>
                    {(station.bitrate || station.type === 'tv') && (
                      <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">
                        <Activity className="w-3 h-3 text-sky-500" />
                        {station.bitrate ? `${station.bitrate} KBPS` : "HD"}
                      </span>
                    )}
                    <span className="flex items-center gap-1" title="Stream Reliability">
                      <Wifi className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">{Math.min(100, (station.votes || 50) + 40)}%</span>
                    </span>
                  </div>

                  <div className="p-1.5 rounded-full bg-slate-50 dark:bg-slate-950 text-emerald-500 border border-slate-200/50 dark:border-slate-800 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    {isCurrent && isPlaying ? (
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    ) : (
                      <Play className="w-3.5 h-3.5 translate-x-[0.5px]" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 text-center flex flex-col justify-center items-center gap-2">
          <ShieldAlert className="w-8 h-8 text-slate-300 dark:text-slate-700" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            No {broadcastType === 'radio' ? 'radio' : 'tv'} stations found
          </p>
        </div>
      )}
    </div>
  );
}
