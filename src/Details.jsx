import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';


export default function Details() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F8F9FA] bg-grid-pattern font-sans antialiased text-gray-900 p-4 md:p-8">
            <div className="max-w-[1000px] mx-auto relative z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-black mb-8 transition-colors"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <div className="mb-12 text-center md:text-left flex flex-col md:flex-row items-center md:items-end gap-6">
                    <SentinelLogo className="w-24 h-24 mb-4 md:mb-0 text-black" />
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black text-[#555555] tracking-widest uppercase mb-2" style={{ fontFamily: 'Impact, sans-serif' }}>
                            Hackathon Task
                        </h1>
                        <p className="text-xl md:text-2xl text-black font-bold mb-2">Real-Time Conversation Analytics from Streaming ASR</p>
                    </div>
                </div>

                <p className="text-md text-gray-600 font-medium max-w-2xl text-center md:text-left mb-12">
                    A real-time conversation analytics module that processes streaming text output, analyzing live conversations to extract structured insights including intent, topic, sentiment, and escalation risk using Large Language Models.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Team Info */}
                    <div className="glass-panel p-6 rounded-3xl bg-white/60 shadow-lg border border-black/5 lg:col-span-1">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-md">
                                <Users size={20} />
                            </div>
                            <h2 className="text-lg font-bold uppercase tracking-widest">Team</h2>
                        </div>
                        <ul className="space-y-4">
                            <li className="bg-white/80 p-3 rounded-xl border border-black/5">
                                <p className="font-bold text-sm">Akshay Kumar</p>
                                <p className="text-xs text-gray-500 font-mono mt-1">2420030604<br />2420030604@klh.edu.in</p>
                            </li>
                            <li className="bg-white/80 p-3 rounded-xl border border-black/5">
                                <p className="font-bold text-sm">Charan</p>
                                <p className="text-xs text-gray-500 font-mono mt-1">2420090029<br />2420090029@klh.edu.in</p>
                            </li>
                            <li className="bg-white/80 p-3 rounded-xl border border-black/5">
                                <p className="font-bold text-sm">Bhuvan S</p>
                                <p className="text-xs text-gray-500 font-mono mt-1">2420030135<br />2420030135@klh.edu.in</p>
                            </li>
                        </ul>
                    </div>

                    {/* Features Implementation */}
                    <div className="glass-panel p-6 rounded-3xl bg-white/60 shadow-lg border border-black/5 lg:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
                                <Activity size={20} />
                            </div>
                            <h2 className="text-lg font-bold uppercase tracking-widest">Implemented Architecture</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/80 p-4 rounded-2xl border border-black/5">
                                <h3 className="text-sm font-bold flex items-center gap-2 mb-2"><Zap size={14} className="text-yellow-500" /> Real-Time Analytics</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    FastAPI WebSocket streams bi-directional text simulating ASR input. A 0.2s debounce buffer aggregates live tokens before running instantaneous LLM inference, updating Supervisor Dashboards globally in under 500ms.
                                </p>
                            </div>
                            <div className="bg-white/80 p-4 rounded-2xl border border-black/5">
                                <h3 className="text-sm font-bold flex items-center gap-2 mb-2"><Cpu size={14} className="text-blue-500" /> AI Engine</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Utilizes <span className="font-mono bg-gray-100 px-1 rounded">gpt-4o-mini</span> via GitHub Inference API. Strict military-grade system prompts enforce JSON generation for Intent Detection, Topic Classification, Sentiment Analysis, and dynamic Escalation Risk heuristics.
                                </p>
                            </div>
                            <div className="bg-white/80 p-4 rounded-2xl border border-black/5">
                                <h3 className="text-sm font-bold flex items-center gap-2 mb-2"><Bot size={14} className="text-purple-500" /> Component: Auto-Responder</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Instead of static data, a dedicated <span className="font-mono bg-gray-100 px-1 rounded">/agent/reply</span> endpoint acts as the virtual Agent, generating context-aware empathetic responses to the simulated Customer streaming input.
                                </p>
                            </div>
                            <div className="bg-white/80 p-4 rounded-2xl border border-black/5">
                                <h3 className="text-sm font-bold flex items-center gap-2 mb-2"><Database size={14} className="text-gray-500" /> Persistence & Multi-Role</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Fully integrated React Router with separate login portals. SQLite handles Auth accounts and archives all session transcripts (`history` table) when the WebSockets safely disconnect.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
