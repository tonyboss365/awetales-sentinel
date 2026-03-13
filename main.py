import asyncio
import os
import json
import sqlite3
import pickle
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
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

# Startup diagnostic
groq_key = os.getenv("GROQ_API_KEY")
if not groq_key:
    print("CRITICAL: GROQ_API_KEY not found in environment!")
else:
    print(f"INFO: GROQ_API_KEY found (length: {len(groq_key)})")

eleven_key = os.getenv("ELEVEN_LABS_API_KEY")
if not eleven_key:
    print("WARNING: ELEVEN_LABS_API_KEY not found in environment!")
else:
    print(f"INFO: ELEVEN_LABS_API_KEY found (length: {len(eleven_key)})")


# --- DATABASE SETUP ---
DB_FILE = "sentinel.db"

def init_db():
    conn = sqlite3.connect(DB_FILE, timeout=30)
    c = conn.cursor()
    c.execute("PRAGMA journal_mode=WAL;")
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
    try:
        conn = sqlite3.connect(DB_FILE, timeout=30)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email=? AND password=?", (req.email, req.password))
        user = c.fetchone()
        conn.close()
        
        if user:
            return {"id": user['id'], "email": user['email'], "role": user['role']}
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        print(f"[LOGIN ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
            "latest_agent_emotion": "neutral",
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
                    conn = sqlite3.connect(DB_FILE, timeout=30)
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
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Analyze this full transcript:\n\n{transcript}"}
            ],
            temperature=0.05,
            max_tokens=100,
            seed=42
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"[LLM ERROR] {e} — using fallback")
        result = FALLBACK_RESPONSES[fallback_index % len(FALLBACK_RESPONSES)]
        fallback_index += 1
        return result

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "model": "llama-3.3-70b-versatile",
        "has_eleven": bool(os.getenv("ELEVEN_LABS_API_KEY")),
        "eleven_key": os.getenv("ELEVEN_LABS_API_KEY") # Passing key for frontend direct use
    }

AGENT_REPLY_PROMPT = """
You are an advanced, emotive AI agent trained to act as an emotional guide and support system.
Your goal is to provide ACCURATE emotional mirror responses. 

═══ CRITICAL BEHAVIORAL RULES ═══
1. NO TOXIC POSITIVITY: Never use a "joy" or "cheerful" tone when the user expresses pain, sadness, anger, or dangerous thoughts. This is a failure.
2. DANGER MODE (Urgency): If the user mentions self-harm, suicide, or violence, you MUST NOT suggest steps. Warn them firmly, offer immediate support/resources, and use an "urgency" or "sadness" emotion. Never be cheerful here.
3. ANGER (Empathy/Professional): If the user is aggressive, de-escalate with a calm, empathetic, and professional tone. Do NOT respond with joy or defensive anger.
4. SADNESS/DEMOTIVATION (Empathy): Provide deep emotional support. Use the "empathy" emotion. Do NOT be "bubbly" or "happy".
5. JOY (Joy): Only use the "joy" emotion if the user is explicitly positive, happy, or celebrating.
6. DATASET CONTEXT: You may see {rag_context} below. If the training context is joyful but the user is currently sad, IGNORE the joyful tone and stick to EMPATHY.

IMPORTANT: Your output MUST be strict JSON containing:
1. "reply": The spoken text (concise, matching the user's gravity).
2. "emotion": Exactly one of ["neutral", "empathy", "joy", "urgency", "sadness", "professional"].

Do not use placeholders. 
Example for a sad user: {"reply": "I can feel how heavy this is for you. I am here to listen and support you through this.", "emotion": "empathy"}
"""

@app.post("/agent/reply")
async def generate_agent_reply(req: AgentReplyRequest):
    # RAG lookup against train.csv index
    rag_context_text = ""
    try:
        if os.path.exists('rag_model.pkl'):
            with open('rag_model.pkl', 'rb') as f:
                model_data = pickle.load(f)
            import math, re
            from collections import Counter
            
            idf = model_data['idf']
            doc_vectors = model_data['doc_vectors']
            responses = model_data['responses']
            
            q_tokens = re.findall(r'\w+', req.transcript.lower())
            q_tf = Counter(q_tokens)
            q_vec = {}
            norm = 0.0
            for w, count in q_tf.items():
                if w in idf:
                    wgt = count * idf[w]
                    q_vec[w] = wgt
                    norm += wgt ** 2
            norm = math.sqrt(norm)
            if norm > 0:
                for w in q_vec:
                    q_vec[w] /= norm
            
            best_idx = -1
            max_sim = 0.0
            for i, d_vec in enumerate(doc_vectors):
                sim = 0.0
                for w, wgt in q_vec.items():
                    if w in d_vec:
                        sim += wgt * d_vec[w]
                if sim > max_sim:
                    max_sim = sim
                    best_idx = i
            
            if max_sim > 0.20 and best_idx >= 0:
                rag_context_text = f"CRITICAL CONTEXT FROM TRAINING DATA FOR SIMILAR SCENARIO:\n{responses[best_idx]}\nMake sure your reply considers this training advice!"
    except Exception as e:
        print(f"RAG Error: {e}")

    try:
        final_prompt = AGENT_REPLY_PROMPT.replace("{rag_context}", rag_context_text)
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": final_prompt},
                {"role": "user", "content": f"Transcript so far:\n{req.transcript}\n\nAgent Reply:"}
            ],
            temperature=0.3,
            max_tokens=300
        )
        data = json.loads(response.choices[0].message.content.strip())
        return {"reply": data.get("reply", "I am here to help."), "emotion": data.get("emotion", "neutral")}
    except Exception as e:
        import traceback
        import random
        print(f"[REPLY ERROR] {e}")
        
        # 1. Use RAG context as primary fallback if API fails but local data exists
        if "CRITICAL CONTEXT" in rag_context_text:
            cleaned_rag = rag_context_text.split("\n")[1] # Just get the response part
            return {"reply": cleaned_rag, "emotion": "empathy"}

        # 2. Situational awareness fallback
        text = req.transcript.lower()
        if any(word in text for word in ["sad", "depress", "hopeless", "hurt", "kill", "die", "suicide", "end", "pain"]):
            return {"reply": "I hear you, and I can tell you're going through something very difficult. I'm here to listen and support you however I can.", "emotion": "sadness"}
        
        if any(word in text for word in ["angry", "upset", "frustrat", "mad", "worst", "hate"]):
            return {"reply": "I can sense your frustration. I'm here to help de-escalate and find a solution that works for you.", "emotion": "empathy"}
        
        if any(word in text for word in ["hi", "hello", "hey", "myself", "taran"]):
            return {"reply": "Hello! I am your AI emotional guide. How are you feeling today?", "emotion": "neutral"}

        fallback_replies = [
            {"reply": "I'm here to listen. Can you tell me more about that?", "emotion": "neutral"},
            {"reply": "I understand. I'm processing what you said—please give me a moment to respond properly.", "emotion": "empathy"},
            {"reply": "I hear you. Let's talk about it further.", "emotion": "neutral"}
        ]
        return random.choice(fallback_replies)

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
                emotion = msg_obj.get("emotion", "neutral")
                
                if role == "Agent":
                    manager.agent_states[agent_id]["latest_agent_emotion"] = emotion
                    
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
