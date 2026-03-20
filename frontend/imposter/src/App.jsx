import { BrowserRouter, Routes, Route } from "react-router-dom";
import CreateRoom from "./CreateRoom";
import Room from "./Room";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateRoom />} />
        <Route path="/chat/:roomName/:name" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;