import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Cpu, Zap, Activity, Users, Bot } from 'lucide-react';

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
                        <p className="text-gray-500 font-medium tracking-wide flex items-center justify-center md:justify-start gap-2">
                            <Zap size={16} className="text-black" /> Real-Time Analytics Specification
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="p-8 glass-panel rounded-[2rem] bg-white/60 border border-black/5 shadow-xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-tighter italic">
                            <Cpu size={20} className="text-black" /> System Requirements
                        </h2>
                        <ul className="space-y-4 text-gray-600">
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                                <span>Extract 4 analytical components from streaming ASR text.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                                <span>Real-time processing with low latency for live dashboards.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                                <span>Support for multi-role viewing (Agent vs Director).</span>
                            </li>
                        </ul>
                    </div>

                    <div className="p-8 glass-panel rounded-[2rem] bg-black text-white border border-black/5 shadow-xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-tighter italic text-white/90">
                            <Activity size={20} className="text-white" /> Intelligence Extracted
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Intent', color: 'bg-blue-500' },
                                { label: 'Topic', color: 'bg-purple-500' },
                                { label: 'Sentiment', color: 'bg-green-500' },
                                { label: 'Escalation', color: 'bg-red-500' }
                            ].map((item) => (
                                <div key={item.label} className="p-4 bg-white/10 rounded-2xl border border-white/10">
                                    <div className={`w-2 h-2 rounded-full ${item.color} mb-2`} />
                                    <span className="text-[12px] font-bold uppercase tracking-widest opacity-60">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 glass-panel rounded-[2.5rem] bg-white/40 border border-black/5 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Database size={120} />
                    </div>
                    <h2 className="text-2xl font-black mb-8 uppercase italic tracking-tighter">Implementation Architecture</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Users size={12} /> Frontend Layer
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed font-mono">React + Vite + Tailwind CSS. Real-time WebSocket handlers manage the state of active sessions.</p>
                        </div>
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Zap size={12} /> API Layer
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed font-mono">FastAPI with High-Conurrency WebSocket managers and 0.2s debounce buffering.</p>
                        </div>
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Bot size={12} /> AI Engine
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed font-mono">GPT-4o-Mini via GitHub Models. Structured system prompts for multi-dimensional analytics.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
