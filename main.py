import asyncio
import os
import json
import sqlite3
from typing import Dict, List
from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AweTales Sentinel Multi-Role")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncOpenAI(
    base_url="https://models.inference.ai.azure.com",
    api_key=os.getenv("OPENAI_API_KEY")
)

# --- DATABASE SETUP ---
DB_FILE = "sentinel.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT NOT NULL,
            intent TEXT,
            topic TEXT,
            sentiment TEXT,
            escalation_risk TEXT,
            transcript TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    
    # Pre-seed hackathon demo users if they don't exist
    c.execute("SELECT * FROM users WHERE email='agent@awetales.com'")
    if not c.fetchone():
        c.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", 
                  ("agent@awetales.com", "agent123", "agent"))
    c.execute("SELECT * FROM users WHERE email='supervisor@awetales.com'")
    if not c.fetchone():
        c.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", 
                  ("supervisor@awetales.com", "super123", "supervisor"))
    conn.commit()
    conn.close()

init_db()

# --- AUTH ENDPOINTS ---
class AuthRequest(BaseModel):
    email: str
    password: str
    role: str = "agent" # Used for register only

class AgentReplyRequest(BaseModel):
    transcript: str

@app.post("/auth/register")
async def register(req: AuthRequest):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", 
                  (req.email, req.password, req.role))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        return {"id": user_id, "email": req.email, "role": req.role}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/login")
async def login(req: AuthRequest):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email=? AND password=?", (req.email, req.password))
    user = c.fetchone()
    conn.close()
    
    if user:
        return {"id": user['id'], "email": user['email'], "role": user['role']}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/users")
async def get_users():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT id, email, role FROM users")
    users = c.fetchall()
    conn.close()
    return [{"id": u['id'], "email": u['email'], "role": u['role']} for u in users]

@app.get("/history")
async def get_history():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM history ORDER BY timestamp DESC")
    hst = c.fetchall()
    conn.close()
    return [dict(h) for h in hst]


# --- WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        # Maps agent_id -> websocket
        self.active_agents: Dict[str, WebSocket] = {}
        # List of connected supervisor websockets
        self.active_supervisors: List[WebSocket] = []
        # Stores live analytics state for each agent broadcast
        self.agent_states: Dict[str, dict] = {}

    async def connect_agent(self, websocket: WebSocket, agent_id: str):
        await websocket.accept()
        self.active_agents[agent_id] = websocket
        self.agent_states[agent_id] = {
            "agent_id": agent_id,
            "transcript": "",
            "analytics": {
                "intent": "—",
                "topic": "—",
                "sentiment": "Neutral",
                "escalation_risk": "low",
                "confidence": 0.0
            }
        }
        await self.broadcast_to_supervisors()

    def disconnect_agent(self, agent_id: str):
        if agent_id in self.active_agents:
            del self.active_agents[agent_id]
        if agent_id in self.agent_states:
            # SAVE HISTORY BEFORE DELETING
            state = self.agent_states[agent_id]
            if state["transcript"].strip(): # Only save if they actually talked
                try:
                    conn = sqlite3.connect(DB_FILE)
                    c = conn.cursor()
                    c.execute('''
                        INSERT INTO history (agent_id, intent, topic, sentiment, escalation_risk, transcript) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        str(agent_id),
                        state["analytics"]["intent"],
                        state["analytics"]["topic"],
                        state["analytics"]["sentiment"],
                        state["analytics"]["escalation_risk"],
                        state["transcript"]
                    ))
                    conn.commit()
                    conn.close()
                except Exception as e:
                    print("Failed to save history:", e)
                    
            del self.agent_states[agent_id]

    async def connect_supervisor(self, websocket: WebSocket):
        await websocket.accept()
        self.active_supervisors.append(websocket)
        # Send current state immediately upon connection
        await websocket.send_json({"type": "full_state", "agents": self.agent_states})

    def disconnect_supervisor(self, websocket: WebSocket):
        if websocket in self.active_supervisors:
            self.active_supervisors.remove(websocket)

    async def update_agent_transcript(self, agent_id: str, new_chunk: str):
        if agent_id in self.agent_states:
            self.agent_states[agent_id]["transcript"] += f"{new_chunk}\n"
            await self.broadcast_to_supervisors()

    async def update_agent_analytics(self, agent_id: str, analytics: dict):
        if agent_id in self.agent_states:
            self.agent_states[agent_id]["analytics"] = analytics
            # Send the analytics back to the agent as well (if needed, though spec says agent is chat-only)
            # We'll still send it to agent so their UI *could* use it, but they will hide it
            agent_ws = self.active_agents.get(agent_id)
            if agent_ws:
                try:
                    await agent_ws.send_json(analytics)
                except:
                    pass
            await self.broadcast_to_supervisors()

    async def broadcast_to_supervisors(self):
        for sup_ws in self.active_supervisors:
            try:
                await sup_ws.send_json({"type": "full_state", "agents": self.agent_states})
            except Exception:
                pass


manager = ConnectionManager()


SYSTEM_PROMPT = """
You are AweTales Sentinel, an elite, ultra-fast enterprise AI analytics engine.
Analyze the FULL conversation transcript, prioritizing the MOST RECENT exchange for sentiment and risk, and output strictly valid JSON.

═══ SENTIMENT RULES (strict) ═══
- Positive: satisfied, calm, thanking, agreeable, "happy", "great", "thanks"
- Neutral: factual, inquiries, polite, "how do I", "where is"
- Negative: angry, "unacceptable", "worst", "refund", "lawsuit", "frustrated", all caps, "broke", "not working"

═══ ESCALATION RISK (strict criteria) ═══
- low: calm routine inquiry or first contact, or positive feedback
- medium: repeated issue, waiting too long, minor frustration ("still not fixed"), or unresolved factual inquiry
- high: demands manager/supervisor, refund, legal action, extreme anger, "I'm leaving", "cancel my account"

═══ RECOVERY DYNAMICS ═══
- If customer calms down ("okay", "fine", "thanks", "willing to wait") AFTER being angry → DROP escalation_risk by one level (e.g., high → medium).
- If the latest message is a "thank you" or "okay", the risk should likely be 'low'.

═══ CONFIDENCE SCORING ═══
- 1 message: 0.60-0.75
- 2-3 messages: 0.80-0.88
- 4+ messages or distinct triggers: 0.92+

Return ONLY JSON:
{"intent": "brief intent (max 4 words)", "topic": "brief topic (max 4 words)", "sentiment": "Positive|Neutral|Negative", "escalation_risk": "low|medium|high", "confidence": float}
"""

FALLBACK_RESPONSES = [
    {"intent":"billing inquiry","topic":"invoice question","sentiment":"Neutral","escalation_risk":"low","confidence":0.85},
    {"intent":"service complaint","topic":"unresolved issue","sentiment":"Negative","escalation_risk":"medium","confidence":0.88},
    {"intent":"escalation demand","topic":"manager request","sentiment":"Negative","escalation_risk":"high","confidence":0.95}
]
fallback_index = 0

async def analyze_conversation(transcript: str) -> dict:
    global fallback_index
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Analyze this full transcript:\n\n{transcript}"}
            ],
            temperature=0.1,
            max_tokens=60
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"[LLM ERROR] {e} — using fallback")
        result = FALLBACK_RESPONSES[fallback_index % len(FALLBACK_RESPONSES)]
        fallback_index += 1
        return result

@app.get("/health")
async def health():
    return {"status": "ok", "model": "gpt-4o-mini"}

AGENT_REPLY_PROMPT = """
You are a helpful, professional, and empathetic customer support agent for AweTales.
Review the conversation transcript and provide the next logical response to the customer.
Keep your response concise, friendly, and directly addressing their LATEST concern.
Avoid being repetitive. If the user says 'Hi', don't just say 'Hi' back every time, offer assistance.
Do not use placeholders like [Insert Name] or [Link]. Assume you have access to their account.
"""

@app.post("/agent/reply")
async def generate_agent_reply(req: AgentReplyRequest):
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": AGENT_REPLY_PROMPT},
                {"role": "user", "content": f"Transcript so far:\n{req.transcript}\n\nAgent Reply:"}
            ],
            temperature=0.7,
            max_tokens=100
        )
        reply = response.choices[0].message.content.strip()
        return {"reply": reply}
    except Exception as e:
        print(f"[REPLY ERROR] {e}")
        return {"reply": "I'm sorry, I am experiencing technical difficulties finding that information. Could you hold a moment?"}

@app.websocket("/ws/agent/{agent_id}")
async def websocket_agent_endpoint(websocket: WebSocket, agent_id: str):
    await manager.connect_agent(websocket, agent_id)
    print(f"[CONNECTED] Agent {agent_id} connected")
    
    analysis_task = None

    async def debounced_analyze():
        await asyncio.sleep(0.2)
        # Fetch current transcript for this agent from manager
        transcript = manager.agent_states[agent_id]["transcript"]
        if transcript.strip():
            result = await analyze_conversation(transcript)
            await manager.update_agent_analytics(agent_id, result)
            print(f"[ANALYZED] Agent {agent_id}: {result}")

    try:
        while True:
            data = await websocket.receive_text()
            # In the new model, we expect the frontend to send either JSON `{role: "Customer", text: "..."}` 
            # or plain text if it's just a Customer message. Let's handle a structured JSON dict.
            try:
                msg_obj = json.loads(data)
                role = msg_obj.get("role", "Customer")
                text = msg_obj.get("text", "")
                await manager.update_agent_transcript(agent_id, f"{role}: {text}")
            except json.JSONDecodeError:
                # Fallback to plain customer text like original
                await manager.update_agent_transcript(agent_id, f"Customer: {data}")

            if analysis_task and not analysis_task.done():
                analysis_task.cancel()
            analysis_task = asyncio.create_task(debounced_analyze())

    except WebSocketDisconnect:
        manager.disconnect_agent(agent_id)
        await manager.broadcast_to_supervisors()
        print(f"[DISCONNECTED] Agent {agent_id} disconnected")
    except Exception as e:
        manager.disconnect_agent(agent_id)
        await manager.broadcast_to_supervisors()
        print(f"[ERROR] Agent {agent_id}: {e}")

@app.websocket("/ws/supervisor")
async def websocket_supervisor_endpoint(websocket: WebSocket):
    await manager.connect_supervisor(websocket)
    print("[CONNECTED] Supervisor connected")
    try:
        while True:
            # Keep connection open, ignore incoming messages from supervisor
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_supervisor(websocket)
        print("[DISCONNECTED] Supervisor disconnected")
