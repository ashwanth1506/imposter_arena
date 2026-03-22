const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");


const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET","POST"]
  }
});
const ROOM_LIFETIME = 60 * 60 * 1000; // 1 hour
const rooms = [];
const votingTimers = {}; // Store timeout IDs for each room
const VOTE_DURATION = 20000; // 20 seconds

const movies = require("./movie");   // ✅ correct for Node.js

io.on("connection",(socket)=>{

console.log("User connected:",socket.id);
const now = new Date();




/* CREATE ROOM */
socket.on("create_room",(data)=>{
const room=data.room;




const newRoom = {
  room:room + data.password + now.getSeconds(),
  name:room,
  password: data.password,
  admin: data.username,
  size: Number(data.size),
  players: [data.username],
  messages: [],
  currentsize: 0,
  turn: 0,
  cturn: 0,
  activeUsers: new Set(),
  started: false,
  movie: "",
  imposter: "",
  votes: {},
  leaderboard: {},
  votingStarted: false,
  voteResult: null,
  voteRoundId: 0
};
console.log(newRoom.room);

newRoom.leaderboard[data.username]=0;

rooms.push(newRoom);

socket.join(newRoom.room);
socket.emit('code',(newRoom))
io.to(data.room).emit("players_list",newRoom.players);

// 🔥 AUTO DELETE AFTER 1 HOUR
setTimeout(()=>{
  const index = rooms.findIndex(r=>r.room===data.room);

  if(index !== -1 && !rooms[index].started){
    io.to(data.room).emit("room_error","Room expired after 1 hour");
    rooms.splice(index,1);
    console.log(`Room "${data.room}" expired`);
  }

}, ROOM_LIFETIME);

});
/* JOIN ROOM */
socket.on("join_room",(data)=>{

const r = rooms.find(r=>r.room===data.room);

if(!r){
  socket.emit("join_error","Room not found");
  return;
}

// 🔥 CHECK IF PLAYER ALREADY EXISTS
const isExistingPlayer = r.players.includes(data.username);

// 🚨 BLOCK ONLY NEW PLAYERS AFTER GAME START
if(r.started && !isExistingPlayer){
  socket.emit("join_error","Game already started. Cannot join.");
  return;
}



// 🚫 ONLY CHECK SIZE FOR NEW PLAYERS
if(!isExistingPlayer && r.players.length >= r.size){
  socket.emit("join_error","Room Full");
  return;
}

// ✅ ADD ONLY IF NEW PLAYER
if(!isExistingPlayer){
  r.players.push(data.username);
  r.leaderboard[data.username]=0;
}

// ✅ ALWAYS JOIN SOCKET
socket.join(data.room);

socket.emit("join_success",{
  room:data.room,
  username:data.username
});

io.to(data.room).emit("players_list",r.players);

});
/* JOIN CHAT ROOM */
socket.on("join_chat_room",(data)=>{

const {room:roomName,user}=data;

const r=rooms.find(r=>r.room===roomName);

if(!r){
socket.emit("room_error","Room not found");
return;
}

if(!r.players.includes(user)){
socket.emit("room_error","Unauthorized user");
return;
}

if(r.activeUsers.size>=r.size && !r.activeUsers.has(user)){
socket.emit("room_error","Room Full");
return;
}

socket.join(roomName);

socket.username=user;
socket.room=roomName;

socket.emit("chat_history",r.messages);

socket.emit("game_state",{
started:r.started,
movie:r.movie,
imposter:r.imposter,
leaderboard:r.leaderboard,
votingStarted:r.votingStarted
});

if(r.voteResult){
socket.emit("vote_result",r.voteResult);
}

/* 🔥 TIMER SYNC FIX */
if(r.votingStarted){
  // Only send voting_started if the player hasn't already voted
  if(!r.votes || !r.votes[user]){
    const remaining=Math.max(
      0,
      Math.ceil((r.voteDuration-(Date.now()-r.voteStartTime))/1000)
    );
    console.log(`[REJOIN] ${user} joining voting room - sending voting_started (${remaining}s remaining)`);
    socket.emit("voting_started", { remaining, voteRoundId: r.voteRoundId });
  } else {
    console.log(`[REJOIN] ${user} already voted in this round, not showing vote UI`);
  }
}

if(!r.activeUsers.has(user)){
r.activeUsers.add(user);
}

r.currentsize=r.activeUsers.size;

io.to(roomName).emit("players_list",r.players);

io.to(roomName).emit("sendMessagevalid",{
tu:r.players[r.turn],
ctu:r.cturn,
si:r.currentsize,
ac:r.size,
ad:r.admin
});

});

/* SEND MESSAGE */
socket.on("send_message",(data)=>{

const r=rooms.find(r=>r.room===data.room);
if(!r) return;

r.messages.push(data);

io.to(data.room).emit("receive_message",data);

r.turn=(r.turn+1)%r.players.length;
r.cturn++;

io.to(data.room).emit("sendMessagevalid",{
tu:r.players[r.turn],
ctu:r.cturn,
si:r.currentsize,
ac:r.size,
ad:r.admin
});

});

/* START GAME */
socket.on("start_game",(roomName)=>{

const r=rooms.find(r=>r.room===roomName);
if(!r) return;

// Clear any pending voting timer from previous round
if(votingTimers[roomName]){
clearTimeout(votingTimers[roomName]);
delete votingTimers[roomName];
}

r.started=true;
r.voteRoundId++; // Increment round ID to invalidate old voting

r.movie=movies[Math.floor(Math.random()*movies.length)];
r.imposter=r.players[Math.floor(Math.random()*r.players.length)];
r.messages.length=0;

r.turn=0;
r.cturn=0;
r.votes={};
r.voteResult=null;
r.votingStarted=false;
r.voteStartTime=null; // Reset timing
r.voteDuration=null;

io.to(roomName).emit("game_started",{
movie:r.movie,
imposter:r.imposter,
leaderboard:r.leaderboard
});

});

/* START VOTING */
socket.on("start_voting",(roomName)=>{

const r=rooms.find(r=>r.room===roomName);
if(!r) return;

if(r.votingStarted) return;

r.votingStarted=true;
r.voteStartTime=Date.now(); // Record when voting started
r.voteDuration=20000; // 20 second voting duration
r.voteRoundId++; // Increment to invalidate any pending timeouts from previous rounds

const currentRoundId = r.voteRoundId;

r.voteStartTime = Date.now();
io.to(roomName).emit("voting_started", { remaining: 20, voteRoundId: r.voteRoundId });

const timeoutId = setTimeout(()=>{
if(r.voteRoundId !== currentRoundId) return;
const result={};

let correctVotes=0;
let wrongVotes=0;

Object.entries(r.votes).forEach(([voter,voted])=>{

const correct=voted===r.imposter;

result[voter]={voted,correct};

if(correct) correctVotes++;
else wrongVotes++;

});

const imposterwin=correctVotes<=wrongVotes;
console.log("Votes:", r.votes);
console.log("Imposter:", r.imposter);
console.log("Votes:", r.votes);
console.log("Imposter:", r.imposter);

if(imposterwin){

  r.leaderboard[r.imposter] += 5;

  Object.entries(result).forEach(([voter,data])=>{
    if(data.correct && voter !== r.imposter){
      r.leaderboard[voter] += 3; // 👈 reward smart player (exclude imposter)
    } else {
      r.leaderboard[voter] += 0;
    }
  });

}else{

Object.entries(result).forEach(([voter,data])=>{
  if(data.correct && voter !== r.imposter){
    r.leaderboard[voter] += 3;
  }
});


}

r.voteResult={
votes:result,
imposter:r.imposter,
imposterwin,
leaderboard:r.leaderboard
};

r.votingStarted=false;
r.voteStartTime=null; // Clear vote start time
r.voteDuration=null;

io.to(roomName).emit("vote_result",r.voteResult);

r.votes={};

},VOTE_DURATION);

votingTimers[roomName] = timeoutId;

});

/* SUBMIT VOTE */
socket.on("vote_imposter",(data)=>{

const {room,voter,voted}=data;

const r=rooms.find(r=>r.room===room);
if(!r) return;

r.votes[voter]=voted;
console.log(`[VOTE] ${voter} voted for ${voted} (Round: ${r.voteRoundId})`);

});
/* END GAME */
/* END GAME */
socket.on("end_game",(roomName)=>{

const index = rooms.findIndex(r=>r.room===roomName);
if(index === -1) return;

const r = rooms[index];

// 🔥 CALCULATE WINNER
const sorted = Object.entries(r.leaderboard)
.sort((a,b)=>b[1]-a[1]);

const winner = sorted[0];
const runners = sorted.slice(1);

// 🔥 SEND FINAL RESULT
io.to(roomName).emit("game_ended",{
winner,
runners,
leaderboard:r.leaderboard
});

// 🧹 CLEAR ANY VOTING TIMER
if(votingTimers[roomName]){
clearTimeout(votingTimers[roomName]);
delete votingTimers[roomName];
}

// 🗑️ DELETE ROOM AFTER SMALL DELAY (IMPORTANT)
setTimeout(()=>{

const i = rooms.findIndex(r=>r.room===roomName);
if(i !== -1){
  rooms.splice(i,1);
  console.log(`Room "${roomName}" deleted after game end`);
}

},6000); // ⏳ wait for animation

});

/* DISCONNECT (REFRESH SAFE) */
socket.on("disconnect",()=>{

if(!socket.room || !socket.username) return;

const r=rooms.find(r=>r.room===socket.room);
if(!r) return;



setTimeout(()=>{

const stillGone=!r.activeUsers.has(socket.username);

if(!stillGone) return;

r.players=r.players.filter(p=>p!==socket.username);

if(socket.username===r.admin){

io.to(socket.room).emit("admin_left",{
leaderboard:r.leaderboard,
adminName:r.admin
});

if(votingTimers[socket.room]){
clearTimeout(votingTimers[socket.room]);
delete votingTimers[socket.room];
}

const index=rooms.findIndex(room=>room.room===socket.room);
if(index!==-1){
rooms.splice(index,1);
}

return;
}

io.to(socket.room).emit("players_list",r.players);

},3000);

});

});


const PORT = process.env.PORT || 3000;

server.listen(PORT,()=>{
  console.log("Server running on port", PORT);
});
