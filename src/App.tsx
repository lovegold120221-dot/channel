import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Info, ShieldAlert, Radio, Sparkles, Share2, Check, Mic, MicOff, Languages, Volume2, RefreshCw, ScrollText, Copy, Trash2, Download, CheckCheck, Sun, Moon } from "lucide-react";

import WorldMap from "./components/WorldMap";
import StationList from "./components/StationList";
import AudioPlayer from "./components/AudioPlayer";
import FrequencyVisualizer from "./components/FrequencyVisualizer";
import { BroadcastStation, LocationGeoProfile } from "./types";
import { LiveTranslateClient, LiveTranslateState } from "./services/liveTranslateClient";

const LANGUAGE_CODE_MAP: Record<string, string> = {
  "Afrikaans": "af",
  "Albanian": "sq",
  "Amharic": "am",
  "Arabic": "ar",
  "Armenian": "hy",
  "Assamese": "as",
  "Aymara": "ay",
  "Azerbaijani": "az",
  "Bambara": "bm",
  "Basque": "eu",
  "Belarusian": "be",
  "Bengali": "bn",
  "Bhojpuri": "bho",
  "Bosnian": "bs",
  "Bulgarian": "bg",
  "Catalan": "ca",
  "Cebuano": "ceb",
  "Chichewa": "ny",
  "Chinese (Simplified)": "zh-CN",
  "Chinese (Traditional)": "zh-TW",
  "Corsican": "co",
  "Croatian": "hr",
  "Czech": "cs",
  "Danish": "da",
  "Dhivehi": "dv",
  "Dogri": "doi",
  "Dutch": "nl",
  "English": "en",
  "Esperanto": "eo",
  "Estonian": "et",
  "Ewe": "ee",
  "Filipino": "tl",
  "Finnish": "fi",
  "French": "fr",
  "Frisian": "fy",
  "Galician": "gl",
  "Georgian": "ka",
  "German": "de",
  "Greek": "el",
  "Guarani": "gn",
  "Gujarati": "gu",
  "Haitian Creole": "ht",
  "Hausa": "ha",
  "Hawaiian": "haw",
  "Hebrew": "he",
  "Hindi": "hi",
  "Hmong": "hmn",
  "Hungarian": "hu",
  "Icelandic": "is",
  "Igbo": "ig",
  "Ilocano": "ilo",
  "Indonesian": "id",
  "Irish": "ga",
  "Italian": "it",
  "Japanese": "ja",
  "Javanese": "jw",
  "Kannada": "kn",
  "Kazakh": "kk",
  "Khmer": "km",
  "Kinyarwanda": "rw",
  "Konkani": "gom",
  "Korean": "ko",
  "Krio": "kri",
  "Kurdish (Kurmanji)": "ku",
  "Kurdish (Sorani)": "ckb",
  "Kyrgyz": "ky",
  "Lao": "lo",
  "Latin": "la",
  "Latvian": "lv",
  "Lingala": "ln",
  "Lithuanian": "lt",
  "Luganda": "lg",
  "Luxembourgish": "lb",
  "Macedonian": "mk",
  "Maithili": "mai",
  "Malagasy": "mg",
  "Malay": "ms",
  "Malayalam": "ml",
  "Maltese": "mt",
  "Maori": "mi",
  "Marathi": "mr",
  "Meiteilon (Manipuri)": "mni-Mtei",
  "Mizo": "lus",
  "Mongolian": "mn",
  "Myanmar (Burmese)": "my",
  "Nepali": "ne",
  "Norwegian": "no",
  "Odia (Oriya)": "or",
  "Oromo": "om",
  "Pashto": "ps",
  "Persian": "fa",
  "Polish": "pl",
  "Portuguese": "pt",
  "Punjabi": "pa",
  "Quechua": "qu",
  "Romanian": "ro",
  "Russian": "ru",
  "Samoan": "sm",
  "Sanskrit": "sa",
  "Scots Gaelic": "gd",
  "Sepedi": "nso",
  "Serbian": "sr",
  "Sesotho": "st",
  "Shona": "sn",
  "Sindhi": "sd",
  "Sinhala": "si",
  "Slovak": "sk",
  "Slovenian": "sl",
  "Somali": "so",
  "Spanish": "es",
  "Sundanese": "su",
  "Swahili": "sw",
  "Swedish": "sv",
  "Tajik": "tg",
  "Tamil": "ta",
  "Tatar": "tt",
  "Telugu": "te",
  "Thai": "th",
  "Tigrinya": "ti",
  "Tsonga": "ts",
  "Turkish": "tr",
  "Turkmen": "tk",
  "Twi": "ak",
  "Ukrainian": "uk",
  "Urdu": "ur",
  "Uyghur": "ug",
  "Uzbek": "uz",
  "Vietnamese": "vi",
  "Welsh": "cy",
  "Xhosa": "xh",
  "Yiddish": "yi",
  "Yoruba": "yo",
  "Zulu": "zu"
};

const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_CODE_MAP).sort();

function getClientLanguageCode(lang: string | undefined): string {
  if (!lang) return "";
  const l = lang.toLowerCase().trim();
  
  // 1. Direct or partial keys matching
  for (const [name, code] of Object.entries(LANGUAGE_CODE_MAP)) {
    const nameLower = name.toLowerCase();
    if (l === nameLower || l.includes(nameLower) || nameLower.includes(l)) {
      return code;
    }
  }
  
  // 2. Direct code match (e.g. "es", "sv", "pt")
  const codes = Object.values(LANGUAGE_CODE_MAP);
  if (codes.includes(l)) {
    return l;
  }
  
  // 3. Custom hand-coded popular patterns / ISO-639 codes
  if (l.includes("ara") || l === "ar") return "ar";
  if (l.includes("ben") || l === "bn") return "bn";
  if (l.includes("bul") || l === "bg") return "bg";
  if (l.includes("chi") || l.includes("zho") || l === "zh") return "zh-CN";
  if (l.includes("hrv") || l === "hr") return "hr";
  if (l.includes("cze") || l.includes("ces") || l === "cs") return "cs";
  if (l.includes("dan") || l === "da") return "da";
  if (l.includes("dut") || l.includes("nld") || l === "nl") return "nl";
  if (l.includes("eng") || l === "en") return "en";
  if (l.includes("est") || l === "et") return "et";
  if (l.includes("fin") || l === "fi") return "fi";
  if (l.includes("fre") || l.includes("fra") || l === "fr") return "fr";
  if (l.includes("ger") || l.includes("deu") || l === "de") return "de";
  if (l.includes("gre") || l.includes("ell") || l === "el") return "el";
  if (l.includes("guj") || l === "gu") return "gu";
  if (l.includes("heb") || l === "he") return "he";
  if (l.includes("hin") || l === "hi") return "hi";
  if (l.includes("hun") || l === "hu") return "hu";
  if (l.includes("ind") || l === "id") return "id";
  if (l.includes("ita") || l === "it") return "it";
  if (l.includes("jpn") || l === "ja") return "ja";
  if (l.includes("kan") || l === "kn") return "kn";
  if (l.includes("kor") || l === "ko") return "ko";
  if (l.includes("lav") || l === "lv") return "lv";
  if (l.includes("lit") || l === "lt") return "lt";
  if (l.includes("mal") || l === "ml") return "ml";
  if (l.includes("mar") || l === "mr") return "mr";
  if (l.includes("nor") || l === "no") return "no";
  if (l.includes("fas") || l.includes("per") || l === "fa") return "fa";
  if (l.includes("pol") || l === "pl") return "pl";
  if (l.includes("por") || l === "pt") return "pt";
  if (l.includes("ron") || l.includes("rum") || l === "ro") return "ro";
  if (l.includes("rus") || l === "ru") return "ru";
  if (l.includes("srp") || l === "sr") return "sr";
  if (l.includes("slk") || l.includes("slo") || l === "sk") {
    if (l.includes("slovenian") || l === "sl") return "sl";
    return "sk";
  }
  if (l.includes("slv") || l === "sl") return "sl";
  if (l.includes("spa") || l === "es") return "es";
  if (l.includes("swa") || l === "sw") return "sw";
  if (l.includes("swe") || l === "sv") return "sv";
  if (l.includes("tam") || l === "ta") return "ta";
  if (l.includes("tel") || l === "te") return "te";
  if (l.includes("tha") || l === "th") return "th";
  if (l.includes("tur") || l === "tr") return "tr";
  if (l.includes("ukr") || l === "uk") return "uk";
  if (l.includes("urd") || l === "ur") return "ur";
  if (l.includes("vie") || l === "vi") return "vi";
  
  return l;
}

function isSameLanguage(langA: string | undefined, langB: string | undefined): boolean {
  if (!langA || !langB) return false;
  const codeA = getClientLanguageCode(langA);
  const codeB = getClientLanguageCode(langB);
  if (codeA && codeB && codeA === codeB) return true;

  const a = langA.toLowerCase().trim();
  const b = langB.toLowerCase().trim();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const len = Math.min(a.length, b.length, 3);
  if (len >= 3 && a.slice(0, len) === b.slice(0, len)) return true;
  return false;
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("world_radio_dark_mode") === "true";
  });

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem("world_radio_dark_mode", String(nextMode));
  };

  const [selectedProfile, setSelectedProfile] = useState<LocationGeoProfile | null>(null);
  const [activeStation, setActiveStation] = useState<BroadcastStation | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(500);
  const [copied, setCopied] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Real-time Voice to Voice Eburon Live Translate Setup
  const [liveClient] = useState(() => new LiveTranslateClient());
  const [liveState, setLiveState] = useState<LiveTranslateState>({
    status: "idle",
    error: null,
    userTranscript: "",
    modelTranscript: "",
    turns: [],
  });
  const [liveTargetLang, setLiveTargetLang] = useState<string>("English");
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Auto-load transcript history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("world_radio_transcript_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const turns = parsed.map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp)
          }));
          liveClient.setHistory(turns);
          setLiveState(liveClient.getLiveState());
        }
      } catch (e) {
        console.warn("[Auto-Save] Failed to restore transcript from localStorage:", e);
      }
    }
  }, [liveClient]);

  // Periodic Auto-save to localStorage when turns change
  useEffect(() => {
    if (liveState.turns.length > 0) {
      localStorage.setItem("world_radio_transcript_v2", JSON.stringify(liveState.turns));
    } else {
      localStorage.removeItem("world_radio_transcript_v2");
    }
  }, [liveState.turns]);

  // Auto-set location based on browser geolocation
  useEffect(() => {
    if (navigator.geolocation && !selectedCoords) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedCoords({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.warn("[Geolocation] Permission denied or failed:", error.message);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 3600000 }
      );
    }
  }, []);

  const [contextAwareEnabled, setContextAwareEnabled] = useState<boolean>(false);
  const [programGenre, setProgramGenre] = useState<string>("News");
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

  const toggleLiveTranslation = async () => {
    const currentStatus = liveClient.getLiveState().status;
    if (currentStatus === "connected" || currentStatus === "connecting") {
      liveClient.disconnect();
      setLiveState(liveClient.getLiveState());
    } else {
      await liveClient.connect(liveTargetLang, (updatedState) => {
        setLiveState({ ...updatedState });
      }, activeStation?.language, contextAwareEnabled ? programGenre : undefined);
    }
  };

  const handleCopyTranscript = () => {
    if (liveState.turns.length === 0 && !liveState.userTranscript && !liveState.modelTranscript) return;
    
    let text = "=== World Radio Translator Transcript ===\n";
    text += `Target Language Selected: ${liveTargetLang}\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n\n`;
    
    liveState.turns.forEach((turn, idx) => {
      const timeStr = new Date(turn.timestamp).toLocaleTimeString();
      text += `[Turn ${idx + 1} - ${timeStr}]\n`;
      text += `Captured Audio (Original): ${turn.originalText}\n`;
      text += `Interpreter (${liveTargetLang}): ${turn.translatedText}\n\n`;
    });

    if (liveState.userTranscript) {
      text += `[*Live Decoding*] Captured Audio (Original):\n${liveState.userTranscript}\n\n`;
    }
    if (liveState.modelTranscript) {
      text += `[*Live Decoding*] Interpreter (${liveTargetLang}):\n${liveState.modelTranscript}\n\n`;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    });
  };

  const handleDownloadTranscript = () => {
    if (liveState.turns.length === 0 && !liveState.userTranscript && !liveState.modelTranscript) return;

    let text = "=== World Radio Translator Transcript ===\n";
    text += `Target Language Selected: ${liveTargetLang}\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n\n`;

    liveState.turns.forEach((turn, idx) => {
      const timeStr = new Date(turn.timestamp).toLocaleTimeString();
      text += `[Turn ${idx + 1} - ${timeStr}]\n`;
      text += `Captured Audio (Original): ${turn.originalText}\n`;
      text += `Interpreter (${liveTargetLang}): ${turn.translatedText}\n\n`;
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `world_radio_translation_transcript_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearSessionTranscript = () => {
    liveClient.clearHistory();
    setLiveState(liveClient.getLiveState());
  };

  // Auto-scroll transcript container internally (NOT the window!)
  useEffect(() => {
    if (transcriptContainerRef.current) {
      const container = transcriptContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [liveState.turns, liveState.userTranscript, liveState.modelTranscript]);

  useEffect(() => {
    return () => {
      liveClient.disconnect();
    };
  }, [liveClient]);

  // Synchronize translation session with radio playing state:
  // When radio stops/pauses, the live translation should stop immediately.
  useEffect(() => {
    if (!isPlaying) {
      const currentStatus = liveClient.getLiveState().status;
      if (currentStatus === "connected" || currentStatus === "connecting") {
        liveClient.disconnect();
        setLiveState(liveClient.getLiveState());
      }
    }
  }, [isPlaying, liveClient]);

  // Sync theme-class with html/body elements for perfect Tailwind context propagation
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("world_radio_dark_mode", String(darkMode));
  }, [darkMode]);

  // Parse URL query coordinates on startup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLat = params.get("lat");
    const urlLng = params.get("lng");
    const urlRadius = params.get("radius");

    let initialLat = 46.2276; // Alpine region coordinates as default
    let initialLng = 2.2137;
    let initialRadius = 500;

    if (urlLat && urlLng) {
      initialLat = parseFloat(urlLat);
      initialLng = parseFloat(urlLng);
      if (urlRadius) initialRadius = parseInt(urlRadius, 10);
    } else {
      const savedRegion = localStorage.getItem("world_radio_last_region");
      if (savedRegion) {
        try {
          const parsed = JSON.parse(savedRegion);
          if (parsed.lat && parsed.lng) {
            initialLat = parsed.lat;
            initialLng = parsed.lng;
            if (parsed.radiusKm) initialRadius = parsed.radiusKm;
          }
        } catch (e) {}
      }
    }

    setSelectedCoords({ lat: initialLat, lng: initialLng });
    setRadiusKm(initialRadius);

    setProfileLoading(true);
    fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: initialLat,
        lng: initialLng,
        radiusKm: initialRadius,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSelectedProfile(data);
        setProfileLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load initial vicinity profile:", err);
        setProfileLoading(false);
      });
  }, []);

  const updateProfile = async (lat: number, lng: number, radius: number) => {
    setProfileLoading(true);
    localStorage.setItem("world_radio_last_region", JSON.stringify({ lat, lng, radiusKm: radius }));
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          radiusKm: radius,
        }),
      });

      const data: LocationGeoProfile = await response.json();
      setSelectedProfile(data);
    } catch (err) {
      console.error("Geocoding query failed:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleMapLocationClick = (coords: { lat: number; lng: number }) => {
    setSelectedCoords(coords);
    updateProfile(coords.lat, coords.lng, radiusKm);
  };

  const handleRadiusChangeEnd = () => {
    if (selectedCoords) {
      updateProfile(selectedCoords.lat, selectedCoords.lng, radiusKm);
    }
  };

  const handleShareVicinity = () => {
    if (!selectedCoords) return;
    const url = `${window.location.origin}/?lat=${selectedCoords.lat.toFixed(4)}&lng=${selectedCoords.lng.toFixed(4)}&radius=${radiusKm}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSelectStation = (station: BroadcastStation) => {
    const wasTranslating = liveState.status === "connected" || liveState.status === "connecting";
    if (wasTranslating) {
      liveClient.disconnect();
      liveClient.clearHistory();
      setLiveState(liveClient.getLiveState());
    }

    setActiveStation(station);
    setIsPlaying(true);

    if (wasTranslating) {
      // Cleanly restart the translation stream for the new selected station
      setTimeout(() => {
        liveClient.connect(liveTargetLang, (updatedState) => {
          setLiveState({ ...updatedState });
        }, station.language, contextAwareEnabled ? programGenre : undefined);
      }, 600);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans relative ${
      darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      
      {/* Absolute Unobtrusive Floating Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className="fixed bottom-24 right-4 md:right-6 z-50 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all shadow-md active:scale-95 cursor-pointer select-none flex items-center justify-center overflow-hidden"
        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={darkMode ? "sun" : "moon"}
            initial={{ y: 20, rotate: 90, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -20, rotate: -90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.div>
        </AnimatePresence>
      </button>


      {/* Main Content Workspace Layout */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        
        {/* Left Section: Map pane & Channel Bento Selector */}
        <div className="flex-1 p-4 md:p-5 flex flex-col gap-4 lg:gap-5 w-full max-w-7xl mx-auto">
          
          {/* Eburon Live Voice-to-Voice Translation Dashboard */}
          <section className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-950/10 dark:to-teal-950/10 border border-emerald-500/25 dark:border-emerald-500/10 rounded-2xl p-4 md:p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/10 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                  liveState.status === "connected" 
                    ? "bg-emerald-500 text-white animate-pulse shadow-lg shadow-emerald-500/30" 
                    : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                }`}>
                  <Radio className={`w-5 h-5 ${liveState.status === "connected" ? "animate-pulse" : ""}`} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>Eburon Live</span>
                    <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase">
                      Stream API
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                    Real-time radio stream translation
                  </p>
                </div>
              </div>

               {/* Connection + Language Selector */}
              <div className="flex items-center gap-2">
                <div 
                  className="flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800/60"
                  title="Select target language for real-time translation"
                >
                  <Languages className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={liveTargetLang}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setLiveTargetLang(newLang);
                      const currentStatus = liveClient.getLiveState().status;
                      const isStreamActive = currentStatus === "connected" || currentStatus === "connecting";
                      if (isStreamActive) {
                        liveClient.disconnect();
                        liveClient.clearHistory();
                        liveClient.connect(newLang, (updatedState) => {
                          setLiveState({ ...updatedState });
                        }, activeStation?.language, contextAwareEnabled ? programGenre : undefined);
                      }
                    }}
                    disabled={false}
                    className="bg-transparent border-none text-xs font-semibold text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer pr-1 max-w-[130px] sm:max-w-[none]"
                    title="Select translation target language"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={toggleLiveTranslation}
                  disabled={false}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm ${
                    liveState.status === "connected"
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                      : liveState.status === "connecting"
                      ? "bg-amber-500 text-white animate-pulse"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                  }`}
                  title={
                    liveState.status === "connected"
                      ? "Disconnect from Eburon Live translation session"
                      : liveState.status === "connecting"
                      ? "Connecting to Live stream WebSocket..."
                      : "Establish real-time voice interpretation and transcription session"
                  }
                >
                  <span>
                    {liveState.status === "connected"
                      ? "Stop Translation"
                      : liveState.status === "connecting"
                      ? "Connecting..."
                      : "Start Live Translation"}
                  </span>
                </button>
              </div>
            </div>

            {/* Context-Aware Settings and Playback Speed */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-2 -mt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={contextAwareEnabled}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setContextAwareEnabled(isChecked);
                    if (liveState.status === "connected" || liveState.status === "connecting") {
                        liveClient.disconnect();
                        liveClient.clearHistory();
                        liveClient.connect(liveTargetLang, (updatedState) => {
                          setLiveState({ ...updatedState });
                        }, activeStation?.language, isChecked ? programGenre : undefined);
                    }
                  }}
                  className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 bg-white dark:bg-slate-900 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Context-Aware Translation
                </span>
              </label>
              
              {contextAwareEnabled && (
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 transition-all duration-300">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Genre</span>
                  <select
                    value={programGenre}
                    onChange={(e) => {
                      const newGenre = e.target.value;
                      setProgramGenre(newGenre);
                      if (liveState.status === "connected" || liveState.status === "connecting") {
                          liveClient.disconnect();
                          liveClient.clearHistory();
                          liveClient.connect(liveTargetLang, (updatedState) => {
                            setLiveState({ ...updatedState });
                          }, activeStation?.language, newGenre);
                      }
                    }}
                    className="bg-transparent border-none text-xs font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none cursor-pointer"
                  >
                    <option value="News">News</option>
                    <option value="Music">Music</option>
                    <option value="Sports">Sports</option>
                    <option value="Talk Show">Talk Show</option>
                    <option value="Drama">Drama</option>
                  </select>
                </div>
              )}

              {/* Playback Speed Slider */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 ml-auto sm:ml-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Speed</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={playbackRate}
                    onChange={(e) => {
                      const newRate = parseFloat(e.target.value);
                      setPlaybackRate(newRate);
                      liveClient.setPlaybackRate(newRate);
                    }}
                    className="w-24 h-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 min-w-[2.5rem] text-right">
                    {playbackRate.toFixed(1)}x
                  </span>
                </div>
              </div>
            </div>

            {/* Connection Status Notice / Error message */}
            {liveState.error && (
              <div className="flex items-center gap-2 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs px-3.5 py-2.5 rounded-xl border border-rose-500/20">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{liveState.error}</span>
              </div>
            )}

            {liveState.status === "connecting" && (
              <div className="flex items-center gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs px-3.5 py-2.5 rounded-xl border border-amber-500/20">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                <span>Setting up WebSocket connection with Eburon Live API...</span>
              </div>
            )}

            {liveState.status === "connected" && (
              <div className="flex flex-col gap-2 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs px-3.5 py-2.5 rounded-xl border border-emerald-500/25">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 mb-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-medium">Active Broadcast Interpretation session to {liveTargetLang} ready.</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="h-4 w-[2px] bg-emerald-500/30 rounded-full animate-pulse" style={{ animationDelay: "0.1s" }} />
                    <span className="h-6 w-[2px] bg-emerald-500/40 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="h-3 w-[2px] bg-emerald-500/20 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                    <span className="h-5 w-[2px] bg-emerald-500/50 rounded-full animate-pulse" style={{ animationDelay: "0s" }} />
                    <span className="h-4 w-[2px] bg-emerald-500/30 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>

              </div>
            )}

            {/* Real-time Broadcast Transcription Feed Panel */}
            {(liveState.status === "connected" || liveState.status === "error" || liveState.status === "connecting" || liveState.turns.length > 0 || liveState.userTranscript || liveState.modelTranscript) && (
              <div className="border border-slate-200/60 dark:border-slate-800/60 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 p-4 shadow-sm flex flex-col gap-3.5">
                
                {/* Real-time Frequency Analyzer Visualization */}
                <AnimatePresence>
                  {isPlaying && analyserNode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-1"
                    >
                      <FrequencyVisualizer 
                        analyser={analyserNode} 
                        darkMode={darkMode} 
                        className="bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-slate-800/40 pb-3">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-emerald-500" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                        Live Broadcast Transcription Feed
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-300 font-sans">
                        Continuous log of captured and translated broadcast audio
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={handleCopyTranscript}
                      title="Copy full transcript"
                      className="p-1 px-2.5 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-850 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1 cursor-pointer shadow-2sm"
                    >
                      {copiedTranscript ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-emerald-500 animate-scale" />
                          <span className="text-emerald-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadTranscript}
                      title="Download as TXT"
                      className="p-1 px-2.5 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-850 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1 cursor-pointer shadow-2sm"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={clearSessionTranscript}
                      title="Clear session history"
                      className="p-1 px-2.5 rounded-lg text-[11px] font-medium bg-white dark:bg-rose-950/20 shadow-2sm border border-slate-200/80 dark:border-rose-900/30 text-slate-500 dark:text-rose-400 hover:text-rose-600 hover:border-rose-200 dark:hover:text-rose-300 dark:hover:border-rose-900/65 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                {/* Subtitle list scroll container */}
                <div 
                  ref={transcriptContainerRef}
                  className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar scroll-smooth"
                >
                  {/* Grid Column Headers (Visible list is not empty) */}
                  {liveState.turns.length > 0 && (
                    <div className="hidden md:grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-2 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-300 tracking-wider">
                      <div>CAPTURED ORIGINAL AUDIO</div>
                      <div>EBURON SIMULTANEOUS INTERPRETATION</div>
                    </div>
                  )}

                  {/* Historical entries */}
                  {liveState.turns.map((turn, idx) => (
                    <div 
                      key={idx} 
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-slate-100/40 dark:border-slate-800/10 text-xs items-stretch"
                    >
                      {/* Left Side: Original Native Language */}
                      <div className="p-3 rounded-xl border border-slate-200/50 dark:border-slate-850 bg-slate-100/30 dark:bg-slate-900/10 flex flex-col gap-1.5 justify-between">
                        <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-sans text-sm font-medium">
                          {turn.originalText}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-300 font-mono border-t border-slate-100/50 dark:border-slate-800/20 pt-1.5 mt-0.5">
                          <span className="font-bold tracking-wider uppercase">NATIVE STREAM</span>
                          <span>
                            {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Right Side: Translation */}
                      <div className="p-3 rounded-xl border border-emerald-500/12 dark:border-emerald-500/10 bg-emerald-500/[0.015] dark:bg-emerald-500/[0.01] flex flex-col gap-1.5 justify-between">
                        <p className="text-emerald-900 dark:text-emerald-300 leading-relaxed font-sans text-sm font-semibold">
                          {turn.translatedText}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-emerald-600 dark:text-emerald-400/90 font-mono border-t border-emerald-500/5 dark:border-emerald-500/5 pt-1.5 mt-0.5">
                          <span className="font-bold tracking-wider uppercase">Interpreted ({liveTargetLang})</span>
                          <span className="text-slate-400 dark:text-slate-300 font-normal">
                            {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Incoming Live Decoding Stream (User & Model Side by Side) */}
                  {(liveState.userTranscript || liveState.modelTranscript) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs items-stretch">
                      {/* Left: Original decoding live stream */}
                      <div className="p-3 rounded-xl border border-dashed border-slate-300/85 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-900/5 flex flex-col gap-2 justify-between">
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-sans text-sm italic">
                          {liveState.userTranscript ? `"${liveState.userTranscript}"` : "Listening for active speech segments..."}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-300 font-mono border-t border-dashed border-slate-200/50 dark:border-slate-800/20 pt-1.5">
                          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            DETECTOR
                          </span>
                          {liveState.userTranscript && (
                            <span className="text-amber-500 font-bold tracking-widest animate-pulse">DECODING...</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Model translating live stream */}
                      <div className="p-3 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/[0.015] dark:bg-emerald-500/[0.005] flex flex-col gap-2 justify-between">
                        <p className="text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed font-sans text-sm italic">
                          {liveState.modelTranscript ? `"${liveState.modelTranscript}"` : `Translating live to ${liveTargetLang}...`}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-emerald-500 font-mono border-t border-dashed border-emerald-500/10 pt-1.5">
                          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            INTELLIGENCE
                          </span>
                          {liveState.modelTranscript && (
                            <span className="text-emerald-500 font-bold tracking-wide animate-pulse uppercase">TRANSLATING...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state when session is active but waiting for first speech */}
                  {liveState.turns.length === 0 && !liveState.userTranscript && !liveState.modelTranscript && (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-300">
                      <ScrollText className="w-9 h-9 opacity-40 mb-2 animate-pulse" style={{ animationDuration: '3s' }} />
                      <p className="text-xs font-semibold uppercase tracking-wider font-mono">Listening to active broadcast frequencies...</p>
                      <p className="text-[10px] opacity-75 mt-1 max-w-md">Captured audio captions & simultaneous translations will flow into this dual-channel side-by-side display panel in real-time.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* World Map Container (Fitted size) */}
          <section className="w-full">
            <WorldMap
              darkMode={darkMode}
              onMapClick={handleMapLocationClick}
              selectedProfile={selectedProfile}
              loading={profileLoading}
              selectedCoords={selectedCoords}
              radiusKm={radiusKm}
              setRadiusKm={setRadiusKm}
              onRadiusChangeEnd={handleRadiusChangeEnd}
            />
          </section>

          {/* Radios catalog lists panel */}
          <section className="flex-1">
            <StationList
              currentCountryProfile={selectedProfile}
              onSelectStation={handleSelectStation}
              activeStation={activeStation}
              isPlaying={isPlaying}
              isProfileLoading={profileLoading}
            />
          </section>

        </div>



      </main>

      {/* Floating Sticky global audio streamer controls */}
      <footer className="sticky bottom-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-2xl">
        <AudioPlayer
          station={activeStation}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          onAnalyserNode={setAnalyserNode}
          isTranslating={liveState.status === "connected"}
          onShare={handleShareVicinity}
          isCopied={copied}
        />
      </footer>



    </div>
  );
}
