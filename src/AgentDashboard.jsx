

const SentinelLogo = ({ className = "" }) => (
    <svg className={className} viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <mask id="gap-mask">
                <rect width="100" height="120" fill="white" />
                <path d="M 50 50 L 45 45 L 50 45 Z" fill="black" />
            </mask>
            <mask id="pupil-mask">
                <rect width="100" height="120" fill="white" />
            </mask>
        </defs>
        <g mask="url(#gap-mask)">
            <circle cx="50" cy="35" r="22" stroke="currentColor" strokeWidth="6" />
            <circle cx="50" cy="65" r="22" stroke="currentColor" strokeWidth="6" />
        </g>
        <circle cx="50" cy="50" r="4.5" fill="currentColor" mask="url(#pupil-mask)" />
        <circle cx="50" cy="74" r="3.5" fill="currentColor" />
        <path d="M 47.5 76 L 45 85 L 55 85 L 52.5 76 Z" fill="currentColor" />
    </svg>
);


export default function AgentDashboard() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [inputMode, setInputMode] = useState('type'); // changed default to type
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');

    const [wsStatus, setWsStatus] = useState('Disconnected');
    const sendAsRole = 'Customer'; // Hardcoded to always simulate customer

    const wsRef = useRef(null);
    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);
    const chatScrollRef = useRef(null);
    const [isAgentTyping, setIsAgentTyping] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);

    const { scrollYProgress: chatScroll } = useScroll({ container: chatScrollRef });
    const leftOrbY = useTransform(chatScroll, [0, 1], [0, -300]);

    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { id: 'demo123', email: 'agent@demo.com' };

    const fetchHistory = async () => {
        try {
            const res = await fetch("https://awetales-sentinel.onrender.com/history");
            const data = await res.json();
            setHistoryData(data.filter(h => h.agent_id === user?.id));
            setShowHistory(true);
        } catch (err) {
            console.error("Failed to fetch history:", err);
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        if (wsRef.current) wsRef.current.close();
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    // WebSocket Connection
    useEffect(() => {
        let reconnectTimeout;
        const connectWs = () => {
            wsRef.current = new WebSocket(`wss://awetales-sentinel.onrender.com/ws/agent/${user.id}`);
            wsRef.current.onopen = () => setWsStatus('Connected');
            wsRef.current.onmessage = (event) => {
                // Agent dashboard just ignores analytics payload
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
    }, [user.id]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, interimTranscript, isAgentTyping]);

    // Auto-reply logic for Agent simulation
    useEffect(() => {
        if (messages.length === 0) return;
        const lastMsg = messages[messages.length - 1];

        // If the last message was from the customer
        if (lastMsg.role === 'Customer') {
            setIsAgentTyping(true);

            // Generate full transcript for context
            const transcript = messages.map(m => `${m.role}: ${m.text}`).join('\n');

            fetch('https://awetales-sentinel.onrender.com/agent/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript })
            })
                .then(res => res.json())
                .then(data => {
                    const replyText = data.reply || "I'm sorry, I cannot assist right now.";
                    const newMsg = { id: Date.now(), role: 'Agent', text: replyText };
                    setMessages(prev => [...prev, newMsg]);
                    setIsAgentTyping(false);

                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ role: 'Agent', text: replyText }));
                    }
                })
                .catch(err => {
                    console.error("AI Reply failed:", err);
                    setIsAgentTyping(false);
                    const errorMsg = {
                        id: Date.now(),
                        role: 'Agent',
                        text: "⚠️ [Technical Difficulty] I cannot generate a response right now. Please ensure your backend has the correct OPENAI_API_KEY configured on Render."
                    };
                    setMessages(prev => [...prev, errorMsg]);
                });
        }
    }, [messages]);

    const handleMessageSubmit = (text) => {
        if (!text.trim()) return;

        const newMsg = { id: Date.now(), role: sendAsRole, text };
        setMessages(prev => [...prev, newMsg]);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ role: sendAsRole, text }));
        }
    };

    const handleSendText = (e) => {
        e.preventDefault();
        if (inputText.trim()) {
            handleMessageSubmit(inputText);
            setInputText('');
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] bg-grid-pattern font-sans antialiased flex flex-col tracking-tight text-gray-900 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div style={{ y: leftOrbY }} className="absolute inset-0 w-full h-full">
                    <motion.div
                        animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.05, 1] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-white rounded-full blur-[120px] opacity-90"
                    />
                </motion.div>
            </div>

            <nav className="sticky top-0 z-50 bg-white/60 backdrop-blur-2xl border-b border-black/5 px-8 py-4 flex justify-between items-center shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3">
                    <SentinelLogo className="w-10 h-10 text-black" />
                    <h1 className="text-2xl font-black text-[#555555] tracking-widest uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>Sentinel</h1>
                    <span className="text-[13px] text-gray-400 font-medium ml-2 hidden sm:block">Agent Terminus</span>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="text-[12px] font-bold text-gray-400 uppercase tracking-widest hidden md:block">
                        {user.email}
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/5 shadow-sm">
                        <div className={`w-2 h-2 rounded-full ${wsStatus === 'Connected' ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">{wsStatus === 'Connected' ? 'Live' : 'Offline'}</span>
                    </div>

                    <button
                        onClick={handleNewChat}
                        className="flex items-center gap-2 bg-white/80 text-black px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border border-black/5 shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <MessageSquarePlus size={14} /> New Chat
                    </button>

                    <button
                        onClick={fetchHistory}
                        className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        <Clock size={14} /> History
                    </button>
                    <Link
                        to="/details"
                        className="hidden sm:flex items-center gap-2 bg-white/80 text-black px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border border-black/5 shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <Info size={14} /> Details
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 bg-white/80 text-red-600 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border border-black/5 shadow-sm hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={14} /> <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </nav>

            <main className="flex-1 flex justify-center overflow-hidden p-8 max-w-[1200px] mx-auto w-full relative z-10">
                <AnimatePresence>
                    {showHistory && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowHistory(false)}
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-black/5"
                            >
                                <div className="p-6 border-b border-black/5 flex justify-between items-center bg-[#F8F9FA]">
                                    <h2 className="text-[15px] font-bold flex items-center gap-2 uppercase tracking-widest"><Clock size={16} /> My Session History</h2>
                                    <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-black hover:bg-gray-100 p-1.5 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {historyData.length === 0 ? (
                                        <p className="text-sm font-medium text-gray-500 text-center mt-10">No past sessions found. Disconnect the agent to save the current session to history.</p>
                                    ) : (
                                        historyData.map((session, idx) => (
                                            <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-black/5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="text-[10px] font-bold px-2 py-1 bg-white rounded-md uppercase tracking-wider text-gray-600 shadow-sm border border-black/5">
                                                        {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${session.escalation_risk === 'high' ? 'bg-red-100 text-red-700' : session.escalation_risk === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                        {session.escalation_risk} Risk
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold mb-2 text-black">{session.intent || session.topic || "General Discussion"}</p>
                                                <div className="text-xs text-gray-600 space-y-2 bg-white p-3 rounded-xl border border-black/5 mt-2 h-[120px] overflow-y-auto scrollbar-mac">
                                                    {session.transcript.split('\n').filter(Boolean).map((line, i) => (
                                                        <div key={i} className={`flex ${line.startsWith('Customer') ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`px-2 py-1 rounded-lg text-left max-w-[90%] ${line.startsWith('Customer') ? 'bg-black text-white' : 'bg-gray-100'}`}>
                                                                {line.replace(/^(Customer|Agent):\s*/, '')}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <section className="flex-1 w-full max-w-3xl flex flex-col glass-panel rounded-[2rem] overflow-hidden relative shadow-2xl bg-white/40">
                    <div className="px-8 py-5 border-b border-black/5 bg-white/60 backdrop-blur-md flex justify-between items-center">
                        <h2 className="font-semibold text-black text-[15px]">Active Call Session</h2>
                    </div>

                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-mac pb-32">
                        <AnimatePresence initial={false}>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-3 ${msg.role === 'Customer' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'Customer' ? 'bg-black text-white' : 'bg-white border border-black/10 text-black'
                                        }`}>
                                        {msg.role === 'Customer' ? <User size={14} /> : <Bot size={14} />}
                                    </div>

                                    {/* FIX IMPLEMENTED HERE: gray on left, black on right */}
                                    <div className={`px-5 py-3.5 text-[15px] leading-relaxed max-w-[75%] shadow-[0_2px_10px_rgba(0,0,0,0.04)] ${msg.role === 'Customer'
                                        ? "bg-black text-white rounded-2xl rounded-tr-sm"
                                        : "bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm border border-black/5"
                                        }`}>
                                        {msg.text}
                                    </div>
                                </motion.div>
                            ))}

                            {isAgentTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3 flex-row"
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm bg-white border border-black/10 text-black">
                                        <Bot size={14} />
                                    </div>
                                    <div className="px-5 py-3.5 bg-gray-100 rounded-2xl rounded-tl-sm border border-black/5 flex items-center gap-1.5 h-[48px]">
                                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div ref={messagesEndRef} className="h-4" />
                    </div>

                    <div className="absolute bottom-6 left-8 right-8 z-20">
                        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-2xl p-2 rounded-[1.5rem] border border-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                            <div className="flex-1 overflow-hidden relative h-[56px]">
                                <form onSubmit={handleSendText} className="absolute inset-0 flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        placeholder={`Type message as Customer...`}
                                        className="flex-1 h-full bg-transparent border-none focus:ring-0 px-4 text-[15px] outline-none text-black placeholder-gray-400 font-medium"
                                    />
                                    <motion.button
                                        whileHover={{ scale: inputText.trim() ? 1.05 : 1 }}
                                        whileTap={{ scale: inputText.trim() ? 0.95 : 1 }}
                                        type="submit"
                                        disabled={!inputText.trim()}
                                        className={`text-white h-[44px] w-[44px] rounded-xl shadow-sm transition-colors flex items-center justify-center mr-1.5 bg-black disabled:bg-gray-200 disabled:text-gray-400`}
                                    >
                                        <Send size={18} className={inputText.trim() ? "translate-x-0.5" : ""} />
                                    </motion.button>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
