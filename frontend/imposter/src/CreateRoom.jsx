import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import './App.css';

const socket = io("https://imposter-arena.onrender.com", {
  transports: ["websocket"]
});

function CreateRoom() {
  const [showRules, setShowRules] = useState(false);
  const navigate = useNavigate();
  
  // Create Room State
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [noperson, setnopernson] = useState("");
  
  // Join Room State
  const [pname, psetName] = useState("");
  const [pusername, psetUsername] = useState("");

  const createRoom = () => {
    if(!name || !password || !username || !noperson ){
      alert("⚠️ Please fill all fields");
      return;
    }
    if(noperson>12){
      alert("⚠️ atmost 12 player is allowed");
      return;

    }
    const roomData = {
      room: name,
      password: password,
      username: username,
      size: noperson,
      isadmin: true
    };
    socket.emit("create_room", roomData);
  };

  const joinRoom = () => {
    if(!pname || !pusername){
      alert("⚠️ Please fill all fields");
      return;
    }
    const joinData = {
      room: pname,
      username: pusername,
      isadmin: false
    };
    socket.emit("join_room", joinData);
  };

  useEffect(() => {
    socket.on('code',(data)=>{
      navigate(`/chat/${data.room}/${username}`);
    });

    socket.on("join_success",(data)=>{
      navigate(`/chat/${data.room}/${data.username}`);
    });

    socket.on("join_error",(msg)=>{
      alert(msg);
    });

    return () => socket.off();
  }, [navigate, username]);

  return (
    <div id="page">
      {/* Background Decor - Random Floating Beans */}
      <div className="floating-crew" style={{top: '10%', left: '10%', animation: 'starsMove 20s infinite alternate'}}>🏃‍♂️</div>
      <div className="floating-crew" style={{bottom: '15%', right: '10%', animation: 'starsMove 25s infinite alternate-reverse'}}>🏃‍♀️</div>

      <button className="infoBtn" onClick={()=>setShowRules(true)} style={{position: 'fixed', top: '20px', right: '20px', background: 'transparent', color: '#555', border: '1px solid #555', width: '40px'}}>
        i
      </button>

      {showRules && (
        <div className="rulesOverlay" onClick={() => setShowRules(false)}>
          <div className="rulesBox" onClick={e => e.stopPropagation()}>
            <h2 style={{color: 'var(--text-yellow)'}}>🎮 HOW TO PLAY</h2>
            <ul style={{textAlign: 'left', lineHeight: '1.6'}}>
              <li>👥 Join with friends (Room size: 3-10)</li>
              <li>🎬 Each round features a secret Movie name.</li>
              <li>😈 One player is the **Imposter** (doesn't know the movie).</li>
              <li>💬 Chat clues to prove you're not the imposter.</li>
              <li>🗳 Vote out the sus player at the end of the round!</li>
            </ul>

            <h3 style={{color: 'var(--text-yellow)', marginTop: '20px'}}>🏆 POINT DISTRIBUTION</h3>
            <ul style={{textAlign: 'left', lineHeight: '1.8', fontSize: '0.9em'}}>
              <li>💰 <strong>Imposter Wins:</strong> Imposter gets <span style={{color: '#00ff00'}}>+5 XP</span></li>
              <li>🎯 <strong>Crew Wins (Voted Imposter):</strong> Each correct voter gets <span style={{color: '#00ff00'}}>+3 XP</span></li>
              <li>❌ <strong>Wrong Vote:</strong> Incorrect voters get <span style={{color: '#ff6b6b'}}>0 XP</span></li>
              <li>😈 <strong>Imposter Exposed:</strong> Imposter voted out gets <span style={{color: '#ff6b6b'}}>0 XP</span></li>
            </ul>

            <button onClick={()=>setShowRules(false)} style={{background: 'var(--imposter-red)', color: 'white', marginTop: '15px'}}>GOT IT</button>
          </div>
        </div>
      )}

      <h1 className="hh">Imposter Arena</h1>

      <div className="container">
        {/* CREATE CARD */}
        <div className="card">
          <h1>CREATE MISSION</h1>
          <div className="form-row">
            <h5>Room name</h5>
            <input placeholder="Ex: Skeld-2024" onChange={(e)=>setName(e.target.value)} />
          </div>
          <div className="form-row">
            <h5>Security Password</h5>
            <input type="password" placeholder="****" onChange={(e)=>setPassword(e.target.value)} />
          </div>
          <div className="form-row">
            <h5>Admin Username</h5>
            <input placeholder="Captain Name" onChange={(e)=>setUsername(e.target.value)} />
          </div>
          <div className="form-row">
            <h5>Max Crewmates</h5>
            <input type="number" placeholder="4" onChange={(e)=>setnopernson(e.target.value)} />
          </div>
          <button onClick={createRoom}>INITIATE 🚀</button>
        </div>

        {/* JOIN CARD */}
        <div className="card">
          <h1>JOIN MISSION</h1>
          <div className="form-row">
            <h5>Room Code</h5>
            <input placeholder="Enter Room Name" onChange={(e)=>psetName(e.target.value)} />
          </div>
          <div className="form-row">
            <h5>Your Username</h5>
            <input placeholder="Crewmate Name" onChange={(e)=>psetUsername(e.target.value)} />
          </div>
          <button onClick={joinRoom} style={{background: 'var(--imposter-red)', color: 'white'}}>JOIN 🎮</button>
        </div>
      </div>

      <h2 id="ak">A project by Ashwanth • 2026 Space Expedition</h2>
    </div>
  );
}

export default CreateRoom;
