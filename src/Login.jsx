import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from './assets/logo.png';



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
            const endpoint = isRegister ? 'https://awetales-sentinel.onrender.com/auth/register' : 'https://awetales-sentinel.onrender.com/auth/login';
            const bodyData = isRegister ? { email, password, role } : { email, password };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            if (!res.ok) {
                throw new Error("Invalid credentials");
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
                <div className="flex flex-col items-center mb-10">
                    <img src={logo} alt="Sentinel Logo" className="w-28 h-28 mb-6 object-contain drop-shadow-2xl" />
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

                <div className="mt-8 pt-6 border-t border-black/5 text-center">
                    <p className="text-xs text-gray-400 font-medium mb-2">Demo Credentials</p>
                    <div className="flex justify-between text-[11px] text-gray-500 bg-black/5 p-3 rounded-lg border border-black/5">
                        <div className="text-left">
                            <b>Agent</b><br />agent@awetales.com<br />agent123
                        </div>
                        <div className="text-right">
                            <b>Supervisor</b><br />supervisor@awetales.com<br />super123
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Ambient background matching App */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.05, 1] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-white rounded-full blur-[120px] opacity-90" />
            </div>
        </div>
    );
}
