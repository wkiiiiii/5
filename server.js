const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files
app.use(express.static(__dirname));

// Reset game state whenever server starts
const gameState = {
  players: {},
  seats: {
    1: null,
    2: null
  },
  health: {
    1: 5,
    2: 5
  },
  hands: {
    1: [],
    2: []
  },
  playedCards: [],
  currentPlayer: null,
  gameStarted: false,
  deck: [],
  firstPlayer: null
};

// Card types
const CARD_TYPES = {
  GOLD: 'gold',
  WOOD: 'wood',
  WATER: 'water',
  FIRE: 'fire',
  EARTH: 'earth',
  MISS: 'miss'
};

// Initialize deck
function initializeDeck() {
  const deck = [];
  
  // Add 20 of each element card
  Object.keys(CARD_TYPES).forEach(type => {
    if (type !== 'MISS') {
      const cardType = CARD_TYPES[type];
      for (let i = 0; i < 20; i++) {
        deck.push({ 
          type: cardType,
          name: cardType.charAt(0).toUpperCase() + cardType.slice(1)
        });
      }
    }
  });
  
  // Add 10 miss cards
  for (let i = 0; i < 10; i++) {
    deck.push({ 
      type: CARD_TYPES.MISS,
      name: 'Miss'
    });
  }
  
  // Total should be 110 cards (20 * 5 elements + 10 miss)
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
  gameState.deck = deck; // Save the deck in game state
  
  const hands = {
    1: [],
    2: []
  };
  
  // Deal 5 cards to each player
  for (let i = 0; i < 5; i++) {
    hands[1].push(deck.pop());
    hands[2].push(deck.pop());
  }
  
  // Save hands in game state
  gameState.hands = hands;
  
  // Randomly choose first player
  const firstPlayer = Math.random() < 0.5 ? 1 : 2;
  gameState.currentPlayer = firstPlayer;
  
  return { hands, firstPlayer };
}

// Draw cards from the deck
function drawCards(seatNumber, count) {
  const drawnCards = [];
  
  // Check if we need to reshuffle
  if (gameState.deck.length < count) {
    gameState.deck = shuffleDeck(initializeDeck());
  }
  
  // Draw the specified number of cards
  for (let i = 0; i < count; i++) {
    if (gameState.deck.length > 0) {
      const card = gameState.deck.pop();
      drawnCards.push(card);
      gameState.hands[seatNumber].push(card);
    }
  }
  
  return drawnCards;
}

// Socket connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Send current game state to new connections
  socket.emit('gameState', {
    seats: gameState.seats,
    gameStarted: gameState.gameStarted,
    firstPlayer: gameState.firstPlayer
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
      name: playerName,
      health: 5 // Initialize player with 5 health
    };
    
    // Ensure player's health is set in the game state
    gameState.health[seatNumber] = 5;
    
    // Broadcast updated seats
    io.emit('updateSeats', gameState.seats);
    
    // Check if game can start
    checkGameStart();
  });
  
  // Handle player playing a card
  socket.on('playCard', (data) => {
    const { card, seatNumber } = data;
    const playerId = socket.id;
    
    // Verify it's this player's turn
    if (gameState.currentPlayer !== seatNumber) {
      return;
    }
    
    // Verify player is in this seat
    if (!gameState.seats[seatNumber] || gameState.seats[seatNumber].id !== playerId) {
      return;
    }
    
    // Add card to played cards
    gameState.playedCards.push(card);
    
    // Remove card from player's hand
    gameState.hands[seatNumber] = gameState.hands[seatNumber].filter(c => 
      !(c.type === card.type && c.name === card.name));
    
    // Notify the opponent
    const opponentSeat = seatNumber === 1 ? 2 : 1;
    if (gameState.seats[opponentSeat]) {
      io.to(gameState.seats[opponentSeat].id).emit('opponentPlayedCard', { card });
    }
    
    // Switch to opponent's turn
    gameState.currentPlayer = opponentSeat;
    
    // Notify players of turn change
    if (gameState.seats[opponentSeat]) {
      io.to(gameState.seats[opponentSeat].id).emit('changeTurn', { 
        nextPlayer: opponentSeat,
        drawnCards: []
      });
    }
    io.to(playerId).emit('changeTurn', { 
      nextPlayer: opponentSeat,
      drawnCards: []
    });
  });
  
  // Handle player passing their turn
  socket.on('passTurn', (data) => {
    const { seatNumber } = data;
    const playerId = socket.id;
    
    // Verify it's this player's turn
    if (gameState.currentPlayer !== seatNumber) {
      return;
    }
    
    // Verify player is in this seat
    if (!gameState.seats[seatNumber] || gameState.seats[seatNumber].id !== playerId) {
      return;
    }
    
    // Deduct health
    gameState.health[seatNumber]--;
    
    // Draw 3 cards
    const drawnCards = drawCards(seatNumber, 3);
    
    // Reset played cards
    gameState.playedCards = [];
    
    // Switch to opponent's turn
    const opponentSeat = seatNumber === 1 ? 2 : 1;
    gameState.currentPlayer = opponentSeat;
    
    // Notify opponent that this player passed
    if (gameState.seats[opponentSeat]) {
      io.to(gameState.seats[opponentSeat].id).emit('opponentPassed', { 
        seatNumber,
        health: gameState.health[seatNumber]
      });
    }
    
    // Notify players of turn change
    if (gameState.seats[opponentSeat]) {
      io.to(gameState.seats[opponentSeat].id).emit('changeTurn', { 
        nextPlayer: opponentSeat,
        drawnCards: []
      });
    }
    io.to(playerId).emit('changeTurn', { 
      nextPlayer: opponentSeat,
      drawnCards: drawnCards
    });
    
    // Check for game over (health <= 0)
    if (gameState.health[seatNumber] <= 0) {
      // Notify players of game over
      const gameOverData = {
        winner: opponentSeat,
        loser: seatNumber
      };
      io.emit('gameOver', gameOverData);
      
      // Reset game
      gameState.gameStarted = false;
      gameState.firstPlayer = null;
      gameState.currentPlayer = null;
      gameState.playedCards = [];
      gameState.health[1] = 5;
      gameState.health[2] = 5;
    }
  });
  
  // Handle player leaving a seat voluntarily
  socket.on('leaveSeat', (data) => {
    const { seatNumber } = data;
    
    // Make sure this player is actually in this seat
    if (gameState.players[socket.id] && gameState.players[socket.id].seatNumber === seatNumber) {
      // Free up the seat
      gameState.seats[seatNumber] = null;
      
      // Reset health
      gameState.health[seatNumber] = 5;
      
      // Clear hand
      gameState.hands[seatNumber] = [];
      
      // Remove player
      delete gameState.players[socket.id];
      
      // Reset game if it was started
      if (gameState.gameStarted) {
        gameState.gameStarted = false;
        gameState.firstPlayer = null;
        gameState.currentPlayer = null;
        gameState.playedCards = [];
      }
      
      console.log(`Player ${seatNumber} left the game voluntarily`);
      
      // Broadcast updated seats
      io.emit('updateSeats', gameState.seats);
      io.emit('playerDisconnected', { seatNumber });
    }
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Check if disconnected client was a player
    if (gameState.players[socket.id]) {
      const seatNumber = gameState.players[socket.id].seatNumber;
      
      // Free up the seat
      gameState.seats[seatNumber] = null;
      
      // Reset health
      gameState.health[seatNumber] = 5;
      
      // Remove player
      delete gameState.players[socket.id];
      
      // Reset game if it was started
      if (gameState.gameStarted) {
        gameState.gameStarted = false;
        gameState.firstPlayer = null;
        gameState.currentPlayer = null;
        gameState.playedCards = [];
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
      
      // Reset health to 5 for both players at the start of a new game
      gameState.health[1] = 5;
      gameState.health[2] = 5;
      
      // Clear played cards
      gameState.playedCards = [];
      
      // Notify clients that game is starting
      io.emit('gameStarting');
      
      // Deal cards with a small delay
      setTimeout(() => {
        const { hands, firstPlayer } = dealCards();
        
        // Save first player in game state
        gameState.firstPlayer = firstPlayer;
        gameState.currentPlayer = firstPlayer;
        
        // Send each player their own cards and who goes first
        Object.keys(gameState.seats).forEach(seatNumber => {
          const playerId = gameState.seats[seatNumber].id;
          const opponentSeat = seatNumber === '1' ? '2' : '1';
          
          io.to(playerId).emit('dealCards', { 
            yourCards: hands[seatNumber],
            opponentCards: hands[opponentSeat],
            opponentName: gameState.seats[opponentSeat].name,
            firstPlayer: firstPlayer,
            playerHealth: gameState.health[seatNumber],
            opponentHealth: gameState.health[opponentSeat]
          });
        });
        
        io.emit('gameStarted', { firstPlayer });
      }, 1000);
    }
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Game state reset - both seats are now available');
}); 