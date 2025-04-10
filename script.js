document.addEventListener('DOMContentLoaded', () => {
    // Connect to the server with Socket.io
    const socket = io();
    
    // Game state
    const gameState = {
        playerSeat: null,
        playerName: null,
        gameStarted: false,
        firstPlayer: null,
        playerHealth: 5,
        opponentHealth: 5,
        opponentCardCount: 0,
        isPlayerTurn: false,
        selectedCard: null,
        playedCards: [] // Track cards played in current turn
    };

    // Card colors for the elements
    const CARD_COLORS = {
        gold: '#FFD700',
        wood: '#8B4513',
        water: '#1E90FF',
        fire: '#FF4500',
        earth: '#6B8E23',
        miss: '#777777'
    };

    // DOM elements
    const join1Button = document.getElementById('join1');
    const join2Button = document.getElementById('join2');
    const player1Name = document.getElementById('player1-name');
    const player2Name = document.getElementById('player2-name');
    const gameStatus = document.getElementById('game-status');
    const player1Cards = document.getElementById('player1-cards');
    const player2Cards = document.getElementById('player2-cards');
    const firstPlayerToken = document.createElement('div');
    firstPlayerToken.id = 'first-player-token';
    firstPlayerToken.className = 'first-player-token';
    firstPlayerToken.innerHTML = '⭐ First Player';

    // Create leave button in top right corner
    const leaveButton = document.createElement('button');
    leaveButton.id = 'leave-button';
    leaveButton.className = 'leave-button';
    leaveButton.textContent = 'Leave Game';
    leaveButton.style.position = 'absolute';
    leaveButton.style.top = '10px';
    leaveButton.style.right = '10px';
    leaveButton.style.padding = '5px 10px';
    leaveButton.style.backgroundColor = '#ff4d4d';
    leaveButton.style.color = 'white';
    leaveButton.style.border = 'none';
    leaveButton.style.borderRadius = '4px';
    leaveButton.style.cursor = 'pointer';
    leaveButton.style.display = 'none'; // Hidden by default
    document.querySelector('.game-container').appendChild(leaveButton);

    // Create opponent info container for top middle
    const opponentInfoTop = document.createElement('div');
    opponentInfoTop.id = 'opponent-info-top';
    opponentInfoTop.className = 'opponent-info-top';
    opponentInfoTop.style.position = 'absolute';
    opponentInfoTop.style.top = '20px';
    opponentInfoTop.style.left = '50%';
    opponentInfoTop.style.transform = 'translateX(-50%)';
    opponentInfoTop.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    opponentInfoTop.style.padding = '10px 15px';
    opponentInfoTop.style.borderRadius = '10px';
    opponentInfoTop.style.color = 'white';
    opponentInfoTop.style.textAlign = 'center';
    opponentInfoTop.style.display = 'none'; // Hidden by default
    document.querySelector('.game-container').appendChild(opponentInfoTop);

    // Create player health info for bottom left
    const playerHealthInfo = document.createElement('div');
    playerHealthInfo.id = 'player-health-info';
    playerHealthInfo.className = 'player-health-info';
    playerHealthInfo.style.position = 'absolute';
    playerHealthInfo.style.bottom = '70px';
    playerHealthInfo.style.left = '20px';
    playerHealthInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    playerHealthInfo.style.padding = '10px 15px';
    playerHealthInfo.style.borderRadius = '10px';
    playerHealthInfo.style.color = 'white';
    playerHealthInfo.style.display = 'none'; // Hidden by default
    document.querySelector('.game-container').appendChild(playerHealthInfo);

    // Create game info container for bottom bar
    const gameInfoBar = document.createElement('div');
    gameInfoBar.id = 'game-info-bar';
    gameInfoBar.className = 'game-info-bar';
    document.querySelector('.game-container').appendChild(gameInfoBar);

    // Create opponent info element
    const opponentInfo = document.createElement('div');
    opponentInfo.id = 'opponent-info';
    opponentInfo.className = 'opponent-info';
    gameInfoBar.appendChild(opponentInfo);

    // Create game status container for bottom left
    const statusContainer = document.createElement('div');
    statusContainer.id = 'status-container';
    statusContainer.className = 'status-container';
    gameInfoBar.appendChild(statusContainer);
    
    // Move the game status to the new container
    if (gameStatus.parentNode) {
        gameStatus.parentNode.removeChild(gameStatus);
    }
    statusContainer.appendChild(gameStatus);
    
    // Create turn indicator in the middle
    const turnIndicator = document.createElement('div');
    turnIndicator.id = 'turn-indicator';
    turnIndicator.className = 'turn-indicator';
    turnIndicator.style.position = 'absolute';
    turnIndicator.style.top = '40%';
    turnIndicator.style.left = '50%';
    turnIndicator.style.transform = 'translate(-50%, -50%)';
    turnIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    turnIndicator.style.color = 'white';
    turnIndicator.style.padding = '10px 20px';
    turnIndicator.style.borderRadius = '8px';
    turnIndicator.style.fontWeight = 'bold';
    turnIndicator.style.fontSize = '20px';
    turnIndicator.style.textAlign = 'center';
    turnIndicator.style.zIndex = '100';
    turnIndicator.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.5)';
    turnIndicator.style.width = 'auto';
    turnIndicator.style.display = 'none'; // Hidden by default
    document.querySelector('.game-container').appendChild(turnIndicator);
    
    // After creating turn indicator, add confirm button
    const confirmButton = document.createElement('button');
    confirmButton.id = 'confirm-button';
    confirmButton.className = 'confirm-button';
    confirmButton.textContent = 'Confirm';
    confirmButton.style.position = 'absolute';
    confirmButton.style.bottom = '20px';
    confirmButton.style.right = '20px';
    confirmButton.style.padding = '8px 20px';
    confirmButton.style.backgroundColor = '#4caf50';
    confirmButton.style.color = 'white';
    confirmButton.style.border = 'none';
    confirmButton.style.borderRadius = '4px';
    confirmButton.style.fontWeight = 'bold';
    confirmButton.style.cursor = 'pointer';
    confirmButton.style.display = 'none'; // Hidden by default
    document.querySelector('.game-container').appendChild(confirmButton);

    // Add "Pass" button for when player can't play any cards
    const passButton = document.createElement('button');
    passButton.id = 'pass-button';
    passButton.className = 'pass-button';
    passButton.textContent = 'Pass (Lose 1 Health)';
    passButton.style.position = 'absolute';
    passButton.style.bottom = '20px';
    passButton.style.left = '20px';
    passButton.style.padding = '8px 20px';
    passButton.style.backgroundColor = '#e74c3c';
    passButton.style.color = 'white';
    passButton.style.border = 'none';
    passButton.style.borderRadius = '4px';
    passButton.style.fontWeight = 'bold';
    passButton.style.cursor = 'pointer';
    passButton.style.display = 'none'; // Hidden by default
    document.querySelector('.game-container').appendChild(passButton);

    // Create played cards area in the middle
    const playedCardsArea = document.createElement('div');
    playedCardsArea.id = 'played-cards-area';
    playedCardsArea.className = 'played-cards-area';
    playedCardsArea.style.position = 'absolute';
    playedCardsArea.style.top = '50%';
    playedCardsArea.style.left = '50%';
    playedCardsArea.style.transform = 'translate(-50%, -50%)';
    playedCardsArea.style.display = 'flex';
    playedCardsArea.style.justifyContent = 'center';
    playedCardsArea.style.alignItems = 'center';
    playedCardsArea.style.gap = '10px';
    playedCardsArea.style.minHeight = '150px';
    playedCardsArea.style.minWidth = '200px';
    playedCardsArea.style.zIndex = '50';
    document.querySelector('.game-container').appendChild(playedCardsArea);

    // Reset the UI state on load
    resetUIState();

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
        
        // Show leave button when a seat is taken
        leaveButton.style.display = 'block';
    }
    
    // Reset UI elements to their initial state
    function resetUIState() {
        // Reset buttons
        join1Button.disabled = false;
        join2Button.disabled = false;
        
        // Reset player names
        player1Name.textContent = '';
        player2Name.textContent = '';
        
        // Reset game status
        gameStatus.textContent = 'Waiting for players...';
        
        // Clear card areas
        player1Cards.innerHTML = '';
        player2Cards.innerHTML = '';
        player1Cards.style.display = 'flex';
        player2Cards.style.display = 'flex';
        player1Cards.classList.remove('your-cards');
        player2Cards.classList.remove('your-cards');
        
        // Show both player sections
        document.getElementById('player1-section').style.display = 'block';
        document.getElementById('player2-section').style.display = 'block';
        
        // Clear opponent info
        opponentInfo.innerHTML = '';
        opponentInfoTop.innerHTML = '';
        playerHealthInfo.innerHTML = '';
        
        // Hide health info displays
        opponentInfoTop.style.display = 'none';
        playerHealthInfo.style.display = 'none';
        
        // Reset health values
        gameState.playerHealth = 5;
        gameState.opponentHealth = 5;
        
        // Remove first player token if present
        if (firstPlayerToken.parentNode) {
            firstPlayerToken.parentNode.removeChild(firstPlayerToken);
        }
        
        // Hide leave button
        leaveButton.style.display = 'none';
        
        // Reset turn indicator
        turnIndicator.textContent = '';
        turnIndicator.style.display = 'none';
        
        // Reset game play elements
        confirmButton.style.display = 'none';
        passButton.style.display = 'none';
        playedCardsArea.innerHTML = '';
        gameState.selectedCard = null;
        gameState.playedCards = [];
        gameState.isPlayerTurn = false;
    }

    // Create card HTML element for element cards
    function createCardElement(card, container) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.style.backgroundColor = CARD_COLORS[card.type];
        cardElement.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        cardElement.dataset.cardType = card.type;
        cardElement.dataset.cardName = card.name;
        
        const cardName = document.createElement('div');
        cardName.className = 'card-name';
        cardName.textContent = card.name;
        
        cardElement.appendChild(cardName);
        container.appendChild(cardElement);
        
        // Add click handler for cards (only if it's player's turn and not a MISS card)
        if (gameState.isPlayerTurn && card.type !== 'miss') {
            cardElement.style.cursor = 'pointer';
            
            cardElement.addEventListener('click', () => {
                // Only allow selection if it's the player's turn
                if (!gameState.isPlayerTurn) return;
                
                // Can't select MISS cards
                if (card.type === 'miss') return;
                
                // If there's already a played card, can only play same type
                if (gameState.playedCards.length > 0 && gameState.playedCards[0].type !== card.type) {
                    return;
                }
                
                // Visual indication of selection
                if (gameState.selectedCard === cardElement) {
                    // Deselect
                    cardElement.style.transform = '';
                    cardElement.style.boxShadow = '';
                    gameState.selectedCard = null;
                    confirmButton.style.display = 'none';
                } else {
                    // Reset any previously selected card
                    if (gameState.selectedCard) {
                        gameState.selectedCard.style.transform = '';
                        gameState.selectedCard.style.boxShadow = '';
                    }
                    
                    // Select this card
                    cardElement.style.transform = 'translateY(-15px)';
                    cardElement.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.3)';
                    gameState.selectedCard = cardElement;
                    
                    // Show confirm button
                    confirmButton.style.display = 'block';
                }
            });
        }
        
        return cardElement;
    }

    // Socket event handlers
    
    // Receive initial game state
    socket.on('gameState', (data) => {
        // Reset the game state based on server data
        updateSeatsDisplay(data.seats);
        
        if (data.gameStarted) {
            gameStatus.textContent = "Game in progress. Please wait for the next round.";
            join1Button.disabled = true;
            join2Button.disabled = true;
            
            // Show first player token if it exists
            if (data.firstPlayer) {
                showFirstPlayerToken(data.firstPlayer);
            }
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
        opponentInfo.innerHTML = '';
        
        // Save first player info
        gameState.firstPlayer = data.firstPlayer;
        
        // Update health information
        gameState.playerHealth = data.playerHealth || 5; 
        gameState.opponentHealth = data.opponentHealth || 5;
        
        // Show first player token
        showFirstPlayerToken(data.firstPlayer);
        
        // Show player's cards
        const myCards = data.yourCards;
        const opponentName = data.opponentName;
        const opponentSeat = gameState.playerSeat === 1 ? 2 : 1;
        
        // Save opponent card count
        gameState.opponentCardCount = data.opponentCards.length;
        
        // Display opponent info in bottom right
        const opponentCardCount = document.createElement('div');
        opponentCardCount.className = 'opponent-card-count';
        opponentCardCount.innerHTML = `<div class="opponent-name">Player ${opponentSeat}</div><div class="card-count">Cards in hand: ${data.opponentCards.length}</div>`;
        opponentInfo.appendChild(opponentCardCount);
        
        // Display your cards in your card area (based on your seat)
        if (gameState.playerSeat === 1) {
            // Clear the second card area completely
            player2Cards.style.display = 'none';
            
            // Add player label to your cards area
            const player1Label = document.createElement('div');
            player1Label.className = 'player-card-label';
            player1Label.textContent = `Your Cards:`;
            player1Cards.appendChild(player1Label);
            
            // Add your cards to your container
            myCards.forEach(card => createCardElement(card, player1Cards));
            
            // Position your cards at the bottom
            player1Cards.classList.add('your-cards');
        } else {
            // Clear the first card area completely
            player1Cards.style.display = 'none';
            
            // Add player label to your cards area
            const player2Label = document.createElement('div');
            player2Label.className = 'player-card-label';
            player2Label.textContent = `Your Cards:`;
            player2Cards.appendChild(player2Label);
            
            // Add your cards to your container
            myCards.forEach(card => createCardElement(card, player2Cards));
            
            // Position your cards at the bottom
            player2Cards.classList.add('your-cards');
        }
        
        // Update health displays
        updateHealthDisplays();
        
        // Update turn state
        gameState.isPlayerTurn = data.firstPlayer === gameState.playerSeat;
    });
    
    // Helper function to update health displays
    function updateHealthDisplays() {
        // Update opponent health info at top
        opponentInfoTop.innerHTML = `
            <div style="font-weight: bold; font-size: 16px;">Opponent</div>
            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                <div>Health: <span style="color: #ff6b6b; font-weight: bold;">${gameState.opponentHealth}</span></div>
                <div style="margin-left: 15px;">Cards: <span style="color: #4ecdc4; font-weight: bold;">${gameState.opponentCardCount}</span></div>
            </div>
        `;
        opponentInfoTop.style.display = 'block';
        
        // Update player health info at bottom left
        playerHealthInfo.innerHTML = `
            <div style="font-weight: bold;">Your Health</div>
            <div style="font-size: 20px; color: #ff6b6b; font-weight: bold;">${gameState.playerHealth}</div>
        `;
        playerHealthInfo.style.display = 'block';
    }
    
    // Handle game started
    socket.on('gameStarted', (data) => {
        // Clear the game status text since we're showing turn info in the middle now
        gameStatus.textContent = '';
        
        // Show turn indicator in the middle
        const isYourTurn = data.firstPlayer === gameState.playerSeat;
        turnIndicator.textContent = isYourTurn ? 'Your Turn' : 'Opponent\'s Turn';
        gameState.isPlayerTurn = isYourTurn;
        
        // Set a more vibrant background color based on whose turn it is
        if (isYourTurn) {
            turnIndicator.style.backgroundColor = 'rgba(46, 204, 113, 0.85)'; // Bright green
            turnIndicator.style.border = '1px solid #fff';
            
            // Show the confirm and pass buttons if it's your turn
            confirmButton.style.display = 'block';
            passButton.style.display = 'block';
        } else {
            turnIndicator.style.backgroundColor = 'rgba(231, 76, 60, 0.85)'; // Bright red
            turnIndicator.style.border = '1px solid #fff';
            
            // Hide the buttons if it's not your turn
            confirmButton.style.display = 'none';
            passButton.style.display = 'none';
        }
        
        // Make sure turn indicator is visible
        turnIndicator.style.display = 'block';
        
        // Hide both player sections (Player 1 and Player 2)
        document.getElementById('player1-section').style.display = 'none';
        document.getElementById('player2-section').style.display = 'none';
        
        // The leave button should still be visible
        leaveButton.style.display = 'block';
    });
    
    // Handle player disconnection
    socket.on('playerDisconnected', (data) => {
        gameStatus.textContent = `Player ${data.seatNumber} disconnected. Waiting for new players...`;
        
        // Reset game state if you're still connected
        if (gameState.playerSeat) {
            if (gameState.playerSeat === 1) {
                join1Button.disabled = true;
                join2Button.disabled = false;
            } else {
                join1Button.disabled = false;
                join2Button.disabled = true;
            }
            
            // Show both sections again when a player disconnects
            document.getElementById('player1-section').style.display = 'block';
            document.getElementById('player2-section').style.display = 'block';
        } else {
            // Reset UI if you're not a player
            resetUIState();
            // Make sure seat buttons are enabled
            join1Button.disabled = false;
            join2Button.disabled = false;
        }
        
        // Reset display
        player1Cards.innerHTML = '';
        player2Cards.innerHTML = '';
        player1Cards.style.display = 'flex';
        player2Cards.style.display = 'flex';
        player1Cards.classList.remove('your-cards');
        player2Cards.classList.remove('your-cards');
        opponentInfo.innerHTML = '';
        
        // Hide health displays
        opponentInfoTop.style.display = 'none';
        playerHealthInfo.style.display = 'none';
        
        // Remove first player token
        if (firstPlayerToken.parentNode) {
            firstPlayerToken.parentNode.removeChild(firstPlayerToken);
        }
        
        // Hide turn indicator when a player disconnects
        turnIndicator.style.display = 'none';
    });
    
    // Helper function to show first player token
    function showFirstPlayerToken(firstPlayer) {
        // Remove existing token first
        if (firstPlayerToken.parentNode) {
            firstPlayerToken.parentNode.removeChild(firstPlayerToken);
        }
        
        // Place token next to the first player's name
        if (firstPlayer === 1) {
            player1Name.parentNode.appendChild(firstPlayerToken);
        } else {
            player2Name.parentNode.appendChild(firstPlayerToken);
        }
    }
    
    // Helper function to update the display of seats
    function updateSeatsDisplay(seats) {
        // Update player 1 seat
        if (seats[1]) {
            player1Name.textContent = seats[1].name;
            join1Button.disabled = true;
        } else {
            player1Name.textContent = '';
            if (!gameState.playerSeat || gameState.playerSeat === 1) {
                join1Button.disabled = false;
            }
        }
        
        // Update player 2 seat
        if (seats[2]) {
            player2Name.textContent = seats[2].name;
            join2Button.disabled = true;
        } else {
            player2Name.textContent = '';
            if (!gameState.playerSeat || gameState.playerSeat === 2) {
                join2Button.disabled = false;
            }
        }
        
        // Disable the button for the seat the current player is in
        if (gameState.playerSeat === 1) {
            join1Button.disabled = true;
            // Only enable seat 2 if it's not taken
            join2Button.disabled = seats[2] !== null;
        } else if (gameState.playerSeat === 2) {
            join2Button.disabled = true;
            // Only enable seat 1 if it's not taken
            join1Button.disabled = seats[1] !== null;
        }
    }

    // Add leave button event listener
    leaveButton.addEventListener('click', () => {
        // Notify server player is leaving
        if (gameState.playerSeat) {
            socket.emit('leaveSeat', { seatNumber: gameState.playerSeat });
        }
        // Reset local game state
        gameState.playerSeat = null;
        gameState.playerName = null;
        // Reset UI
        resetUIState();
        // Hide leave button
        leaveButton.style.display = 'none';
    });

    // Add click handler for confirm button
    confirmButton.addEventListener('click', () => {
        if (gameState.selectedCard) {
            // Get card information
            const cardType = gameState.selectedCard.dataset.cardType;
            const cardName = gameState.selectedCard.dataset.cardName;
            
            // Create played card object
            const playedCard = {
                type: cardType,
                name: cardName
            };
            
            // Add to played cards
            gameState.playedCards.push(playedCard);
            
            // Add the card to the played area
            const playedCardEl = document.createElement('div');
            playedCardEl.className = 'card played-card';
            playedCardEl.style.backgroundColor = CARD_COLORS[cardType];
            playedCardEl.style.width = '60px';
            playedCardEl.style.height = '90px';
            
            const playedCardName = document.createElement('div');
            playedCardName.className = 'card-name';
            playedCardName.textContent = cardName;
            playedCardEl.appendChild(playedCardName);
            
            playedCardsArea.appendChild(playedCardEl);
            
            // Remove the card from player's hand
            const cardContainer = gameState.selectedCard.parentNode;
            cardContainer.removeChild(gameState.selectedCard);
            
            // Update local state
            gameState.selectedCard = null;
            
            // Emit the card played event to server
            socket.emit('playCard', {
                card: playedCard,
                seatNumber: gameState.playerSeat
            });
            
            // Hide confirm button until another card is selected
            confirmButton.style.display = 'none';
        }
    });

    // Add click handler for pass button
    passButton.addEventListener('click', () => {
        // Player is passing (can't play a matching card)
        socket.emit('passTurn', {
            seatNumber: gameState.playerSeat
        });
        
        // Update local health (the server will confirm this)
        gameState.playerHealth -= 1;
        updateHealthDisplays();
        
        // Clear played cards area
        playedCardsArea.innerHTML = '';
        gameState.playedCards = [];
        
        // End turn
        gameState.isPlayerTurn = false;
        turnIndicator.textContent = 'Opponent\'s Turn';
        turnIndicator.style.backgroundColor = 'rgba(231, 76, 60, 0.85)'; // Bright red
        
        // Hide buttons
        confirmButton.style.display = 'none';
        passButton.style.display = 'none';
    });

    // Handle when opponent plays a card
    socket.on('opponentPlayedCard', (data) => {
        const { card } = data;
        
        // Add to played cards
        gameState.playedCards.push(card);
        
        // Show the card in the played area
        const playedCardEl = document.createElement('div');
        playedCardEl.className = 'card played-card';
        playedCardEl.style.backgroundColor = CARD_COLORS[card.type];
        playedCardEl.style.width = '60px';
        playedCardEl.style.height = '90px';
        
        const playedCardName = document.createElement('div');
        playedCardName.className = 'card-name';
        playedCardName.textContent = card.name;
        playedCardEl.appendChild(playedCardName);
        
        playedCardsArea.appendChild(playedCardEl);
        
        // Update opponent card count
        gameState.opponentCardCount--;
        updateHealthDisplays();
    });

    // Handle opponent passing their turn
    socket.on('opponentPassed', () => {
        // Update opponent health
        gameState.opponentHealth -= 1;
        updateHealthDisplays();
        
        // Clear played cards area
        playedCardsArea.innerHTML = '';
        gameState.playedCards = [];
        
        // Start player's turn
        gameState.isPlayerTurn = true;
        turnIndicator.textContent = 'Your Turn';
        turnIndicator.style.backgroundColor = 'rgba(46, 204, 113, 0.85)'; // Bright green
        
        // Show buttons
        confirmButton.style.display = 'block';
        passButton.style.display = 'block';
    });

    // Handle turn change
    socket.on('changeTurn', (data) => {
        const { nextPlayer, drawnCards } = data;
        
        // Clear played cards area
        playedCardsArea.innerHTML = '';
        gameState.playedCards = [];
        
        // Update turn state
        gameState.isPlayerTurn = nextPlayer === gameState.playerSeat;
        
        // Update UI based on whose turn it is
        if (gameState.isPlayerTurn) {
            turnIndicator.textContent = 'Your Turn';
            turnIndicator.style.backgroundColor = 'rgba(46, 204, 113, 0.85)'; // Green
            
            // Show buttons
            confirmButton.style.display = 'block';
            passButton.style.display = 'block';
            
            // Add drawn cards to hand if any
            if (drawnCards && drawnCards.length > 0) {
                const container = gameState.playerSeat === 1 ? player1Cards : player2Cards;
                drawnCards.forEach(card => createCardElement(card, container));
            }
        } else {
            turnIndicator.textContent = 'Opponent\'s Turn';
            turnIndicator.style.backgroundColor = 'rgba(231, 76, 60, 0.85)'; // Red
            
            // Hide buttons
            confirmButton.style.display = 'none';
            passButton.style.display = 'none';
            
            // Update opponent card count if they drew cards
            if (drawnCards && drawnCards.length > 0) {
                gameState.opponentCardCount += drawnCards.length;
                updateHealthDisplays();
            }
        }
    });
}); 