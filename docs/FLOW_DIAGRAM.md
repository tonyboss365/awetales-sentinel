# AweTales Sentinel - System Flow Diagram

The following diagram illustrates the real-time data flow between the Agent, Backend, AI Engine, and Supervisor.

```mermaid
sequenceDiagram
    participant A as Agent Dashboard (React)
    participant B as FastAPI Backend (WebSocket)
    participant AI as AI Engine (gpt-4o-mini)
    participant S as Supervisor Dashboard (React)
    participant DB as SQLite Database

    Note over A,B: User starts session
    A->>B: WebSocket Connect (/ws/agent/{id})
    B->>S: Broadcast: Agent Online

    loop Real-Time Interaction
        A->>B: Stream ASR Text (Live Keystrokes)
        Note right of B: 0.2s Debounce Buffer
        B->>AI: Analyze Conversation (Intent, Sentiment, Risk)
        AI-->>B: JSON Analytics Payload
        B->>S: Broadcast: Live Analytics Update
        S->>S: Render Sentiment & Risk Alerts
    end

    Note over A,B: Session Disconnect
    A-->>B: WebSocket Close
    B->>DB: Archive Transcript & Stats (History Table)
    B->>S: Broadcast: Agent Offline
```

---

## 🏗 High-Level Architecture
1. **Frontend**: React-based UI with Framer Motion for premium "glassmorphism" aesthetics.
2. **Streaming**: Bi-directional WebSockets for zero-latency communication.
3. **Intelligence**: GPT-4o-mini performing sub-second categorical inference.
4. **Persistence**: SQLite storage for audit trails and account management.
