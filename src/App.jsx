import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ─── Costanti ────────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = "sanremo2025";

const BONUS_LIST = [
  { id: "occhiali", label: "👓 Occhiali da sole in call", points: 10 },
  { id: "nomina",   label: "🎤 Nomina il FantaSanremo NTT in call", points: 10 },
  { id: "testo",    label: "🎵 Cita un testo di Sanremo in una frase", points: 30 },
];

const MALUS_LIST = [
  { id: "frase_generica", label: '🗣️ Dice "Capiamo" / "Fisso uno slot" / "Ho il calendar aggiornato" / "Aggiungo un bit" / "Vedete lo schermo"', points: -10 },
  { id: "monica_bolla",   label: '💥 Monica dice "Mettiamo in bolla" — -30 a chi era in call', points: -30 },
  { id: "foglia",         label: "😏 Subisce l'ironia di Antonio Foglia nella chat", points: -10 },
];

const ALL_ACTIONS = [...BONUS_LIST, ...MALUS_LIST];
const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];

// ─── Helpers punteggio ───────────────────────────────────────────────────────

function calcParticipantScore(pid, participants, scores) {
  const p = participants.find(x => x.id === pid);
  if (!p) return 0;
  return scores
    .filter(s => s.participant_id === pid)
    .reduce((sum, s) => {
      const action = ALL_ACTIONS.find(a => a.id === s.action_id);
      if (!action) return sum;
      return sum + (p.is_capitan ? action.points * 2 : action.points);
    }, 0);
}

function calcTeamScore(teamId, participants, scores) {
  return participants
    .filter(p => p.team_id === teamId)
    .reduce((sum, p) => sum + calcParticipantScore(p.id, participants, scores), 0);
}

function calcDayScore(pid, day, participants, scores) {
  const p = participants.find(x => x.id === pid);
  if (!p) return 0;
  return scores
    .filter(s => s.participant_id === pid && s.day === day)
    .reduce((sum, s) => {
      const action = ALL_ACTIONS.find(a => a.id === s.action_id);
      if (!action) return sum;
      return sum + (p.is_capitan ? action.points * 2 : action.points);
    }, 0);
}

function hasScore(scores, pid, day, actionId) {
  return scores.some(s => s.participant_id === pid && s.day === day && s.action_id === actionId);
}

// ─── Sfondo stellato ─────────────────────────────────────────────────────────

function StarBg() {
  const [stars] = useState(() =>
    [...Array(60)].map(() => ({
      w: Math.random() * 3 + 1,
      top: Math.random() * 100,
      left: Math.random() * 100,
      opacity: Math.random() * 0.8 + 0.2,
      dur: Math.random() * 3 + 2,
      delay: Math.random() * 3,
      hue: Math.random() * 60 + 280,
    }))
  );
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none", background:"linear-gradient(135deg,#0a0015 0%,#1a0030 40%,#0d001a 100%)" }}>
      {stars.map((s, i) => (
        <div key={i} style={{ position:"absolute", width:s.w, height:s.w, background:`hsl(${s.hue},80%,80%)`, borderRadius:"50%", top:s.top+"%", left:s.left+"%", opacity:s.opacity, animation:`twinkle ${s.dur}s ease-in-out ${s.delay}s infinite alternate` }} />
      ))}
    </div>
  );
}

// ─── Modal login ─────────────────────────────────────────────────────────────

function LoginModal({ mode, onClose, onSuccess, teams }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [currentMode, setCurrentMode] = useState(mode);

  const handleLogin = () => {
    if (currentMode === "admin") {
      if (input === ADMIN_PASSWORD) onSuccess("admin", null);
      else setError("Password errata!");
    } else {
      const matched = teams.find(t => t.password && t.password === input);
      if (matched) onSuccess("capitano", matched.id);
      else setError("Password non valida o team non trovato.");
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(6px)" }} onClick={onClose}>
      <div style={{ background:"#140028", border:"1px solid rgba(255,107,193,.35)", borderRadius:20, padding:32, width:380, maxWidth:"90vw" }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:44, marginBottom:8 }}>{currentMode==="admin"?"🔐":"👑"}</div>
          <div style={{ color:"white", fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700 }}>{currentMode==="admin"?"Super Admin":"Accesso Capitano"}</div>
          <div style={{ color:"rgba(255,255,255,.4)", fontFamily:"'DM Sans',sans-serif", fontSize:13, marginTop:6 }}>
            {currentMode==="admin"?"Accesso completo a tutti i team":"Inserisci la password del tuo team"}
          </div>
        </div>
        <input className="inp" type="password" placeholder="Password..." value={input}
          onChange={e => { setInput(e.target.value); setError(""); }}
          onKeyDown={e => e.key==="Enter" && handleLogin()}
          style={{ marginBottom: error ? 6 : 16 }} autoFocus />
        {error && <div style={{ color:"#ff4757", fontFamily:"'DM Sans',sans-serif", fontSize:13, marginBottom:8 }}>{error}</div>}
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={handleLogin}>Accedi</button>
        </div>
        <div style={{ marginTop:16, textAlign:"center" }}>
          {currentMode==="capitano"
            ? <button style={{ background:"none", border:"none", color:"rgba(255,255,255,.35)", fontFamily:"'DM Sans',sans-serif", fontSize:12, cursor:"pointer", textDecoration:"underline" }} onClick={() => { setCurrentMode("admin"); setInput(""); setError(""); }}>Sei l'admin? Accedi qui</button>
            : <button style={{ background:"none", border:"none", color:"rgba(255,255,255,.35)", fontFamily:"'DM Sans',sans-serif", fontSize:12, cursor:"pointer", textDecoration:"underline" }} onClick={() => { setCurrentMode("capitano"); setInput(""); setError(""); }}>Sei un capitano? Accedi qui</button>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Classifica ──────────────────────────────────────────────────────────────

function ClassificaSection({ participants, teams, scores, sortedParticipants }) {
  const [expandedPid, setExpandedPid] = useState(null);
  const [expandedDay, setExpandedDay]   = useState(null);

  const togglePid = pid => { setExpandedPid(p => p===pid ? null : pid); setExpandedDay(null); };
  const toggleDay = (e, key) => { e.stopPropagation(); setExpandedDay(d => d===key ? null : key); };

  return (
    <div>
      <div style={{ textAlign:"center", fontSize:28, marginBottom:6, color:"white", fontFamily:"'Playfair Display',serif", fontWeight:700 }}>🏆 Classifica Generale</div>
      <div style={{ textAlign:"center", color:"rgba(255,255,255,.4)", fontFamily:"'DM Sans',sans-serif", fontSize:13, marginBottom:24 }}>
        Clicca su un nome per vedere il dettaglio giornaliero
      </div>

      {sortedParticipants.map((p, i) => {
        const team  = teams.find(t => t.id === p.team_id);
        const score = calcParticipantScore(p.id, participants, scores);
        const isOpen = expandedPid === p.id;
        const rankBg = i===0 ? "linear-gradient(135deg,#ffd700,#f5a623)" : i===1 ? "linear-gradient(135deg,#c0c0c0,#a0a0a0)" : i===2 ? "linear-gradient(135deg,#cd7f32,#a0522d)" : "rgba(255,255,255,.1)";
        const rankColor = i<3 ? "#0a0015" : "rgba(255,255,255,.5)";

        return (
          <div key={p.id} style={{ marginBottom:8 }}>
            <div onClick={() => togglePid(p.id)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius: isOpen ? "12px 12px 0 0" : "12px", background: isOpen ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.04)", border:`1px solid ${isOpen ? (team?.color||"rgba(255,255,255,.2)")+"88" : "rgba(255,255,255,.07)"}`, borderBottom: isOpen ? "none" : undefined, cursor:"pointer", userSelect:"none" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:rankBg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize: i===0?18:14, color:rankColor, flexShrink:0 }}>{i===0?"👑":i+1}</div>
              <div style={{ width:6, height:40, borderRadius:3, background:team?.color||"#888", flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ color:"white", fontWeight:600, fontFamily:"'DM Sans',sans-serif", fontSize:15 }}>{p.name}{p.is_capitan && <span style={{ fontSize:12, marginLeft:6 }}>👑</span>}</div>
                <div style={{ color:"rgba(255,255,255,.4)", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>{team?.name||"—"}</div>
              </div>
              <div style={{ fontSize:24, fontWeight:900, fontFamily:"'Playfair Display',serif", color: score>0?"#2ed573":score<0?"#ff4757":"rgba(255,255,255,.4)" }}>{score>0?"+":""}{score}</div>
              <div style={{ color:"rgba(255,255,255,.3)", fontSize:16, transition:"transform .25s", transform: isOpen?"rotate(180deg)":"rotate(0deg)", flexShrink:0 }}>▾</div>
            </div>

            {isOpen && (
              <div style={{ background:"rgba(255,255,255,.06)", border:`1px solid ${team?.color||"rgba(255,255,255,.1)"}55`, borderTop:"none", borderRadius:"0 0 12px 12px", overflow:"hidden" }}>
                {DAYS.map((day, di) => {
                  const dayScore   = calcDayScore(p.id, day, participants, scores);
                  const dayActions = ALL_ACTIONS.filter(a => hasScore(scores, p.id, day, a.id));
                  const isDayOpen  = expandedDay === `${p.id}_${day}`;
                  const hasSome    = dayActions.length > 0;
                  return (
                    <div key={day} style={{ borderBottom: di<DAYS.length-1 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                      <div onClick={hasSome ? e => toggleDay(e, `${p.id}_${day}`) : undefined}
                        style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 18px", cursor: hasSome?"pointer":"default", background: isDayOpen?"rgba(255,255,255,.05)":"transparent", userSelect:"none" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background: hasSome?(dayScore>=0?"#2ed573":"#ff4757"):"rgba(255,255,255,.15)", flexShrink:0 }} />
                        <div style={{ flex:1, color: hasSome?"white":"rgba(255,255,255,.35)", fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight: hasSome?500:400 }}>{day}</div>
                        <div style={{ fontWeight:700, fontFamily:"'Playfair Display',serif", fontSize:16, color: dayScore>0?"#2ed573":dayScore<0?"#ff4757":"rgba(255,255,255,.25)" }}>{dayScore!==0?(dayScore>0?`+${dayScore}`:dayScore):"—"}</div>
                        {hasSome && <div style={{ color:"rgba(255,255,255,.3)", fontSize:13, transition:"transform .2s", transform: isDayOpen?"rotate(180deg)":"rotate(0deg)" }}>▾</div>}
                      </div>
                      {isDayOpen && hasSome && (
                        <div style={{ padding:"4px 18px 12px 38px", display:"flex", flexDirection:"column", gap:6 }}>
                          {dayActions.map(action => {
                            const pts = p.is_capitan ? action.points*2 : action.points;
                            const isBonus = action.points > 0;
                            return (
                              <div key={action.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, background: isBonus?"rgba(46,213,115,.08)":"rgba(255,71,87,.08)", border:`1px solid ${isBonus?"rgba(46,213,115,.2)":"rgba(255,71,87,.2)"}` }}>
                                <div style={{ width:6, height:6, borderRadius:"50%", background: isBonus?"#2ed573":"#ff4757", flexShrink:0 }} />
                                <span style={{ flex:1, color:"rgba(255,255,255,.8)", fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>{action.label}</span>
                                <span style={{ fontWeight:700, fontFamily:"'Playfair Display',serif", fontSize:14, color: isBonus?"#2ed573":"#ff4757", whiteSpace:"nowrap" }}>{pts>0?`+${pts}`:pts} pt{p.is_capitan?" ×2":""}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {sortedParticipants.length === 0 && (
        <div style={{ textAlign:"center", color:"rgba(255,255,255,.3)", fontFamily:"'DM Sans',sans-serif", padding:"40px 0" }}>Nessun partecipante ancora.</div>
      )}
    </div>
  );
}

// ─── Pannello punteggi ───────────────────────────────────────────────────────

function ScoringPanel({ participants, teams, scores, toggleScore, allowedTeamId, selectedDay, setSelectedDay, loading }) {
  const visible = allowedTeamId ? participants.filter(p => p.team_id === allowedTeamId) : participants;
  const [selPid, setSelPid] = useState(visible[0]?.id || "");

  useEffect(() => {
    if (!visible.find(p => p.id === selPid)) setSelPid(visible[0]?.id || "");
  }, [allowedTeamId, participants.length]);

  const current = visible.find(p => p.id === selPid);
  const team    = current ? teams.find(t => t.id === current.team_id) : null;
  const ps      = current ? calcParticipantScore(current.id, participants, scores) : 0;

  return (
    <div>
      <div className="label">Giornata</div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
        {DAYS.map(d => <button key={d} className={`day-btn ${selectedDay===d?"active":""}`} onClick={() => setSelectedDay(d)}>{d}</button>)}
      </div>

      <div className="label">Partecipante</div>
      <select className="inp" value={selPid} onChange={e => setSelPid(e.target.value)} style={{ marginBottom:16 }}>
        {visible.map(p => (
          <option key={p.id} value={p.id} style={{ background:"#1a0030" }}>
            {p.is_capitan ? "👑 " : ""}{p.name} — {calcParticipantScore(p.id, participants, scores)>0?"+":""}{calcParticipantScore(p.id, participants, scores)} pt
          </option>
        ))}
      </select>

      {current && (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, padding:"10px 14px", borderRadius:10, background:`${team?.color||"#888"}18`, border:`1px solid ${team?.color||"#888"}44` }}>
            <div style={{ width:8, height:38, borderRadius:4, background:team?.color||"#888", flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ color:"white", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>{current.is_capitan?"👑 ":""}{current.name}</div>
              <div style={{ color:"rgba(255,255,255,.4)", fontFamily:"'DM Sans',sans-serif", fontSize:12 }}>{team?.name}{current.is_capitan?" · punti doppi":""} · {selectedDay}</div>
            </div>
            <div style={{ fontSize:22, fontWeight:900, fontFamily:"'Playfair Display',serif", color: ps>=0?"#2ed573":"#ff4757" }}>{ps>0?"+":""}{ps}</div>
          </div>

          <div style={{ color:"#2ed573", fontFamily:"'DM Sans',sans-serif", fontSize:12, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>🟢 Bonus</div>
          {BONUS_LIST.map(action => {
            const active = hasScore(scores, current.id, selectedDay, action.id);
            const pts    = current.is_capitan ? action.points*2 : action.points;
            return (
              <button key={action.id} className={`action-toggle ${active?"active-bonus":"inactive"}`} style={{ marginBottom:8, width:"100%", opacity: loading?"0.5":"1" }}
                onClick={() => !loading && toggleScore(current.id, selectedDay, action.id)}>
                <span style={{ fontSize:18 }}>{active?"✅":"⬜"}</span>
                <span style={{ flex:1 }}>{action.label}</span>
                <span style={{ fontWeight:700, whiteSpace:"nowrap" }}>{active?`+${pts}`:`+${action.points}`} pt</span>
              </button>
            );
          })}

          <div style={{ color:"#ff4757", fontFamily:"'DM Sans',sans-serif", fontSize:12, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, marginTop:18 }}>🔴 Malus</div>
          {MALUS_LIST.map(action => {
            const active = hasScore(scores, current.id, selectedDay, action.id);
            const pts    = current.is_capitan ? action.points*2 : action.points;
            return (
              <button key={action.id} className={`action-toggle ${active?"active-malus":"inactive"}`} style={{ marginBottom:8, width:"100%", opacity: loading?"0.5":"1" }}
                onClick={() => !loading && toggleScore(current.id, selectedDay, action.id)}>
                <span style={{ fontSize:18 }}>{active?"✅":"⬜"}</span>
                <span style={{ flex:1 }}>{action.label}</span>
                <span style={{ fontWeight:700, whiteSpace:"nowrap" }}>{active?pts:action.points} pt</span>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── Admin panel ─────────────────────────────────────────────────────────────

function AdminPanel({ participants, teams, scores, toggleScore, reload, selectedDay, setSelectedDay, loading }) {
  const [tab, setTab] = useState("punteggi");
  const [newName, setNewName]           = useState("");
  const [newTeamId, setNewTeamId]       = useState(teams[0]?.id || "");
  const [newIsCapitan, setNewIsCapitan] = useState(false);
  const [newTeamName, setNewTeamName]   = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#ff6bc1");
  const [teamPasswords, setTeamPasswords] = useState({});
  const [savedFeedback, setSavedFeedback] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTeamPasswords(Object.fromEntries(teams.map(t => [t.id, t.password || ""])));
  }, [teams]);

  const addParticipant = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    const id = "p" + Date.now();
    await supabase.from("participants").insert({ id, name: newName.trim(), team_id: newTeamId, is_capitan: newIsCapitan });
    setNewName(""); setNewIsCapitan(false);
    await reload();
    setBusy(false);
  };

  const removeParticipant = async (pid) => {
    setBusy(true);
    await supabase.from("participants").delete().eq("id", pid);
    await reload();
    setBusy(false);
  };

  const addTeam = async () => {
    if (!newTeamName.trim()) return;
    setBusy(true);
    const id = "t" + Date.now();
    await supabase.from("teams").insert({ id, name: newTeamName.trim(), color: newTeamColor, password: "" });
    setNewTeamName("");
    await reload();
    setBusy(false);
  };

  const removeTeam = async (tid) => {
    setBusy(true);
    await supabase.from("teams").delete().eq("id", tid);
    await reload();
    setBusy(false);
  };

  const updateTeamPassword = async (teamId) => {
    setBusy(true);
    await supabase.from("teams").update({ password: teamPasswords[teamId] || "" }).eq("id", teamId);
    setSavedFeedback(p => ({ ...p, [teamId]: true }));
    setTimeout(() => setSavedFeedback(p => ({ ...p, [teamId]: false })), 2000);
    await reload();
    setBusy(false);
  };

  const resetAll = async () => {
    if (!window.confirm("⚠️ Cancelli TUTTI i punteggi. Continuare?")) return;
    setBusy(true);
    await supabase.from("scores").delete().neq("id", 0);
    await reload();
    setBusy(false);
  };

  const tabs = [
    { id:"punteggi",     label:"📊 Punteggi" },
    { id:"partecipanti", label:"👤 Partecipanti" },
    { id:"team",         label:"👥 Team" },
    { id:"password",     label:"🔑 Password" },
  ];

  return (
    <div>
      <div style={{ textAlign:"center", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,107,193,.12)", border:"1px solid rgba(255,107,193,.35)", borderRadius:20, padding:"6px 18px", fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#ff6bc1" }}>
          🔐 Super Admin — accesso completo
        </div>
        <button className="btn btn-danger" style={{ fontSize:12, padding:"6px 14px" }} onClick={resetAll} disabled={busy}>
          🗑️ Reset punteggi
        </button>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:24 }}>
        {tabs.map(t => <button key={t.id} className={`day-btn ${tab===t.id?"active":""}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {tab==="punteggi" && (
        <div className="card">
          <ScoringPanel participants={participants} teams={teams} scores={scores} toggleScore={toggleScore} allowedTeamId={null} selectedDay={selectedDay} setSelectedDay={setSelectedDay} loading={loading} />
        </div>
      )}

      {tab==="partecipanti" && (
        <div>
          <div className="card" style={{ marginBottom:20 }}>
            <div style={{ color:"white", fontFamily:"'DM Sans',sans-serif", fontWeight:600, marginBottom:14 }}>Aggiungi partecipante</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <input className="inp" placeholder="Nome e Cognome" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex:2, minWidth:140 }} onKeyDown={e => e.key==="Enter" && addParticipant()} />
              <select className="inp" value={newTeamId} onChange={e => setNewTeamId(e.target.value)} style={{ flex:1, minWidth:120 }}>
                {teams.map(t => <option key={t.id} value={t.id} style={{ background:"#1a0030" }}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, margin:"10px 0" }}>
              <input type="checkbox" id="cap" checked={newIsCapitan} onChange={e => setNewIsCapitan(e.target.checked)} />
              <label htmlFor="cap" style={{ color:"rgba(255,255,255,.7)", fontFamily:"'DM Sans',sans-serif", fontSize:14, cursor:"pointer" }}>👑 È capitano (punti doppi)</label>
            </div>
            <button className="btn btn-primary" onClick={addParticipant} disabled={busy}>Aggiungi</button>
          </div>
          {participants.map(p => {
            const team = teams.find(t => t.id === p.team_id);
            const ps   = calcParticipantScore(p.id, participants, scores);
            return (
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", marginBottom:8 }}>
                <div style={{ width:6, height:32, borderRadius:3, background:team?.color||"#888", flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ color:"white", fontFamily:"'DM Sans',sans-serif", fontSize:14 }}>{p.is_capitan?"👑 ":""}{p.name}</div>
                  <div style={{ color:"rgba(255,255,255,.4)", fontFamily:"'DM Sans',sans-serif", fontSize:12 }}>{team?.name}</div>
                </div>
                <div style={{ color: ps>=0?"#2ed573":"#ff4757", fontWeight:700, fontFamily:"'Playfair Display',serif", fontSize:16 }}>{ps>0?"+":""}{ps}</div>
                <button className="btn btn-danger" style={{ padding:"6px 12px", fontSize:12 }} onClick={() => removeParticipant(p.id)} disabled={busy}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {tab==="team" && (
        <div>
          <div className="card" style={{ marginBottom:20 }}>
            <div style={{ color:"white", fontFamily:"'DM Sans',sans-serif", fontWeight:600, marginBottom:14 }}>Aggiungi team</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <input className="inp" placeholder="Nome del team" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} style={{ flex:1 }} onKeyDown={e => e.key==="Enter" && addTeam()} />
              <input type="color" value={newTeamColor} onChange={e => setNewTeamColor(e.target.value)} style={{ width:50, height:42, border:"none", borderRadius:10, cursor:"pointer", background:"none" }} />
            </div>
            <button className="btn btn-primary" style={{ marginTop:10 }} onClick={addTeam} disabled={busy}>Crea Team</button>
          </div>
          {teams.map(team => {
            const members = participants.filter(p => p.team_id === team.id);
            return (
              <div key={team.id} style={{ padding:14, borderRadius:12, background:"rgba(255,255,255,.04)", border:`1px solid ${team.color}33`, marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: members.length?10:0 }}>
                  <div style={{ width:14, height:14, borderRadius:"50%", background:team.color, flexShrink:0 }} />
                  <div style={{ color:"white", fontFamily:"'DM Sans',sans-serif", fontWeight:600, flex:1 }}>{team.name}</div>
                  <div style={{ color:"rgba(255,255,255,.4)", fontFamily:"'DM Sans',sans-serif", fontSize:12 }}>{members.length} membri</div>
                  <button className="btn btn-danger" style={{ padding:"4px 10px", fontSize:12 }} onClick={() => removeTeam(team.id)} disabled={busy}>✕</button>
                </div>
                {members.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {members.map(m => (
                      <span key={m.id} style={{ background:"rgba(255,255,255,.06)", borderRadius:6, padding:"3px 10px", fontSize:12, color:"rgba(255,255,255,.7)", fontFamily:"'DM Sans',sans-serif" }}>
                        {m.is_capitan?"👑 ":""}{m.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab==="password" && (
        <div>
          <div style={{ color:"rgba(255,255,255,.5)", fontFamily:"'DM Sans',sans-serif", fontSize:13, marginBottom:20, background:"rgba(255,255,255,.04)", borderRadius:10, padding:"12px 16px", border:"1px solid rgba(255,255,255,.08)" }}>
            💡 Imposta la password per ogni capitano. Lascia vuoto per disabilitare l'accesso.
          </div>
          {teams.map(team => {
            const capitan = participants.find(p => p.team_id===team.id && p.is_capitan);
            const saved   = savedFeedback[team.id];
            return (
              <div key={team.id} className="card" style={{ marginBottom:14, borderColor:team.color+"44" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:team.color }} />
                  <div style={{ color:"white", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>{team.name}</div>
                  {capitan && <div style={{ color:"rgba(255,255,255,.4)", fontFamily:"'DM Sans',sans-serif", fontSize:12, marginLeft:"auto" }}>👑 {capitan.name}</div>}
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <input className="inp" type="text" placeholder="Password capitano..." value={teamPasswords[team.id]||""}
                    onChange={e => setTeamPasswords(p => ({ ...p, [team.id]: e.target.value }))}
                    onKeyDown={e => e.key==="Enter" && updateTeamPassword(team.id)}
                    style={{ flex:1 }} />
                  <button className="btn btn-primary" onClick={() => updateTeamPassword(team.id)} disabled={busy} style={{ whiteSpace:"nowrap" }}>
                    {saved ? "✅ Salvata" : "Salva"}
                  </button>
                </div>
                {team.password && !saved && <div style={{ marginTop:8, fontSize:12, color:"#2ed573", fontFamily:"'DM Sans',sans-serif" }}>✅ Password attiva</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── App principale ───────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage]               = useState("classifica");
  const [isAdmin, setIsAdmin]         = useState(false);
  const [capitanoTeamId, setCapitanoTeamId] = useState(null);
  const [showLogin, setShowLogin]     = useState(false);
  const [loginMode, setLoginMode]     = useState("capitano");

  const [teams, setTeams]               = useState([]);
  const [participants, setParticipants] = useState([]);
  const [scores, setScores]             = useState([]);
  const [loadingData, setLoadingData]   = useState(true);
  const [scoreLoading, setScoreLoading] = useState(false);

  // ── Fetch da Supabase ──
  const reload = useCallback(async () => {
    const [{ data: t }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("participants").select("*"),
      supabase.from("scores").select("*"),
    ]);
    if (t) setTeams(t);
    if (p) setParticipants(p);
    if (s) setScores(s);
    setLoadingData(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Realtime: aggiorna classifica se qualcun altro cambia i punteggi
  useEffect(() => {
    const channel = supabase
      .channel("scores-realtime")
      .on("postgres_changes", { event:"*", schema:"public", table:"scores" }, () => reload())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [reload]);

  // ── Toggle punteggio ──
  const toggleScore = async (pid, day, actionId) => {
    setScoreLoading(true);
    const existing = scores.find(s => s.participant_id===pid && s.day===day && s.action_id===actionId);
    if (existing) {
      await supabase.from("scores").delete().eq("id", existing.id);
    } else {
      await supabase.from("scores").insert({ participant_id: pid, day, action_id: actionId });
    }
    await reload();
    setScoreLoading(false);
  };

  const handleLoginSuccess = (role, teamId) => {
    if (role==="admin") { setIsAdmin(true); setCapitanoTeamId(null); setPage("admin"); }
    else { setCapitanoTeamId(teamId); setIsAdmin(false); setPage("capitano"); }
    setShowLogin(false);
  };

  const handleLogout = () => { setIsAdmin(false); setCapitanoTeamId(null); setPage("classifica"); };

  const [selectedDay, setSelectedDay] = useState("Lunedì");

  const sortedParticipants = [...participants].sort((a,b) => calcParticipantScore(b.id,participants,scores) - calcParticipantScore(a.id,participants,scores));
  const sortedTeams        = [...teams].sort((a,b) => calcTeamScore(b.id,participants,scores) - calcTeamScore(a.id,participants,scores));
  const capitanoTeam       = teams.find(t => t.id===capitanoTeamId);

  const navItems = [
    { id:"classifica", label:"🏆 Classifica" },
    { id:"team",       label:"👥 Team" },
    { id:"regolamento",label:"📋 Regolamento" },
    ...(capitanoTeamId ? [{ id:"capitano", label:"👑 Il mio team", special:"capitan" }] : []),
    ...(isAdmin        ? [{ id:"admin",    label:"🔐 Super Admin", special:"admin"   }] : []),
  ];

  // ── CSS globale ──
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    @keyframes twinkle{from{opacity:.2;transform:scale(.8)}to{opacity:1;transform:scale(1.2)}}
    @keyframes glow{0%,100%{text-shadow:0 0 20px #ff6bc1,0 0 40px #ff6bc1}50%{text-shadow:0 0 40px #ff6bc1,0 0 80px #f5a623}}
    @keyframes slideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .nav-btn{background:none;border:2px solid rgba(255,255,255,.2);color:rgba(255,255,255,.7);padding:8px 18px;border-radius:30px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;transition:all .3s;letter-spacing:.04em}
    .nav-btn:hover{border-color:#ff6bc1;color:#ff6bc1}
    .nav-btn.active{background:linear-gradient(135deg,#ff6bc1,#f5a623);border-color:transparent;color:white;font-weight:600}
    .nav-btn.cap{border-color:rgba(245,166,35,.5);color:#f5a623}
    .nav-btn.cap.active{background:linear-gradient(135deg,#f5a623,#ff6bc1)}
    .nav-btn.adm{border-color:rgba(255,107,193,.4);color:#ff6bc1}
    .nav-btn.adm.active{background:linear-gradient(135deg,#9b59b6,#ff6bc1)}
    .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;backdrop-filter:blur(10px);padding:20px}
    .inp{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:10px 14px;color:white;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;width:100%}
    .inp:focus{border-color:#ff6bc1}
    .inp::placeholder{color:rgba(255,255,255,.4)}
    .btn{border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;transition:all .2s}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .btn-primary{background:linear-gradient(135deg,#ff6bc1,#f5a623);color:white}
    .btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 20px rgba(255,107,193,.4)}
    .btn-danger{background:rgba(220,50,50,.2);border:1px solid rgba(220,50,50,.4);color:#ff6b6b}
    .btn-ghost{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.8)}
    .action-toggle{width:100%;text-align:left;padding:12px 16px;border-radius:10px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;transition:all .2s;display:flex;align-items:center;gap:10px}
    .action-toggle.active-bonus{background:rgba(46,213,115,.2);border:1px solid rgba(46,213,115,.5);color:#2ed573}
    .action-toggle.active-malus{background:rgba(255,71,87,.2);border:1px solid rgba(255,71,87,.5);color:#ff4757}
    .action-toggle.inactive{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.5)}
    .action-toggle.inactive:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.8)}
    .day-btn{padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.2);background:none;color:rgba(255,255,255,.6);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;transition:all .2s}
    .day-btn.active{background:linear-gradient(135deg,#ff6bc1,#f5a623);border-color:transparent;color:white;font-weight:600}
    .day-btn:hover:not(.active){border-color:#ff6bc1;color:#ff6bc1}
    .label{font-family:'DM Sans',sans-serif;font-size:12px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
    select.inp option{background:#1a0030}
    .spinner{width:40px;height:40px;border:3px solid rgba(255,107,193,.2);border-top-color:#ff6bc1;border-radius:50%;animation:spin 0.8s linear infinite}
  `;

  // ── Loading screen ──
  if (loadingData) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#0a0015,#1a0030)" }}>
      <style>{css}</style>
      <StarBg />
      <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
        <div className="spinner" style={{ margin:"0 auto 20px" }} />
        <div style={{ color:"rgba(255,255,255,.5)", fontFamily:"'DM Sans',sans-serif" }}>Caricamento in corso…</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", position:"relative", fontFamily:"'Playfair Display',Georgia,serif" }}>
      <style>{css}</style>
      <StarBg />

      {/* Header */}
      <div style={{ position:"relative", zIndex:1, textAlign:"center", padding:"32px 20px 0" }}>
        <div style={{ fontSize:11, letterSpacing:"0.35em", color:"#f5a623", fontFamily:"'DM Sans',sans-serif", marginBottom:8, textTransform:"uppercase" }}>NTT DATA CONSULTING</div>
        <h1 style={{ fontSize:"clamp(36px,8vw,72px)", fontWeight:900, lineHeight:1, background:"linear-gradient(135deg,#ff6bc1 0%,#f5a623 50%,#ff6bc1 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"glow 3s ease-in-out infinite", fontFamily:"'Playfair Display',serif" }}>
          FantaSanremo
        </h1>
        <div style={{ fontSize:14, color:"rgba(255,255,255,.45)", fontFamily:"'DM Sans',sans-serif", marginTop:6 }}>L'edizione interna che nessuno ha chiesto ma tutti aspettavano 🎤</div>

        {/* Nav */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginTop:22, marginBottom:6 }}>
          {navItems.map(n => (
            <button key={n.id} className={`nav-btn ${n.special==="capitan"?"cap":n.special==="admin"?"adm":""} ${page===n.id?"active":""}`} onClick={() => setPage(n.id)}>{n.label}</button>
          ))}
          {!isAdmin && !capitanoTeamId && (
            <>
              <button className="nav-btn cap" onClick={() => { setLoginMode("capitano"); setShowLogin(true); }}>👑 Capitano</button>
              <button className="nav-btn adm" onClick={() => { setLoginMode("admin"); setShowLogin(true); }}>🔐 Admin</button>
            </>
          )}
          {(isAdmin || capitanoTeamId) && (
            <button className="nav-btn" style={{ borderColor:"rgba(255,71,87,.4)", color:"#ff4757" }} onClick={handleLogout}>🚪 Esci</button>
          )}
        </div>

        {capitanoTeamId && !isAdmin && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${capitanoTeam?.color}1a`, border:`1px solid ${capitanoTeam?.color}55`, borderRadius:20, padding:"4px 14px", marginTop:6, fontFamily:"'DM Sans',sans-serif", fontSize:12, color:capitanoTeam?.color }}>
            👑 Accesso capitano · {capitanoTeam?.name}
          </div>
        )}
        {isAdmin && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,107,193,.1)", border:"1px solid rgba(255,107,193,.3)", borderRadius:20, padding:"4px 14px", marginTop:6, fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#ff6bc1" }}>
            🔐 Modalità Super Admin
          </div>
        )}
      </div>

      {/* Contenuto */}
      <div style={{ position:"relative", zIndex:1, maxWidth:900, margin:"0 auto", padding:"24px 16px 80px" }}>

        {page==="classifica" && (
          <ClassificaSection participants={participants} teams={teams} scores={scores} sortedParticipants={sortedParticipants} />
        )}

        {page==="team" && (
          <div>
            <div style={{ textAlign:"center", fontSize:28, marginBottom:6, color:"white", fontFamily:"'Playfair Display',serif", fontWeight:700 }}>👥 Classifica Team</div>
            <div style={{ textAlign:"center", color:"rgba(255,255,255,.4)", fontFamily:"'DM Sans',sans-serif", fontSize:13, marginBottom:28 }}>Il punteggio del team è la somma di tutti i suoi componenti</div>
            {sortedTeams.length >= 2 && (
              <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:10, marginBottom:32 }}>
                {[1,0,2].map(rank => {
                  if (!sortedTeams[rank]) return null;
                  const team = sortedTeams[rank];
                  const score = calcTeamScore(team.id, participants, scores);
                  const emojis = ["🥈","🏆","🥉"];
                  const labels = ["2° POSTO","1° POSTO","3° POSTO"];
                  const heights = [70,100,50];
                  const isFirst = rank===0;
                  return (
                    <div key={team.id} style={{ textAlign:"center", flex:1, maxWidth: isFirst?220:190 }}>
                      <div style={{ fontSize: isFirst?36:26, marginBottom:6, animation: isFirst?"pulse 2s ease-in-out infinite":"none" }}>{emojis[rank]}</div>
                      <div style={{ background:`linear-gradient(180deg,${team.color}${isFirst?"55":"28"} 0%,rgba(255,255,255,.03) 100%)`, border:`${isFirst?2:1}px solid ${team.color}${isFirst?"":"55"}`, borderRadius:"12px 12px 0 0", padding: isFirst?"18px 14px":"14px 10px", borderBottom:"none", boxShadow: isFirst?`0 0 28px ${team.color}33`:"none" }}>
                        <div style={{ fontSize:10, color: isFirst?"#f5a623":"rgba(255,255,255,.4)", fontFamily:"'DM Sans',sans-serif", marginBottom:4, letterSpacing:"0.1em" }}>{isFirst?"👑 ":""}{labels[rank]}</div>
                        <div style={{ color:"white", fontWeight: isFirst?800:700, fontFamily:"'DM Sans',sans-serif", fontSize: isFirst?14:12, marginBottom:8 }}>{team.name}</div>
                        <div style={{ fontSize: isFirst?28:22, fontWeight:900, color: score>=0?"#2ed573":"#ff4757", fontFamily:"'Playfair Display',serif" }}>{score>0?"+":""}{score}</div>
                      </div>
                      <div style={{ height:heights[rank], borderRadius:"0 0 8px 8px", border:`1px solid ${team.color}33`, borderTop:"none", background: isFirst?"rgba(255,215,0,.07)":"rgba(255,255,255,.03)" }} />
                    </div>
                  );
                })}
              </div>
            )}
            {sortedTeams.map((team, i) => {
              const members = [...participants.filter(p => p.team_id===team.id)].sort((a,b) => calcParticipantScore(b.id,participants,scores)-calcParticipantScore(a.id,participants,scores));
              const teamScore = calcTeamScore(team.id, participants, scores);
              const medals = ["🥇","🥈","🥉"];
              return (
                <div key={team.id} className="card" style={{ marginBottom:14, borderColor:team.color+"55", borderWidth: i===0?2:1, boxShadow: i===0?`0 0 24px ${team.color}1a`:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${team.color}22` }}>
                    <div style={{ fontSize: i<3?26:18 }}>{i<3?medals[i]:`#${i+1}`}</div>
                    <div style={{ width:6, height:46, borderRadius:3, background:`linear-gradient(180deg,${team.color},${team.color}44)`, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ color:"white", fontWeight:800, fontFamily:"'DM Sans',sans-serif", fontSize:16 }}>{team.name}</div>
                      <div style={{ color:"rgba(255,255,255,.4)", fontSize:12, fontFamily:"'DM Sans',sans-serif", marginTop:2 }}>{members.length} partecipant{members.length===1?"e":"i"}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:28, fontWeight:900, color: teamScore>=0?"#2ed573":"#ff4757", fontFamily:"'Playfair Display',serif", lineHeight:1 }}>{teamScore>0?"+":""}{teamScore}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", fontFamily:"'DM Sans',sans-serif", marginTop:2 }}>punti totali</div>
                    </div>
                  </div>
                  {members.length===0 ? (
                    <div style={{ color:"rgba(255,255,255,.3)", fontFamily:"'DM Sans',sans-serif", fontSize:13, textAlign:"center" }}>Nessun membro</div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {members.map((p, mi) => {
                        const ps  = calcParticipantScore(p.id, participants, scores);
                        const pct = Math.abs(teamScore)>0 ? Math.min(100, Math.abs(ps/Math.abs(teamScore))*100) : 0;
                        return (
                          <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)" }}>
                            <div style={{ width:22, height:22, borderRadius:"50%", background: mi===0?`linear-gradient(135deg,${team.color},${team.color}88)`:"rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color: mi===0?"#0a0015":"rgba(255,255,255,.4)", fontWeight:700, flexShrink:0, fontFamily:"'DM Sans',sans-serif" }}>{mi+1}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                                <span style={{ color:"rgba(255,255,255,.85)", fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>{p.is_capitan&&"👑 "}{p.name}</span>
                                {p.is_capitan && <span style={{ fontSize:10, background:"rgba(245,166,35,.2)", border:"1px solid rgba(245,166,35,.4)", color:"#f5a623", borderRadius:4, padding:"1px 5px", fontFamily:"'DM Sans',sans-serif" }}>×2</span>}
                              </div>
                              <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,.08)", overflow:"hidden" }}>
                                <div style={{ height:"100%", width:pct+"%", background: ps>=0?`linear-gradient(90deg,${team.color},#2ed573)`:"linear-gradient(90deg,#ff4757,#ff6b6b)", borderRadius:2, transition:"width .6s" }} />
                              </div>
                            </div>
                            <div style={{ fontSize:14, fontWeight:700, color: ps>0?"#2ed573":ps<0?"#ff4757":"rgba(255,255,255,.4)", fontFamily:"'Playfair Display',serif", whiteSpace:"nowrap" }}>{ps>0?"+":""}{ps}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {page==="regolamento" && (
          <div>
            <div style={{ textAlign:"center", fontSize:28, marginBottom:24, color:"white", fontFamily:"'Playfair Display',serif", fontWeight:700 }}>📋 Regolamento</div>
            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ color:"#f5a623", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:16, marginBottom:12 }}>👑 Capitani</div>
              {["Il capitano è il Tech Lead o PM del team. In alternativa, eletto per vox populi.","I bonus/malus del capitano valgono il DOPPIO.","Il capitano inserisce i punteggi giornalieri del suo team nell'apposita sezione.","Deadline iscrizione: 23 febbraio ore 18:00."].map((r,i) => (
                <div key={i} style={{ display:"flex", gap:10, marginBottom:8, fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"rgba(255,255,255,.8)" }}>
                  <span style={{ color:"#f5a623", flexShrink:0 }}>•</span>{r}
                </div>
              ))}
            </div>
            <div className="card" style={{ marginBottom:14, borderColor:"rgba(46,213,115,.3)" }}>
              <div style={{ color:"#2ed573", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:16, marginBottom:12 }}>🟢 Bonus</div>
              {BONUS_LIST.map(b => (
                <div key={b.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"rgba(255,255,255,.8)", gap:12 }}>
                  <span>{b.label}</span><span style={{ color:"#2ed573", fontWeight:700, whiteSpace:"nowrap" }}>+{b.points} pt</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ marginBottom:14, borderColor:"rgba(255,71,87,.3)" }}>
              <div style={{ color:"#ff4757", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:16, marginBottom:12 }}>🔴 Malus</div>
              {MALUS_LIST.map(m => (
                <div key={m.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"rgba(255,255,255,.8)", gap:12 }}>
                  <span>{m.label}</span><span style={{ color:"#ff4757", fontWeight:700, whiteSpace:"nowrap" }}>{m.points} pt</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ borderColor:"rgba(245,166,35,.3)" }}>
              <div style={{ color:"#f5a623", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:16, marginBottom:12 }}>📌 Regole Importanti</div>
              {["Bonus e malus sono validi una sola volta per giornata per persona.","Il FantaCall è attivo dalle 9:00 alle 18:00 durante la settimana di Sanremo.","I punteggi vengono inseriti dai capitani nella sezione dedicata."].map((r,i) => (
                <div key={i} style={{ display:"flex", gap:10, marginBottom:8, fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"rgba(255,255,255,.8)" }}>
                  <span style={{ color:"#f5a623", flexShrink:0 }}>•</span>{r}
                </div>
              ))}
            </div>
          </div>
        )}

        {page==="capitano" && capitanoTeamId && (
          <div>
            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:44, marginBottom:10 }}>👑</div>
              <div style={{ fontSize:26, color:"white", fontFamily:"'Playfair Display',serif", fontWeight:700, marginBottom:8 }}>Area Capitano</div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${capitanoTeam?.color}1a`, border:`1px solid ${capitanoTeam?.color}55`, borderRadius:20, padding:"6px 18px", fontFamily:"'DM Sans',sans-serif", fontSize:14, color:capitanoTeam?.color }}>
                {capitanoTeam?.name}
              </div>
              <div style={{ color:"rgba(255,255,255,.4)", fontFamily:"'DM Sans',sans-serif", fontSize:13, marginTop:12 }}>
                Inserisci i bonus e malus per i membri del tuo team, giorno per giorno.
              </div>
            </div>
            <div className="card">
              <ScoringPanel participants={participants} teams={teams} scores={scores} toggleScore={toggleScore} allowedTeamId={capitanoTeamId} selectedDay={selectedDay} setSelectedDay={setSelectedDay} loading={scoreLoading} />
            </div>
          </div>
        )}

        {page==="admin" && isAdmin && (
          <AdminPanel participants={participants} teams={teams} scores={scores} toggleScore={toggleScore} reload={reload} selectedDay={selectedDay} setSelectedDay={setSelectedDay} loading={scoreLoading} />
        )}

      </div>

      {showLogin && <LoginModal mode={loginMode} teams={teams} onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
    </div>
  );
}