document.addEventListener('DOMContentLoaded', () => {
    // Connect to the server with Socket.io
    const socket = io();
    
    // Game state
    const gameState = {
        playerSeat: null,
        playerName: null,
        gameStarted: false
    };

    // DOM elements
    const join1Button = document.getElementById('join1');
    const join2Button = document.getElementById('join2');
    const player1Name = document.getElementById('player1-name');
    const player2Name = document.getElementById('player2-name');
    const gameStatus = document.getElementById('game-status');
    const player1Cards = document.getElementById('player1-cards');
    const player2Cards = document.getElementById('player2-cards');

    // Join seat event handlers
    join1Button.addEventListener('click', () => joinSeat(1));
    join2Button.addEventListener('click', () => joinSeat(2));

    function joinSeat(seatNumber) {
        // Automatically generate player name
        const playerName = `Player ${seatNumber}`;
        
        // Save the player info locally
        gameState.playerSeat = seatNumber;
        gameState.playerName = playerName;
        
        // Emit join seat event to server
        socket.emit('joinSeat', {
            seatNumber,
            playerName
        });
    }

    // Create card HTML element
    function createCardElement(card, container) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.color}`;
        
        const valueElement = document.createElement('div');
        valueElement.className = 'card-value';
        valueElement.textContent = card.value;
        
        const suitElement = document.createElement('div');
        suitElement.className = 'card-suit';
        suitElement.textContent = card.suit;
        
        cardElement.appendChild(valueElement);
        cardElement.appendChild(suitElement);
        container.appendChild(cardElement);
    }

    // Socket event handlers
    
    // Receive initial game state
    socket.on('gameState', (data) => {
        updateSeatsDisplay(data.seats);
        
        if (data.gameStarted) {
            gameStatus.textContent = "Game in progress. Please wait for the next round.";
            join1Button.disabled = true;
            join2Button.disabled = true;
        }
    });
    
    // Handle seat taken error
    socket.on('seatTaken', () => {
        alert('This seat is already taken. Please choose another seat.');
        gameState.playerSeat = null;
        gameState.playerName = null;
    });
    
    // Update seats when players join/leave
    socket.on('updateSeats', (seats) => {
        updateSeatsDisplay(seats);
    });
    
    // Handle game starting
    socket.on('gameStarting', () => {
        gameStatus.textContent = "Game starting! Dealing cards...";
    });
    
    // Handle cards being dealt
    socket.on('dealCards', (data) => {
        // Clear card areas
        player1Cards.innerHTML = '';
        player2Cards.innerHTML = '';
        
        // Show player's cards
        const myCards = data.yourCards;
        const opponentCards = data.opponentCards;
        const opponentName = data.opponentName;
        
        // Add player labels to card areas
        if (gameState.playerSeat === 1) {
            const player1Label = document.createElement('div');
            player1Label.className = 'player-card-label';
            player1Label.textContent = `Your Cards:`;
            player1Cards.appendChild(player1Label);
            
            const player2Label = document.createElement('div');
            player2Label.className = 'player-card-label';
            player2Label.textContent = `${opponentName}'s Cards:`;
            player2Cards.appendChild(player2Label);
            
            // Add cards to containers
            myCards.forEach(card => createCardElement(card, player1Cards));
            opponentCards.forEach(card => createCardElement(card, player2Cards));
        } else {
            const player1Label = document.createElement('div');
            player1Label.className = 'player-card-label';
            player1Label.textContent = `${opponentName}'s Cards:`;
            player1Cards.appendChild(player1Label);
            
            const player2Label = document.createElement('div');
            player2Label.className = 'player-card-label';
            player2Label.textContent = `Your Cards:`;
            player2Cards.appendChild(player2Label);
            
            // Add cards to containers
            opponentCards.forEach(card => createCardElement(card, player1Cards));
            myCards.forEach(card => createCardElement(card, player2Cards));
        }
    });
    
    // Handle game started
    socket.on('gameStarted', () => {
        gameStatus.textContent = "Cards dealt! Good luck!";
    });
    
    // Handle player disconnection
    socket.on('playerDisconnected', (data) => {
        gameStatus.textContent = `Player ${data.seatNumber} disconnected. Waiting for new players...`;
        
        // Reset game state
        if (gameState.playerSeat) {
            if (gameState.playerSeat === 1) {
                join1Button.disabled = true;
                join2Button.disabled = false;
            } else {
                join1Button.disabled = false;
                join2Button.disabled = true;
            }
        } else {
            join1Button.disabled = false;
            join2Button.disabled = false;
        }
        
        player1Cards.innerHTML = '';
        player2Cards.innerHTML = '';
    });
    
    // Helper function to update the display of seats
    function updateSeatsDisplay(seats) {
        // Update player 1 seat
        if (seats[1]) {
            player1Name.textContent = seats[1].name;
            join1Button.disabled = true;
        } else {
            player1Name.textContent = '';
            join1Button.disabled = gameState.playerSeat !== null;
        }
        
        // Update player 2 seat
        if (seats[2]) {
            player2Name.textContent = seats[2].name;
            join2Button.disabled = true;
        } else {
            player2Name.textContent = '';
            join2Button.disabled = gameState.playerSeat !== null;
        }
        
        // Disable the button for the seat the current player is in
        if (gameState.playerSeat === 1) {
            join1Button.disabled = true;
        } else if (gameState.playerSeat === 2) {
            join2Button.disabled = true;
        }
    }
}); 