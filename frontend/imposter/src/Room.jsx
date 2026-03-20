import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useParams, useNavigate } from "react-router-dom";
import sendMp3 from "./assets/send.mp3";
import tickMp3 from "./assets/tick.mp3";
import "./room.css";
import StarsBackground from "./components/StarsBackground";


const socket = io("https://imposter-arena.onrender.com");

function Room() {
  const sendSound = new Audio(sendMp3);
  const tickAudio = useRef(new Audio(tickMp3));
  const votingTimerRef = useRef(null);

  const { roomName, name } = useParams();
  const navigate = useNavigate();

  // State
  const [players, setPlayers] = useState([]);
  const [showFinal, setShowFinal] = useState(false);
  const [vote, setVote] = useState("");
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);
  const [voteTime, setVoteTime] = useState(20);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [valid, setValid] = useState("");
  const [size, setSize] = useState(0);
  const [asize, setAsize] = useState(0);
  const [click, setClick] = useState(0);
  const [turn, setTurn] = useState(0);
  const [admin, setAdmin] = useState("");
  const [imposter, setImposter] = useState("");
  const [movie, setMovie] = useState("");
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState({});
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isShuffling, setIsShuffling] = useState(false);

  const crewColors = ["red", "blue", "green", "pink", "orange", "yellow", "black", "white", "purple", "brown"];

  const send = () => {
    if (message.trim() === "" || valid !== name) return;
    sendSound.currentTime = 0;
    sendSound.play().catch(() => {});
    socket.emit("send_message", { room: roomName, user: name, message });
    setMessage("");
  };
  const endGame=()=>{

socket.emit("end_game",roomName);
};

  useEffect(() => {
    socket.emit("join_chat_room", { room: roomName, user: name });
    socket.on("room_error",(msg)=>{
alert(msg);
navigate("/");
});

    // Reset voting state on reconnect
    socket.on("connect", () => {
      setVoting(false);
      setVote("");
      setVoteSubmitted(false);
    });

    socket.on("chat_history", (history) => setMessages(history));

    socket.on("game_state", (data) => {
      if (data.started) {
        setClick(1);
        setMovie(data.movie);
        setImposter(data.imposter);
        if (data.cturn !== undefined) setTurn(data.cturn);
      }
      // Always reset voting state when game state is received
      setVoting(false);
      setVote("");
      setVoteSubmitted(false);
      setLeaderboard(data.leaderboard || {});
    });

    socket.on("players_list", setPlayers);

    socket.on("game_started", (data) => {
      setIsShuffling(true); // Start animation
      setLoadingGame(true);
      setTimeout(() => {
        setIsShuffling(false); // End animation after 5s
        setClick(1); setMovie(data.movie); setImposter(data.imposter); setMessages([]);
        setTurn(0); setResult(null); setVoting(false); setVote(""); setVoteSubmitted(false);
        setLeaderboard(data.leaderboard || {});
        setLoadingGame(false);
      }, 5000);
    });

    socket.on("sendMessagevalid", (data) => {
      setTurn(data.ctu); setValid(data.tu); setSize(data.si); setAsize(data.ac); setAdmin(data.ad);
    });

    socket.on("receive_message", (msg) => setMessages((prev) => [...prev, msg]));

    socket.on("voting_started", () => {
      setVoting(true); setVoteTime(20); setVote(""); setVoteSubmitted(false);
      tickAudio.current.loop = true;
      tickAudio.current.play().catch(() => {});
      votingTimerRef.current = setInterval(() => {
        setVoteTime((prev) => {
          if (prev <= 1) { 
            clearInterval(votingTimerRef.current); 
            tickAudio.current.pause();
            tickAudio.current.currentTime = 0;
            return 0; 
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on("vote_result", (data) => {
      setResult(data); setVoting(false); setLeaderboard(data.leaderboard || {});
      clearInterval(votingTimerRef.current);
      tickAudio.current.pause();
      tickAudio.current.currentTime = 0;
    });

    socket.on("game_ended", (data) => {
      setGameEnded(true); setWinner(data.winner); setLeaderboard(data.leaderboard);
      setShowFinal(true);
      setTimeout(() => navigate("/"), 6000); // Navigation after 5s leaderboard display
    });

    socket.on("disconnect", () => {
      setVoting(false);
      setVote("");
      setVoteSubmitted(false);
    });

    return () => {
      socket.off();
      clearInterval(votingTimerRef.current);
      tickAudio.current.pause();
    };
  }, [roomName, name, navigate]);

  useEffect(() => {
    if (click === 1 && turn >= 2 * asize && !result) {
      socket.emit("start_voting", roomName);
    }
  }, [turn, asize, click, result, roomName]);

 if(size !== asize){
  return (
    <div id="loadingScreen">

      <h1 className="loadingTitle">🎮 Waiting for Players...</h1>
      <h1 className="loadingTitl">Room Code:{roomName}</h1>
      <div className="playerSlots">
  {Array.from({length: asize}).map((_,i)=>(
    <div key={i} className={`slot ${players[i] ? "filled":""}`}>
      {players[i] || "Empty..."}
    </div>
  ))}
</div>

      <div className="dots">
        <span>.</span><span>.</span><span>.</span>
      </div>

    </div>
  );
}
if(showFinal){
  return(
    <div id="finalScreen">

      <h1 className="winnerTitle">🏆 WINNER</h1>

      <div className="winnerBox">
        <h2>{winner[0]}</h2>
        <p>{winner[1]} pts</p>
      </div>

      <div className="finalList">

        {Object.entries(leaderboard)
        .sort((a,b)=>b[1]-a[1])
        .map(([player,score],i)=>{

          let cls="";
          if(i===0) cls="gold";
          else if(i===1) cls="silver";
          else if(i===2) cls="bronze";

          return(
            <div key={player} className={`finalCard ${cls}`}>
              <span>#{i+1}</span>
              <span>{player}</span>
              <span>{score}</span>
            </div>
          );
        })}

      </div>

    </div>
  );
}

if(loadingGame){
  return(
    <div id="gameLoading">

      <h1 className="glitch">🎮 Starting Game...</h1>

      <div className="loaderText">
        <p>🎬 Selecting Movie...</p>
        <p>😈 Choosing Imposter...</p>
        <p>⚡ Syncing Players...</p>
      </div>

      <div className="scanBar"></div>

    </div>
  );
}

  return (
    <>
      <StarsBackground />
      <div className="game-container space-bg">

        {/* VOTING MODULE (TOP LEFT) */}
      {voting && !voteSubmitted && (
        <div className="vote-module top-left">
          <div className="lb-header">EJECT CREWMATE?</div>
          <div className="vote-grid">
            {players.filter((p) => p !== name).map((p) => (
              <button key={p} className={`vote-btn ${vote === p ? "selected-radio" : ""}`} onClick={() => setVote(p)}>
                <span className="radio-circle"></span> {p}
              </button>
            ))}
          </div>
          <button className="submit-vote" disabled={!vote} onClick={() => { setVoteSubmitted(true); socket.emit("vote_imposter", { room: roomName, voter: name, voted: vote }); }}>
            CONFIRM EJECTION
          </button>
        </div>
      )}

      {/* LEADERBOARD (TOP RIGHT) */}
      <div className="leaderboard-panel">
        <div className="lb-header">CREW STATUS</div>
        <div className="lb-body">
          {Object.entries(leaderboard).sort((a,b)=>b[1]-a[1]).map(([player, score]) => (
            <div key={player} className="rank-item">
              <span className="player-name">{player}</span>
              <span className="player-score">{score} XP</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stage">
        <div className="round-table">
          <div className="table-inner">
             {isShuffling ? (
               <div className="shuffle-overlay">
                 <div className="shuffling-text">CHOOSING ROLES...</div>
               </div>
             ) : click === 1 && (
               <div className={`center-info ${name === imposter ? "is-imposter" : ""}`}>
                  <p className="role-label">{name === imposter ? "IMPOSTER" : "MOVIE"}</p>
                  <h2 className="role-value">{name === imposter ? "???" : movie}</h2>
                  {voting && <div className="voting-timer-inner">{voteTime}s</div>}
               </div>
             )}
          </div>
        </div>

        {players.map((p, i) => {
          const angle = (i * 360) / asize;
          const radius = 240;
          const lastMsg = [...messages].reverse().find((m) => m.user === p);
          const colorClass = crewColors[i % crewColors.length];

          return (
            <div key={p} className={`crew-wrapper ${p === valid ? "speaking" : ""}`}
              style={{ transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)` }}>
              {lastMsg && (
                <div className="speech-bubble">
                  <p>{lastMsg.message}</p>
                </div>
              )}
              <div className={`crewmate ${colorClass}`}>
                <div className="backpack"></div>
                <div className="body"><div className="visor"></div></div>
                <div className="name-tag">{p}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM LEFT: ALIGNED INPUT & TRANSMIT */}
      <div className="bottom-controls">
        {click === 1 && turn < 2 * asize && !result && (
          <div className="input-row">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={valid !== name}
              placeholder={valid === name ? "Type clue..." : `Waiting...`}
            />
            <button id="send-btn" onClick={send} disabled={valid !== name}>Send</button>
          </div>
        )}
      </div>

      {/* BOTTOM RIGHT: ADMIN ACTIONS */}
      <div className="bottom-right-actions">
        {name === admin && (
          <>
            {click === 0 ? (
              <button className="action-btn start-btn" onClick={() => socket.emit("start_game", roomName)}>START</button>
            ) : (
              <button className="action-btn end-btn" onClick={endGame}>END GAME</button>
            )}
            {result && !gameEnded && (
              <button className="action-btn next-btn" onClick={() => socket.emit("start_game", roomName)}>NEXT ROUND</button>
            )}
          </>
        )}
      </div>

      {showFinal && (
        <div className="overlay final">
          <h1>🏆 MISSION COMPLETE</h1>
          <div className="final-ranks">
            {Object.entries(leaderboard).sort((a,b)=>b[1]-a[1]).map(([player, score], i) => (
              <div key={player} className="final-rank-item">#{i+1} {player}: {score} XP</div>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default Room;
