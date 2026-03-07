const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
export const API_BASE_URL = isProd ? 'https://awetales-sentinel.onrender.com' : 'http://localhost:8000';
export const WS_BASE_URL = isProd ? 'wss://awetales-sentinel.onrender.com' : 'ws://localhost:8000';
