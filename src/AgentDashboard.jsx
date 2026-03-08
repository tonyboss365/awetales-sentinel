import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Mic, Keyboard, Send, Bot, User, Clock, Info, X, MessageSquarePlus, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL, WS_BASE_URL } from './config';

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
    const [inputMode, setInputMode] = useState('voice');
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const isListeningRef = useRef(false);
    const isSpeakingRef = useRef(false);
    const [interimTranscript, setInterimTranscript] = useState('');

    const [wsStatus, setWsStatus] = useState('Disconnected');
    const sendAsRole = 'Customer';

    const wsRef = useRef(null);
    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);
    const chatScrollRef = useRef(null);
    const [isAgentTyping, setIsAgentTyping] = useState(false);
    const lastSentTranscriptRef = useRef('');

    const { scrollY } = useScroll();
    const leftOrbY = useTransform(scrollY, [0, 500], [0, 100]);

    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { email: 'agent@demo.com', id: '1' };

    // --- SPEECH RECOGNITION SETUP ---
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition API not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            console.log("Speech recognition started");
            setIsListening(true);
            isListeningRef.current = true;
        };

        recognition.onresult = (event) => {
            // Prevent microphone from picking up the AI Agent's Text-to-Speech output
            if (isSpeakingRef.current) return;

            let final = '';
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            if (final) {
                handleMessageSubmit(final);
                setInterimTranscript('');
            } else {
                setInterimTranscript(interim);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                alert("Microphone access denied. Please enable it in your browser settings to use voice input.");
                isListeningRef.current = false;
                setIsListening(false);
            } else if (event.error === 'no-speech') {
                // Often happens in Chrome, we don't necessarily want to stop UI
                console.log("No speech detected, continuing...");
            } else {
                // For other errors, stop the UI state
                setIsListening(false);
                isListeningRef.current = false;
            }
        };

        recognition.onend = () => {
            console.log("Speech recognition ended");
            // Use ref to avoid stale closure. 
            // Chrome needs a small delay to restart effectively after it ends.
            if (isListeningRef.current) {
                console.log("Attempting to restart recognition...");
                setTimeout(() => {
                    if (isListeningRef.current) {
                        try {
                            recognition.start();
                        } catch (e) {
                            console.error("Failed to restart recognition:", e);
                        }
                    }
                }, 200);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                recognitionRef.current.onstart = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.stop();
            }
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in your browser.");
            return;
        }

        if (isListeningRef.current) {
            console.log("Stopping recognition manually...");
            isListeningRef.current = false;
            recognitionRef.current.stop();
            setIsListening(false);
            setInterimTranscript('');
        } else {
            console.log("Starting recognition manually...");
            try {
                isListeningRef.current = true;
                recognitionRef.current.start();
                // State update handled by onstart
            } catch (e) {
                console.error("Recognition start failed, attempting recovery:", e);
                isListeningRef.current = false;
                recognitionRef.current.stop();
                setTimeout(() => {
                    isListeningRef.current = true;
                    recognitionRef.current.start();
                }, 200);
            }
        }
    };

    // --- WEBSOCKET SETUP ---
    useEffect(() => {
        let reconnectTimeout;
        const connectWs = () => {
            const agentId = user.id || '1';
            wsRef.current = new WebSocket(`${WS_BASE_URL}/ws/agent/${agentId}`);

            wsRef.current.onopen = () => setWsStatus('Connected');
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
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, interimTranscript, isAgentTyping]);

    useEffect(() => {
        if (messages.length === 0) return;
        const lastMsg = messages[messages.length - 1];

        if (lastMsg.role === 'Customer') {
            const transcript = messages.map(m => `${m.role}: ${m.text}`).join('\n');
            
            // Prevent duplicate requests if transcript hasn't changed
            if (transcript === lastSentTranscriptRef.current) return;
            lastSentTranscriptRef.current = transcript;

            setIsAgentTyping(true);

            fetch(`${API_BASE_URL}/agent/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript })
            })
                .then(res => res.json())
                .then(data => {
                    const replyText = data.reply || "I'm sorry, I cannot assist right now.";
                    
                    // Clean text for speech (keep basic punctuation for natural pauses, remove markdown symbols)
                    const speechText = replyText.replace(/[*#~_`[\]{}|\\\/@$%^&+<>=]/g, '').replace(/\s+/g, ' ').trim();

                    const newMsgId = Date.now();
                    const newMsg = { id: newMsgId, role: 'Agent', text: '' };
                    setMessages(prev => [...prev, newMsg]);
                    setIsAgentTyping(false);

                    // Fire Speech Synthesis immediately (Speech starts, text appears parallelly)
                    if ('speechSynthesis' in window) {
                        isSpeakingRef.current = true;

                        // Briefly pause recognition so the mic doesn't catch the AI's own voice
                        if (isListeningRef.current && recognitionRef.current) {
                            try { recognitionRef.current.stop(); } catch (e) { }
                        }

                        const utterance = new SpeechSynthesisUtterance(speechText);

                        // Select the absolute best humanoid TTS available
                        let voices = window.speechSynthesis.getVoices();
                        const premiumVoices = ['Microsoft Aria Online', 'Microsoft Jenny Online', 'Google US English', 'Microsoft Zira'];

                        let selectedVoice = null;
                        for (let premium of premiumVoices) {
                            selectedVoice = voices.find(v => v.name.includes(premium));
                            if (selectedVoice) break;
                        }

                        // Fallback to any natural English voice
                        if (!selectedVoice) {
                            selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online')))
                                || voices.find(v => v.lang.startsWith('en-US'));
                        }

                        if (selectedVoice) utterance.voice = selectedVoice;

                        // Normalizing pitch/rate makes modern TTS sound significantly more human
                        utterance.pitch = 1.0;
                        utterance.rate = 1.05;

                        let typeInterval = null;

                        utterance.onstart = () => {
                            // Start filling text only when voice actually begins computing and playing (removes delay sync issues)
                            const typingSpeed = (speechText.length * 60) / Math.max(replyText.length, 1);
                            typeInterval = setInterval(() => {
                                setMessages(prev => 
                                    prev.map(msg => {
                                        if (msg.id === newMsgId && msg.text.length < replyText.length) {
                                            return { ...msg, text: replyText.substring(0, msg.text.length + 1) };
                                        }
                                        return msg;
                                    })
                                );
                            }, typingSpeed);
                        };

                        utterance.onboundary = (event) => {
                            if (event.name === 'word') {
                                // Ensure text keeps up with speech accurately by syncing word boundaries
                                const progress = Math.min(event.charIndex / speechText.length, 1);
                                const targetLength = Math.floor(progress * replyText.length) + 8; // Small lookahead
                                
                                setMessages(prev => 
                                    prev.map(msg => {
                                        if (msg.id === newMsgId) {
                                            const newLen = Math.max(msg.text.length, targetLength);
                                            return { ...msg, text: replyText.substring(0, Math.min(newLen, replyText.length)) };
                                        }
                                        return msg;
                                    })
                                );
                            }
                        };

                        utterance.onend = () => {
                            isSpeakingRef.current = false;
                            if (typeInterval) clearInterval(typeInterval);
                            
                            // Ensure text is fully complete
                            setMessages(prev => prev.map(msg => msg.id === newMsgId ? { ...msg, text: replyText } : msg));
                            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                                wsRef.current.send(JSON.stringify({ role: 'Agent', text: replyText }));
                            }

                            // Resume listening to the customer seamlessly
                            if (isListeningRef.current && inputMode === 'voice' && recognitionRef.current) {
                                try { recognitionRef.current.start(); } catch (e) { }
                            }
                        };

                        utterance.onerror = (e) => {
                            console.error("Speech Synthesis Error:", e);
                            isSpeakingRef.current = false;
                            if (typeInterval) clearInterval(typeInterval);
                            setMessages(prev => prev.map(msg => msg.id === newMsgId ? { ...msg, text: replyText } : msg));
                        };

                        // Speak immediately
                        window.speechSynthesis.speak(utterance);
                    } else {
                        // Fallback if no speech synthesis supported
                        let i = 0;
                        const typeInterval = setInterval(() => {
                            setMessages(prev => 
                                prev.map(msg => 
                                    msg.id === newMsgId ? { ...msg, text: replyText.substring(0, i + 1) } : msg
                                )
                            );
                            i++;
                            if (i >= replyText.length) {
                                clearInterval(typeInterval);
                                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                                    wsRef.current.send(JSON.stringify({ role: 'Agent', text: replyText }));
                                }
                            }
                        }, 50);
                    }
                })
                .catch(err => {
                    console.error("AI Reply failed:", err);
                    setIsAgentTyping(false);
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

                <div className="flex items-center gap-6 relative z-10">
                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Active Station</span>
                        <span className="text-[12px] font-bold text-gray-600 truncate max-w-[150px]">{user.email.toUpperCase()}</span>
                    </div>

                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/5 shadow-sm">
                        <div className={`w-2 h-2 rounded-full ${wsStatus === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">{wsStatus === 'Connected' ? 'Live' : 'Offline'}</span>
                    </div>

                    <div className="flex bg-black/5 p-1 rounded-full border border-black/5">
                        <button onClick={() => setMessages([])} className="p-2 text-gray-500 hover:text-black transition-colors" title="Clear Chat">
                            <MessageSquarePlus size={18} />
                        </button>
                        <Link to="/details" className="p-2 text-gray-500 hover:text-black transition-colors" title="System Details">
                            <Info size={18} />
                        </Link>
                        <button onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} className="p-2 text-gray-500 hover:text-red-500 transition-colors" title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 max-w-[1000px] mx-auto w-full p-4 md:p-8 flex flex-col items-center justify-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full h-[75vh] glass-panel rounded-[2.5rem] bg-white/40 shadow-2xl border border-black/5 flex flex-col overflow-hidden relative"
                >
                    <div className="px-8 py-5 border-b border-black/5 bg-white/60 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
                        <h2 className="font-semibold text-black text-[15px]">Active Call Session</h2>
                        <div className="flex bg-black/5 p-1 rounded-xl border border-black/5">
                            <button
                                onClick={() => { setInputMode('voice'); setInputText(''); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${inputMode === 'voice' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Mic size={14} /> Voice
                            </button>
                            <button
                                onClick={() => { setInputMode('type'); setIsListening(false); if (recognitionRef.current) recognitionRef.current.stop(); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${inputMode === 'type' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Keyboard size={14} /> Type
                            </button>
                        </div>
                    </div>

                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth z-0 bg-white/5">
                        <AnimatePresence mode="popLayout">
                            {messages.length === 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 space-y-4">
                                    <Bot size={48} strokeWidth={1.5} />
                                    <p className="text-sm font-medium">Session initialized. Listening for customer input...</p>
                                </motion.div>
                            )}
                            {messages.map((m) => (
                                <motion.div
                                    key={m.id}
                                    initial={{ opacity: 0, x: m.role === 'Agent' ? -20 : 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    className={`flex items-end gap-3 ${m.role === 'Agent' ? 'flex-row' : 'flex-row-reverse'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-black/5 shadow-sm ${m.role === 'Agent' ? 'bg-white' : 'bg-black text-white'}`}>
                                        {m.role === 'Agent' ? <Bot size={14} /> : <User size={14} />}
                                    </div>
                                    <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm transition-all ${m.role === 'Agent' ? 'bg-white text-gray-800 rounded-bl-none border border-black/5' : 'bg-[#0A0A0A] text-white rounded-br-none'}`}>
                                        {m.text}
                                    </div>
                                </motion.div>
                            ))}
                            <AnimatePresence>
                                {isAgentTyping && (
                                    <motion.div key="typing-indicator" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-black/5 shadow-sm">
                                            <Bot size={14} className="text-gray-400" />
                                        </div>
                                        <div className="bg-white/50 px-4 py-2 rounded-2xl rounded-bl-none border border-black/5">
                                            <div className="flex gap-1">
                                                {[0, 1, 2].map((i) => (
                                                    <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {interimTranscript && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end pr-11">
                                    <div className="bg-black/5 text-gray-500 italic text-[13px] px-4 py-2 rounded-2xl rounded-br-none">
                                        {interimTranscript}...
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </AnimatePresence>
                    </div>

                    <div className="p-8 border-t border-black/5 bg-white/60 backdrop-blur-md z-10 shrink-0">
                        {inputMode === 'voice' ? (
                            <div className="flex flex-col items-center justify-center py-4 gap-6">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={toggleListening}
                                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${isListening ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'bg-black text-white shadow-xl'}`}
                                >
                                    {isListening ? (
                                        <>
                                            <div className="flex gap-1 items-center justify-center">
                                                {[0, 1, 2, 3].map(i => (
                                                    <motion.div
                                                        key={i}
                                                        animate={{ height: [10, 30, 10] }}
                                                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                                        className="w-1 bg-white rounded-full"
                                                    />
                                                ))}
                                            </div>
                                            <motion.div
                                                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="absolute inset-0 rounded-full bg-red-500 -z-10"
                                            />
                                        </>
                                    ) : (
                                        <Mic size={32} />
                                    )}
                                </motion.button>
                                <span className={`text-[11px] font-bold uppercase tracking-widest ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                                    {isListening ? 'Listening ASR Input...' : 'Click to start voice interface'}
                                </span>
                            </div>
                        ) : (
                            <form onSubmit={handleSendText} className="relative group flex items-center gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="Type message as Customer..."
                                        className="w-full bg-white/80 border border-black/10 rounded-2xl px-6 py-4 text-[15px] focus:outline-none focus:ring-4 focus:ring-black/5 transition-all shadow-sm placeholder:text-gray-400 pr-16"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <button
                                            type="submit"
                                            disabled={!inputText.trim()}
                                            className={`p-2.5 rounded-xl transition-all ${inputText.trim() ? 'bg-black text-white shadow-lg hover:scale-105 active:scale-95' : 'bg-gray-100 text-gray-300'}`}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                        <p className="text-[10px] text-center mt-4 text-gray-400 uppercase tracking-widest font-bold">Press enter to stream to sentinel engine</p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
