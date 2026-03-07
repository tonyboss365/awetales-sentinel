import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, MessageSquare, Activity, ShieldCheck, AlertTriangle, Sparkles, CheckCircle2, XCircle, MinusCircle, Users, Info } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import logo from './assets/logo.png';

const AnimatedLabel = ({ icon: Icon, label }) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05, backgroundColor: "rgba(0,0,0,0.08)" }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 border border-black/5 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-6 cursor-default"
    >
        <Icon size={12} className="text-gray-600" />
        <span className="text-gray-600">{label}</span>
    </motion.div>
);

const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
        case 'Positive': return <CheckCircle2 size={14} className="text-green-500" />;
        case 'Negative': return <XCircle size={14} className="text-red-500" />;
        default: return <MinusCircle size={14} className="text-gray-400" />;
    }
};

export default function SupervisorDashboard() {
    const navigate = useNavigate();
    const [wsStatus, setWsStatus] = useState('Disconnected');
    const [agents, setAgents] = useState({});
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [activeTab, setActiveTab] = useState('live'); // 'live', 'accounts', 'history'
    const [dbUsers, setDbUsers] = useState([]);
    const [history, setHistory] = useState([]);

    const wsRef = useRef(null);

    // Read user from localStorage
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { email: 'supervisor@demo.com' };

    useEffect(() => {
        let reconnectTimeout;
        const connectWs = () => {
            wsRef.current = new WebSocket('wss://awetales-sentinel.onrender.com/ws/supervisor');
            wsRef.current.onopen = () => setWsStatus('Connected');
            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'full_state') {
                        setAgents(data.agents);
                        if (!selectedAgentId && Object.keys(data.agents).length > 0) {
                            setSelectedAgentId(Object.keys(data.agents)[0]);
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            };
            wsRef.current.onclose = () => {
                setWsStatus('Disconnected');
                reconnectTimeout = setTimeout(connectWs, 3000);
            };
            wsRef.current.onerror = () => setWsStatus('Disconnected');
        };

        connectWs();
        return () => {
            clearTimeout(reconnectTimeout);
            if (wsRef.current) wsRef.current.close();
        };
    }, [selectedAgentId]);

    useEffect(() => {
        if (activeTab === 'accounts') {
            fetch('https://awetales-sentinel.onrender.com/users')
                .then(r => r.json())
                .then(data => setDbUsers(data))
                .catch(err => console.error("Failed to fetch users", err));
        } else if (activeTab === 'history') {
            fetch('https://awetales-sentinel.onrender.com/history')
                .then(r => r.json())
                .then(data => setHistory(data))
                .catch(err => console.error("Failed to fetch history", err));
        }
    }, [activeTab]);

    const activeAgentList = Object.values(agents);
    const selectedAgent = selectedAgentId ? agents[selectedAgentId] : null;

    return (
        <div className="min-h-screen bg-[#F8F9FA] bg-grid-pattern font-sans antialiased flex flex-col tracking-tight text-gray-900 relative">
            <nav className="sticky top-0 z-50 bg-white/60 backdrop-blur-2xl border-b border-black/5 px-8 py-4 flex justify-between items-center shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-4">
                    <img src={logo} alt="Sentinel Logo" className="w-12 h-12 object-contain" />
                    <h1 className="text-2xl font-black text-[#555555] tracking-widest uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>Sentinel</h1>
                    <span className="text-[13px] text-gray-400 font-medium ml-2 hidden sm:block">Director Overview</span>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/5 shadow-sm">
                        <div className={`w-2 h-2 rounded-full ${wsStatus === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">{wsStatus === 'Connected' ? 'Live' : 'Offline'}</span>
                    </div>
                    <Link
                        to="/details"
                        className="flex items-center gap-2 bg-white/80 text-black px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border border-black/5 shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <Info size={14} /> Details
                    </Link>
                    <button onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} className="px-4 py-1.5 text-[13px] font-semibold text-black bg-white border border-black/5 hover:bg-gray-50 rounded-full shadow-sm transition-colors">
                        Logout
                    </button>
                </div>
            </nav>

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 md:p-8 gap-4 md:gap-8 max-w-[1600px] mx-auto w-full relative z-10">
                <aside className="w-full lg:w-80 flex flex-col glass-panel rounded-[2rem] overflow-hidden bg-white/40 shadow-xl border border-black/5 shrink-0">
                    <div className="px-6 py-5 border-b border-black/5 bg-white/60 backdrop-blur-md">
                        <h2 className="font-semibold text-black text-[15px] flex items-center gap-2 mb-4"><Users size={16} /> Directory</h2>
                        <div className="flex bg-black/5 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('live')}
                                className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === 'live' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                            >
                                Live
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                            >
                                History
                            </button>
                            <button
                                onClick={() => setActiveTab('accounts')}
                                className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === 'accounts' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                            >
                                Accounts
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {activeTab === 'live' ? (
                            activeAgentList.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center mt-10">No agents online right now.</p>
                            ) : (
                                activeAgentList.map(a => (
                                    <div
                                        key={a.agent_id}
                                        onClick={() => setSelectedAgentId(a.agent_id)}
                                        className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedAgentId === a.agent_id ? 'bg-black text-white border-black shadow-lg scale-[1.02]' : 'bg-white hover:bg-gray-50 border-black/10 shadow-sm text-black'} ${a.analytics.escalation_risk === 'high' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''}`}
                                    >
                                        <div className="font-bold text-sm mb-1 truncate">Agent {a.agent_id}</div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className={selectedAgentId === a.agent_id ? 'text-gray-300' : 'text-gray-500'}>Status:</span>
                                            <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-widest text-[9px] ${a.analytics.escalation_risk === 'high' ? 'bg-red-500 text-white' :
                                                a.analytics.escalation_risk === 'medium' ? 'bg-orange-500 text-white' :
                                                    'bg-green-500 text-white'
                                                }`}>{a.analytics.escalation_risk} Risk</span>
                                        </div>
                                    </div>
                                ))
                            )
                        ) : activeTab === 'accounts' ? (
                            <div className="space-y-2">
                                {dbUsers.map(u => (
                                    <div key={u.id} className="p-3 bg-white border border-black/10 rounded-xl shadow-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-sm text-black truncate pr-2">{u.email}</span>
                                            <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-widest text-[9px] ${u.role === 'supervisor' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                                {u.role}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono">ID: {u.id}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center mt-10">No history available.</p>
                                ) : (
                                    history.map((h, idx) => (
                                        <div key={idx} className="p-4 bg-white border border-black/10 hover:border-black/30 transition-colors rounded-xl shadow-sm cursor-pointer" onClick={() => {
                                            const histAgent = {
                                                agent_id: `${h.agent_id} (Archived)`,
                                                transcript: h.transcript,
                                                analytics: {
                                                    intent: h.intent,
                                                    topic: h.topic,
                                                    sentiment: h.sentiment,
                                                    escalation_risk: h.escalation_risk,
                                                    confidence: 0.99
                                                }
                                            };
                                            setAgents(prev => ({ ...prev, [histAgent.agent_id]: histAgent }));
                                            setSelectedAgentId(histAgent.agent_id);
                                        }}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-sm truncate text-black">Agent {h.agent_id}</div>
                                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-widest text-[9px] ${h.escalation_risk === 'high' ? 'bg-red-500 text-white' :
                                                    h.escalation_risk === 'medium' ? 'bg-orange-500 text-white' :
                                                        'bg-green-500 text-white'
                                                    }`}>{h.escalation_risk} Risk</span>
                                            </div>
                                            <div className="text-[11px] text-gray-500 mb-2 truncate">Topic: {h.topic}</div>
                                            <div className="text-[9px] text-gray-400 font-mono uppercase truncate">{new Date(h.timestamp).toLocaleString()}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </aside>

                <section className={`flex-1 flex flex-col glass-panel rounded-[2rem] overflow-hidden transition-all duration-500 bg-white/40 border border-black/5 shadow-2xl ${selectedAgent && selectedAgent.analytics.escalation_risk === 'high' ? 'ring-2 ring-red-500/50 shadow-[0_8px_30px_rgba(239,68,68,0.15)]' : ''
                    }`}>
                    {selectedAgent ? (
                        <>
                            <div className="px-8 py-5 border-b border-black/5 bg-white/60 backdrop-blur-md flex justify-between items-center z-10">
                                <h2 className="font-semibold text-black text-[15px]">Intelligence Dashboard: Agent {selectedAgent.agent_id}</h2>
                                <motion.div
                                    animate={{ boxShadow: ["0 0 0 0 rgba(0,0,0,0.1)", "0 0 0 4px rgba(0,0,0,0)", "0 0 0 0 rgba(0,0,0,0)"] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-full border border-black/5 shadow-sm"
                                >
                                    <Sparkles size={12} className="text-black" />
                                    <span className="text-[10px] font-bold text-black uppercase tracking-widest">Sent Engine Active</span>
                                </motion.div>
                            </div>

                            <div className="flex-1 flex p-6 gap-6 overflow-hidden">
                                <div className="flex-1 flex flex-col bg-white/50 rounded-2xl border border-black/5 overflow-hidden shadow-sm">
                                    <div className="p-4 border-b border-black/5 bg-gray-50">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Transcript</span>
                                    </div>
                                    <div className="flex-1 p-4 overflow-y-auto font-mono text-sm leading-relaxed text-gray-800 break-words whitespace-pre-wrap">
                                        {selectedAgent.transcript || <span className="text-gray-400 italic">Connected. Waiting for inputs...</span>}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 pb-20">
                                    <AnimatePresence>
                                        {selectedAgent.analytics.escalation_risk === 'high' && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, height: 0 }}
                                                animate={{ opacity: 1, scale: 1, height: 'auto' }}
                                                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                                                className="bg-[#0A0A0A] text-white rounded-[1.5rem] p-5 mb-6 shadow-xl flex items-center gap-4 border border-red-500/30 relative overflow-hidden"
                                            >
                                                <motion.div
                                                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    className="absolute inset-0 bg-red-500/10 pointer-events-none"
                                                />
                                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 relative z-10 shrink-0">
                                                    <AlertTriangle className="text-red-500" size={20} />
                                                </div>
                                                <div className="relative z-10">
                                                    <h3 className="font-semibold text-[15px]">Supervisor Intervention Required!</h3>
                                                    <p className="text-[13px] text-gray-400 mt-0.5">High escalation risk detected in this active session.</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="grid grid-cols-2 gap-4">
                                        <motion.div className="p-5 glass-card bg-white rounded-2xl border border-black/5 shadow-sm col-span-2 sm:col-span-1">
                                            <AnimatedLabel icon={Target} label="Detected Intent" />
                                            <p className="font-semibold text-black text-xl capitalize leading-tight tracking-tight mt-1 truncate" title={selectedAgent.analytics.intent}>
                                                {selectedAgent.analytics.intent}
                                            </p>
                                        </motion.div>

                                        <motion.div className="p-5 glass-card bg-white rounded-2xl border border-black/5 shadow-sm col-span-2 sm:col-span-1">
                                            <AnimatedLabel icon={MessageSquare} label="Topic" />
                                            <p className="font-semibold text-black text-xl capitalize leading-tight tracking-tight mt-1 truncate" title={selectedAgent.analytics.topic}>
                                                {selectedAgent.analytics.topic}
                                            </p>
                                        </motion.div>

                                        <motion.div className="p-5 glass-card bg-white rounded-2xl border border-black/5 shadow-sm col-span-2">
                                            <AnimatedLabel icon={Activity} label="Customer Sentiment" />
                                            <div className="flex bg-black/5 p-1 rounded-xl w-full border border-black/5 relative mt-2">
                                                {['Positive', 'Neutral', 'Negative'].map(s => {
                                                    const isActive = selectedAgent.analytics.sentiment === s;
                                                    return (
                                                        <div key={s} className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-colors duration-300 z-10 ${isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                                                            }`}>
                                                            {isActive && <motion.div layoutId="sentiment-bg" className="absolute inset-0 bg-white rounded-lg shadow-sm border border-black/5 -z-10" />}
                                                            {isActive && getSentimentIcon(s)}
                                                            {s}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>

                                        <motion.div className="p-5 glass-card bg-white rounded-2xl border border-black/5 shadow-sm col-span-2">
                                            <div className="flex justify-between items-start relative z-10">
                                                <AnimatedLabel icon={ShieldCheck} label="Escalation Risk" />
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-sm ${selectedAgent.analytics.escalation_risk === 'high' ? 'bg-red-500 text-white' :
                                                    selectedAgent.analytics.escalation_risk === 'medium' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                                                    }`}>
                                                    {selectedAgent.analytics.escalation_risk}
                                                </span>
                                            </div>
                                            <div className="mt-4 relative z-10">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Model Confidence</span>
                                                    <span className="text-[12px] font-bold text-black">{Math.round(selectedAgent.analytics.confidence * 100)}%</span>
                                                </div>
                                                <div className="flex gap-1 h-2 w-full">
                                                    {[...Array(10)].map((_, i) => (
                                                        <div key={i} className="flex-1 rounded-full overflow-hidden bg-black/5">
                                                            <div className={`h-full rounded-full transition-all ${selectedAgent.analytics.confidence * 10 > i ? 'bg-black' : 'bg-transparent'}`} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <ShieldCheck size={48} className="mb-4 opacity-20" />
                            <p className="font-medium">Select an active agent from the sidebar to view live analytics.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
