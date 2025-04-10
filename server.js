const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files
app.use(express.static(__dirname));

// Game state
const gameState = {
  players: {},
  seats: {
    1: null,
    2: null
  },
  gameStarted: false,
  deck: []
};

// Card suits and values
const suits = ['♥', '♦', '♠', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Initialize deck
function initializeDeck() {
  const deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push({ 
        suit, 
        value, 
        color: (suit === '♥' || suit === '♦') ? 'red' : 'black' 
      });
    }
  }
  return shuffleDeck(deck);
}

// Shuffle deck using Fisher-Yates algorithm
function shuffleDeck(deck) {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

// Deal cards
function dealCards() {
  const deck = initializeDeck();
  const hands = {
    1: [],
    2: []
  };
  
  // Deal 5 cards to each player
  for (let i = 0; i < 5; i++) {
    hands[1].push(deck.pop());
    hands[2].push(deck.pop());
  }
  
  return hands;
}

// Socket connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Send current game state to new connections
  socket.emit('gameState', {
    seats: gameState.seats,
    gameStarted: gameState.gameStarted
  });
  
  // Handle player joining a seat
  socket.on('joinSeat', (data) => {
    const { seatNumber, playerName } = data;
    
    // Check if seat is available
    if (gameState.seats[seatNumber] !== null) {
      socket.emit('seatTaken');
      return;
    }
    
    // Assign player to seat
    gameState.seats[seatNumber] = {
      id: socket.id,
      name: playerName
    };
    
    // Store player info
    gameState.players[socket.id] = {
      seatNumber,
      name: playerName
    };
    
    // Broadcast updated seats
    io.emit('updateSeats', gameState.seats);
    
    // Check if game can start
    checkGameStart();
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Check if disconnected client was a player
    if (gameState.players[socket.id]) {
      const seatNumber = gameState.players[socket.id].seatNumber;
      
      // Free up the seat
      gameState.seats[seatNumber] = null;
      
      // Remove player
      delete gameState.players[socket.id];
      
      // Reset game if it was started
      if (gameState.gameStarted) {
        gameState.gameStarted = false;
      }
      
      // Broadcast updated seats
      io.emit('updateSeats', gameState.seats);
      io.emit('playerDisconnected', { seatNumber });
    }
  });
  
  // Check if game can start
  function checkGameStart() {
    if (gameState.seats[1] && gameState.seats[2] && !gameState.gameStarted) {
      gameState.gameStarted = true;
      
      // Notify clients that game is starting
      io.emit('gameStarting');
      
      // Deal cards with a small delay
      setTimeout(() => {
        const hands = dealCards();
        
        // Send each player their own cards
        Object.keys(gameState.seats).forEach(seatNumber => {
          const playerId = gameState.seats[seatNumber].id;
          io.to(playerId).emit('dealCards', { 
            yourCards: hands[seatNumber],
            opponentCards: hands[seatNumber === '1' ? '2' : '1'],
            opponentName: gameState.seats[seatNumber === '1' ? '2' : '1'].name
          });
        });
        
        io.emit('gameStarted');
      }, 1000);
    }
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 