import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_BASE_URL } from './config';

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



export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [role, setRole] = useState('agent');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isRegister ? `${API_BASE_URL}/auth/register` : `${API_BASE_URL}/auth/login`;
            const bodyData = isRegister ? { email, password, role } : { email, password };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Authentication failed");
            }

            const data = await res.json();
            localStorage.setItem('user', JSON.stringify(data));

            if (data.role === 'supervisor') {
                navigate('/supervisor');
            } else {
                navigate('/agent');
            }
        } catch (err) {
            setError(err.message || (isRegister ? 'Registration failed' : 'Login failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] bg-grid-pattern font-sans antialiased flex flex-col justify-center items-center text-gray-900 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-8 glass-panel rounded-[2rem] shadow-2xl bg-white/60 backdrop-blur-xl border border-black/5 z-10"
            >
                <div className="flex flex-col items-center mb-8">
                    <SentinelLogo className="w-20 h-20 mb-4 text-black" />
                    <h1 className="text-3xl font-black text-[#555555] tracking-widest uppercase text-center" style={{ fontFamily: 'Impact, sans-serif' }}>Sentinel</h1>
                    <p className="text-gray-500 mt-2 text-sm font-medium">Enterprise Communications Intelligence</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 ml-1">Work Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="agent@awetales.com"
                            className="w-full px-4 py-3 rounded-xl bg-white/80 border border-black/10 focus:outline-none focus:ring-2 focus:ring-black/20 text-sm font-medium"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl bg-white/80 border border-black/10 focus:outline-none focus:ring-2 focus:ring-black/20 text-sm font-medium"
                            required
                        />
                    </div>

                    {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                    {isRegister && (
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 ml-1">Account Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/80 border border-black/10 focus:outline-none focus:ring-2 focus:ring-black/20 text-sm font-medium"
                            >
                                <option value="agent">Support Agent</option>
                                <option value="supervisor">Director / Supervisor</option>
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 bg-black text-white font-bold uppercase tracking-widest text-sm py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                    >
                        {loading ? "Authenticating..." : (isRegister ? "Create Sentinel Account" : "Login to Sentinel")}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setIsRegister(!isRegister); setError(''); }}
                        className="w-full mt-2 text-xs font-bold tracking-widest uppercase text-gray-500 hover:text-black transition-colors"
                    >
                        {isRegister ? "Already have an account? Login" : "Need an account? Register"}
                    </button>
                </form>


            </motion.div>

            {/* Ambient background matching App */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.05, 1] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-white rounded-full blur-[120px] opacity-90" />
            </div>
        </div>
    );
}
