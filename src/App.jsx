import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AgentDashboard from './AgentDashboard';
import SupervisorDashboard from './SupervisorDashboard';
import Details from './Details';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/agent" element={<AgentDashboard />} />
        <Route path="/supervisor" element={<SupervisorDashboard />} />
        <Route path="/details" element={<Details />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
