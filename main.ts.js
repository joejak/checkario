import { handler } from "./build/handler.js";
import express from "express";
import { Server } from "socket.io";
import { createServer } from "node:http";

const app = express();
app.use(handler);
const server = createServer(app);
const io = new Server(server);

app.get("/healthcheck", (req, res) => {
  res.end("ok");
});

console.log('setting up socket io');
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.join('room1');
  socket.on('game-action', (msg) => {
    console.log(msg);
    socket.to('room1').emit('game-action', msg);
  })
})

server.listen(3000, () => {
  console.log("Server startup on port 3000");
});
