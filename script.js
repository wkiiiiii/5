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
        playedCards: [], // Track cards played in current turn
        isSubturn: false, // Track if we're in a reaction subturn
        waitingForReaction: false, // Track if waiting for opponent reaction
        lastPlayedCard: null, // Track the last card played for reaction
        gamePhase: null // Current game phase: "player-turn" or "opponent-turn"
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

    // Elemental superiority chain: gold>wood>earth>water>fire>gold
    function isSuperiorElement(attackType, defenseType) {
        // Valid counters for each element:
        const validCounters = {
            'gold': ['gold', 'fire'],  // Gold can be countered by Gold or Fire
            'wood': ['wood', 'gold'],  // Wood can be countered by Wood or Gold
            'earth': ['earth', 'wood'], // Earth can be countered by Earth or Wood
            'water': ['water', 'earth'], // Water can be countered by Water or Earth
            'fire': ['fire', 'water']   // Fire can be countered by Fire or Water
        };
        
        // Return true if the defense type is a valid counter to the attack type
        return validCounters[attackType] && validCounters[attackType].includes(defenseType);
    }
    
    // Get the element that is superior to the given element (the counter)
    function getElementSuperiorTo(elementType) {
        const superiorityMap = {
            'gold': 'fire',  // Gold can be countered by Fire
            'wood': 'gold',  // Wood can be countered by Gold
            'earth': 'wood', // Earth can be countered by Wood
            'water': 'earth', // Water can be countered by Earth
            'fire': 'water'  // Fire can be countered by Water
        };
        
        return superiorityMap[elementType] || elementType;
    }

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
    turnIndicator.style.left = '20px';
    turnIndicator.style.top = '20px'; // Position at top left
    turnIndicator.style.padding = '5px 10px';
    turnIndicator.style.borderRadius = '4px';
    turnIndicator.style.fontWeight = 'bold';
    turnIndicator.style.fontSize = '16px';
    turnIndicator.style.textAlign = 'left';
    turnIndicator.style.zIndex = '100';
    turnIndicator.style.color = 'white';
    turnIndicator.style.display = 'none'; // Hidden by default
    turnIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent background
    document.querySelector('.game-container').appendChild(turnIndicator);
    
    // Create played cards area in the middle
    const playedCardsArea = document.createElement('div');
    playedCardsArea.id = 'played-cards-area';
    playedCardsArea.className = 'played-cards-area';
    playedCardsArea.style.position = 'absolute';
    playedCardsArea.style.top = 'calc(50% - 3cm)'; // 3cm higher than center
    playedCardsArea.style.left = '50%';
    playedCardsArea.style.transform = 'translate(-50%, -50%)';
    playedCardsArea.style.display = 'flex';
    playedCardsArea.style.justifyContent = 'center';
    playedCardsArea.style.alignItems = 'center';
    playedCardsArea.style.minHeight = '200px';
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
        playedCardsArea.innerHTML = '';
        gameState.selectedCard = null;
        gameState.playedCards = [];
        gameState.isPlayerTurn = false;
        gameState.gamePhase = null;
    }

    // Create card HTML element for element cards
    function createCardElement(card, container) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.style.backgroundColor = CARD_COLORS[card.type];
        cardElement.style.transition = 'all 0.3s ease';
        cardElement.style.position = 'relative'; // For positioning the confirm button
        cardElement.dataset.cardType = card.type;
        cardElement.dataset.cardName = card.name;
        
        const cardName = document.createElement('div');
        cardName.className = 'card-name';
        cardName.textContent = card.name;
        
        // Create card confirm button (initially hidden)
        const cardConfirmButton = document.createElement('button');
        cardConfirmButton.className = 'card-confirm-button';
        cardConfirmButton.textContent = 'Confirm';
        cardConfirmButton.style.position = 'absolute';
        cardConfirmButton.style.bottom = '5px';
        cardConfirmButton.style.left = '50%';
        cardConfirmButton.style.transform = 'translateX(-50%)';
        cardConfirmButton.style.backgroundColor = '#4caf50';
        cardConfirmButton.style.color = 'white';
        cardConfirmButton.style.border = 'none';
        cardConfirmButton.style.borderRadius = '3px';
        cardConfirmButton.style.padding = '3px 8px';
        cardConfirmButton.style.fontSize = '12px';
        cardConfirmButton.style.cursor = 'pointer';
        cardConfirmButton.style.display = 'none';
        
        cardElement.appendChild(cardName);
        cardElement.appendChild(cardConfirmButton);
        container.appendChild(cardElement);
        
        // Add click handler for cards
        cardElement.addEventListener('click', () => {
            console.log('Card clicked:', card.type, 'Is player turn:', gameState.isPlayerTurn);
            
            // Only allow selection if it's the player's turn
            if (!gameState.isPlayerTurn) return;
            
            // MISS cards can only be played during reactions, not during normal play
            if (card.type === 'miss' && !gameState.isSubturn) {
                alert("Miss cards can only be used as reactions!");
                return;
            }
            
            // Visual indication of selection
            if (gameState.selectedCard === cardElement) {
                // Deselect
                cardElement.style.border = '';
                cardElement.style.boxShadow = '';
                cardElement.style.transform = '';
                cardElement.style.zIndex = '';
                cardConfirmButton.style.display = 'none';
                gameState.selectedCard = null;
            } else {
                // Reset any previously selected card
                if (gameState.selectedCard) {
                    gameState.selectedCard.style.border = '';
                    gameState.selectedCard.style.boxShadow = '';
                    gameState.selectedCard.style.transform = '';
                    gameState.selectedCard.style.zIndex = '';
                    
                    // Hide confirm button on previously selected card
                    const previousCardConfirm = gameState.selectedCard.querySelector('.card-confirm-button');
                    if (previousCardConfirm) {
                        previousCardConfirm.style.display = 'none';
                    }
                }
                
                // Select this card
                cardElement.style.border = '4px dashed yellow';
                cardElement.style.boxShadow = '0 0 15px rgba(255, 255, 0, 0.8)';
                cardElement.style.transform = 'translateY(-15px) scale(1.1)';
                cardElement.style.zIndex = '10';
                cardConfirmButton.style.display = 'block';
                gameState.selectedCard = cardElement;
            }
        });
        
        // Add card confirm button click handler
        cardConfirmButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the card click event
            
            if (gameState.selectedCard === cardElement) {
                // Get card information
                const cardType = card.type;
                const cardName = card.name;
                
                // Create played card object
                const playedCard = {
                    type: cardType,
                    name: cardName
                };
                
                // Check if this is a subturn reaction
                let isReaction = false;
                if (gameState.isSubturn && gameState.lastPlayedCard) {
                    // Allow the following cards to be played as reactions:
                    // 1. Same card type as the attack
                    // 2. Superior element card (based on elemental chain)
                    // 3. Miss card (can counter any element)
                    const isMatchingType = cardType === gameState.lastPlayedCard.type;
                    const isSuperior = isSuperiorElement(gameState.lastPlayedCard.type, cardType);
                    const isMissCard = cardType === 'miss';
                    
                    if (!isMatchingType && !isSuperior && !isMissCard) {
                        alert("You must play a matching card, a superior element card, or a miss card for reaction!");
                        return;
                    }
                    
                    // This is a reaction card
                    isReaction = true;
                    
                    // If player is responding to opponent's card, we'll let the server handle turn switching
                    // Just indicate that we're waiting for the server response
                    if (gameState.gamePhase === "opponent-turn") {
                        turnIndicator.textContent = 'Waiting...';
                        turnIndicator.style.color = '#f39c12'; // Orange for waiting state
                    }
                }
                
                // Add to played cards
                gameState.playedCards.push(playedCard);
                gameState.lastPlayedCard = playedCard;
                
                // Add the card to the played area
                const playedCardEl = document.createElement('div');
                playedCardEl.className = 'card played-card';
                playedCardEl.style.backgroundColor = CARD_COLORS[cardType];
                playedCardEl.style.width = '70px'; // 70% of the original 100px
                playedCardEl.style.height = '105px'; // 70% of the original 150px
                playedCardEl.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.5)';
                playedCardEl.style.animation = 'card-played 0.5s ease';
                playedCardEl.style.position = 'relative';
                
                const playedCardName = document.createElement('div');
                playedCardName.className = 'card-name';
                playedCardName.textContent = cardName;
                playedCardName.style.fontSize = '16px';
                playedCardName.style.fontWeight = 'bold';
                playedCardEl.appendChild(playedCardName);
                
                // Add player label at the bottom of the card
                const playerLabel = document.createElement('div');
                playerLabel.textContent = 'You';
                playerLabel.style.position = 'absolute';
                playerLabel.style.bottom = '5px';
                playerLabel.style.width = '100%';
                playerLabel.style.textAlign = 'center';
                playerLabel.style.fontSize = '12px';
                playerLabel.style.color = 'white';
                playerLabel.style.fontWeight = 'bold';
                playedCardEl.appendChild(playerLabel);
                
                // Clear existing cards in played area
                playedCardsArea.innerHTML = '';
                
                // Add the card to the played area
                playedCardsArea.appendChild(playedCardEl);
                
                // Add message about the played card
                let messageText;
                if (isReaction) {
                    if (cardType === 'miss') {
                        messageText = 'You countered with a MISS card!';
                    } else if (isSuperiorElement(gameState.lastPlayedCard.type, cardType)) {
                        messageText = `You countered with superior ${cardType.toUpperCase()} against ${gameState.lastPlayedCard.type.toUpperCase()}!`;
                    } else {
                        messageText = 'You responded with matching card';
                    }
                } else {
                    messageText = 'Waiting for opponent reaction...';
                }
                
                const reactionPrompt = document.createElement('div');
                reactionPrompt.textContent = messageText;
                reactionPrompt.style.color = 'white';
                reactionPrompt.style.textAlign = 'center';
                reactionPrompt.style.marginTop = '15px';
                reactionPrompt.style.fontSize = '14px';
                reactionPrompt.style.animation = isReaction ? '' : 'pulse 1.5s infinite';
                playedCardsArea.appendChild(reactionPrompt);
                
                // Remove the card from player's hand
                const cardContainer = cardElement.parentNode;
                cardContainer.removeChild(cardElement);
                
                // Update local state
                gameState.selectedCard = null;
                gameState.waitingForReaction = true;
                
                // Only update turn indicator if not a reaction (for new plays)
                // For reactions, the server will handle turn switching
                if (!isReaction) {
                    turnIndicator.textContent = 'Player Turn (Waiting for reaction)';
                    turnIndicator.style.color = '#f39c12'; // Orange for waiting state
                    gameState.gamePhase = "player-turn"; // Ensure game phase is set to player-turn
                }
                
                // Emit the card played event to server
                socket.emit('playCard', {
                    card: playedCard,
                    seatNumber: gameState.playerSeat,
                    isReaction: isReaction // Tell server if this is a reaction to opponent's card
                });
            }
        });
        
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
        opponentCardCount.innerHTML = `<div class="opponent-name">Player ${opponentSeat}</div>`;
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
        
        // Determine turn and position the turn indicator
        const isYourTurn = data.firstPlayer === gameState.playerSeat;
        gameState.isPlayerTurn = isYourTurn;
        
        // Set text based on whose turn it is
        if (isYourTurn) {
            // Show "Your Turn" text at top left when it's player's turn
            turnIndicator.style.top = '20px';
            turnIndicator.textContent = '★ Your Turn';
            turnIndicator.style.color = '#2ecc71'; // Green text
        } else {
            // Show "Opponent's Turn" text at top left when it's opponent's turn
            turnIndicator.style.top = '20px';
            turnIndicator.textContent = '★ Opponent\'s Turn';
            turnIndicator.style.color = '#e74c3c'; // Red text
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

    // Create "Pass" button to let players opt to take damage instead of playing a reaction card
    function createPassButton() {
        const passButton = document.createElement('button');
        passButton.id = 'pass-button';
        passButton.className = 'pass-button';
        passButton.textContent = 'Pass (Take 1 Damage)';
        passButton.style.position = 'absolute';
        passButton.style.bottom = '20px';
        passButton.style.left = '50%';
        passButton.style.transform = 'translateX(-50%)';
        passButton.style.padding = '10px 20px';
        passButton.style.backgroundColor = '#e74c3c';
        passButton.style.color = 'white';
        passButton.style.border = 'none';
        passButton.style.borderRadius = '5px';
        passButton.style.cursor = 'pointer';
        passButton.style.fontWeight = 'bold';
        passButton.style.fontSize = '14px';
        
        // Add click handler for pass button
        passButton.addEventListener('click', () => {
            // Only allow passing during your turn in a subturn (reaction)
            if (gameState.isPlayerTurn && gameState.isSubturn) {
                console.log('Pass button clicked - taking damage and switching turn');
                
                // Decrease player health locally
                gameState.playerHealth -= 1;
                updateHealthDisplays();
                
                // Update local state
                gameState.isSubturn = false;
                gameState.waitingForReaction = false;
                
                // Clear played cards area - the card requiring reaction is removed
                playedCardsArea.innerHTML = '';
                
                // Add message about taking damage and getting next turn
                const damageMessage = document.createElement('div');
                damageMessage.textContent = 'You took 1 damage instead of responding';
                damageMessage.style.color = '#e74c3c';
                damageMessage.style.textAlign = 'center';
                damageMessage.style.marginTop = '15px';
                damageMessage.style.fontSize = '16px';
                damageMessage.style.fontWeight = 'bold';
                playedCardsArea.appendChild(damageMessage);
                
                // Add explanation that player will get next turn
                const explanationText = document.createElement('div');
                explanationText.textContent = 'You will get the next turn';
                explanationText.style.color = '#f39c12';
                explanationText.style.textAlign = 'center';
                explanationText.style.marginTop = '5px';
                explanationText.style.fontSize = '14px';
                playedCardsArea.appendChild(explanationText);
                
                // Notify server player passed
                socket.emit('pass', { seatNumber: gameState.playerSeat });
                console.log('Emitted pass event to server - you will get the next turn', { playerSeat: gameState.playerSeat });
                
                // Reset lastPlayedCard since the reaction sequence is over
                gameState.lastPlayedCard = null;
                
                // Update waiting message to be more accurate
                turnIndicator.textContent = 'Taking damage...';
                turnIndicator.style.color = '#f39c12'; // Orange for waiting state
            }
        });
        
        return passButton;
    }

    // Handle when opponent plays a card
    socket.on('opponentPlayedCard', (data) => {
        const { card, isReaction } = data;
        
        // Add to played cards
        gameState.playedCards.push(card);
        gameState.lastPlayedCard = card;
        
        // Show the card in the played area
        const playedCardEl = document.createElement('div');
        playedCardEl.className = 'card played-card';
        playedCardEl.style.backgroundColor = CARD_COLORS[card.type];
        playedCardEl.style.width = '70px'; // 70% of the original 100px
        playedCardEl.style.height = '105px'; // 70% of the original 150px
        playedCardEl.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.5)';
        playedCardEl.style.animation = 'card-played 0.5s ease';
        playedCardEl.style.position = 'relative';
        
        const playedCardName = document.createElement('div');
        playedCardName.className = 'card-name';
        playedCardName.textContent = card.name;
        playedCardName.style.fontSize = '16px';
        playedCardName.style.fontWeight = 'bold';
        playedCardEl.appendChild(playedCardName);
        
        // Add opponent label at the bottom of the card
        const playerLabel = document.createElement('div');
        playerLabel.textContent = 'Opponent';
        playerLabel.style.position = 'absolute';
        playerLabel.style.bottom = '5px';
        playerLabel.style.width = '100%';
        playerLabel.style.textAlign = 'center';
        playerLabel.style.fontSize = '12px';
        playerLabel.style.color = 'white';
        playerLabel.style.fontWeight = 'bold';
        playedCardEl.appendChild(playerLabel);
        
        // Clear existing cards in played area
        playedCardsArea.innerHTML = '';
        
        // Add the card to the played area
        playedCardsArea.appendChild(playedCardEl);
        
        // Check if this is a reaction or a new play
        if (isReaction) {
            // This is a reaction to our card (opponent played the same card type)
            gameState.waitingForReaction = false;
            gameState.isSubturn = false; // End reaction subturn
            
            // Set game phase to opponent's turn when they respond with matching card
            gameState.gamePhase = "opponent-turn";
            gameState.isPlayerTurn = false;
            
            // Update turn indicator - now opponent's turn
            turnIndicator.textContent = 'Opponent Turn';
            turnIndicator.style.color = '#e74c3c'; // Red for opponent's turn
            
            // Show message that opponent has responded
            const reactionPrompt = document.createElement('div');
            if (card.type === 'miss') {
                reactionPrompt.textContent = 'Opponent countered with a MISS card!';
            } else if (gameState.lastPlayedCard && isSuperiorElement(gameState.lastPlayedCard.type, card.type)) {
                reactionPrompt.textContent = `Opponent countered with superior ${card.type.toUpperCase()} against ${gameState.lastPlayedCard.type.toUpperCase()}!`;
            } else {
                reactionPrompt.textContent = 'Opponent responded with matching card';
            }
            reactionPrompt.style.color = '#e74c3c';
            reactionPrompt.style.textAlign = 'center';
            reactionPrompt.style.marginTop = '15px';
            reactionPrompt.style.fontSize = '16px';
            reactionPrompt.style.fontWeight = 'bold';
            playedCardsArea.appendChild(reactionPrompt);
            
            // Add explanation about turn switching
            const explanationText = document.createElement('div');
            explanationText.textContent = 'Turn switches to opponent';
            explanationText.style.color = '#f39c12';
            explanationText.style.textAlign = 'center';
            explanationText.style.marginTop = '5px';
            explanationText.style.fontSize = '14px';
            playedCardsArea.appendChild(explanationText);
        } else {
            // This is a new play requiring our reaction
            gameState.waitingForReaction = false;
            gameState.isSubturn = true;
            gameState.isPlayerTurn = true; // It's our turn to react
            
            // Set game phase to opponent turn (because the opponent initiated this turn)
            gameState.gamePhase = "opponent-turn";
            
            // Add a reaction prompt for the player
            const reactionPrompt = document.createElement('div');
            reactionPrompt.textContent = 'Your turn to react!';
            reactionPrompt.style.color = '#4caf50';
            reactionPrompt.style.textAlign = 'center';
            reactionPrompt.style.marginTop = '15px';
            reactionPrompt.style.fontSize = '16px';
            reactionPrompt.style.fontWeight = 'bold';
            playedCardsArea.appendChild(reactionPrompt);
            
            // Add reaction options explanation
            const reactionOptions = document.createElement('div');
            reactionOptions.textContent = `You can play: Same card type, MISS card, or ${getElementSuperiorTo(card.type).toUpperCase()}`;
            reactionOptions.style.color = '#f39c12';
            reactionOptions.style.textAlign = 'center';
            reactionOptions.style.marginTop = '5px';
            reactionOptions.style.fontSize = '14px';
            playedCardsArea.appendChild(reactionOptions);
            
            // Add elemental superiority explanation
            const elementalExplanation = document.createElement('div');
            elementalExplanation.textContent = 'Element Chain: Gold > Wood > Earth > Water > Fire > Gold';
            elementalExplanation.style.color = '#777777';
            elementalExplanation.style.textAlign = 'center';
            elementalExplanation.style.marginTop = '5px';
            elementalExplanation.style.fontSize = '12px';
            elementalExplanation.style.fontStyle = 'italic';
            playedCardsArea.appendChild(elementalExplanation);
            
            // Add counter explanation
            const counterExplanation = document.createElement('div');
            counterExplanation.textContent = `Each element can be countered by itself or the next element in the chain`;
            counterExplanation.style.color = '#777777';
            counterExplanation.style.textAlign = 'center';
            counterExplanation.style.marginTop = '3px';
            counterExplanation.style.fontSize = '12px';
            counterExplanation.style.fontStyle = 'italic';
            playedCardsArea.appendChild(counterExplanation);
            
            // Add MISS card explanation
            const missExplanation = document.createElement('div');
            missExplanation.textContent = 'MISS cards can counter any element card';
            missExplanation.style.color = '#777777';
            missExplanation.style.textAlign = 'center';
            missExplanation.style.marginTop = '3px';
            missExplanation.style.fontSize = '12px';
            missExplanation.style.fontStyle = 'italic';
            playedCardsArea.appendChild(missExplanation);
            
            // Add a pass button to allow player to take damage instead of playing a card
            const passButton = createPassButton();
            playedCardsArea.appendChild(passButton);
            
            // Update turn indicator - opponent's turn, player reacting
            turnIndicator.textContent = 'Opponent Turn (Your Reaction)';
            turnIndicator.style.color = '#2ecc71'; // Green for player's action
        }
        
        // Update opponent card count
        gameState.opponentCardCount--;
        updateHealthDisplays();
    });

    // Handle opponent passing their turn
    socket.on('opponentPassed', (data) => {
        // Update opponent health with the value from the server
        if (data && data.health !== undefined) {
            gameState.opponentHealth = data.health;
        } else {
            // Fallback to decrementing locally if server doesn't provide health
            gameState.opponentHealth -= 1;
        }
        updateHealthDisplays();
        
        // Clear played cards area - the card requiring reaction is removed
        playedCardsArea.innerHTML = '';
        
        // Reset cards played
        gameState.playedCards = [];
        
        // Reset subturn state
        gameState.isSubturn = false;
        gameState.waitingForReaction = false;
        gameState.lastPlayedCard = null;
        
        // Note: According to the game rules, when a player passes and takes damage,
        // the turn switches TO THEM. So we expect the opponent to get the next turn.
        
        // Show a message about opponent taking damage and getting next turn
        const damageMessage = document.createElement('div');
        damageMessage.textContent = 'Opponent took 1 damage instead of responding!';
        damageMessage.style.color = '#e74c3c';
        damageMessage.style.textAlign = 'center';
        damageMessage.style.marginTop = '15px';
        damageMessage.style.fontSize = '16px';
        damageMessage.style.fontWeight = 'bold';
        playedCardsArea.appendChild(damageMessage);
        
        // Add explanation about turn switching to the opponent who passed
        const explanationText = document.createElement('div');
        explanationText.textContent = 'Opponent gets the next turn';
        explanationText.style.color = '#f39c12';
        explanationText.style.textAlign = 'center';
        explanationText.style.marginTop = '5px';
        explanationText.style.fontSize = '14px';
        playedCardsArea.appendChild(explanationText);
        
        // Add fade-out animation to stylesheet if it doesn't exist
        if (!document.getElementById('fadeOutAnimation')) {
            const style = document.createElement('style');
            style.id = 'fadeOutAnimation';
            style.textContent = `
                @keyframes fadeOut {
                    0% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log('Opponent passed and took damage - they get the next turn');
    });

    // Handle turn change
    socket.on('changeTurn', (data) => {
        const { nextPlayer, drawnCards } = data;
        
        console.log('Turn changed to player:', nextPlayer, 'Current seat:', gameState.playerSeat, 'Is player turn:', nextPlayer === gameState.playerSeat);
        
        // First forcefully clear any state in the played cards area
        playedCardsArea.innerHTML = '';
        
        // Reset all game state flags completely
        gameState.playedCards = [];
        gameState.isSubturn = false;
        gameState.waitingForReaction = false;
        gameState.lastPlayedCard = null;
        
        // Update turn state - explicitly set based on nextPlayer
        const isPlayerTurn = nextPlayer === gameState.playerSeat;
        gameState.isPlayerTurn = isPlayerTurn;
        
        // Update game phase based on whose turn it is
        if (isPlayerTurn) {
            // It's now player's turn
            gameState.gamePhase = "player-turn";
            
            // Forcefully update turn indicator visuals
            turnIndicator.textContent = 'Player Turn';
            turnIndicator.style.color = '#2ecc71'; // Green text  
            turnIndicator.style.display = 'block';
            turnIndicator.style.opacity = '1';
            
            console.log("Turn is now Player's Turn");
            
            // Add drawn cards to hand if any
            if (drawnCards && drawnCards.length > 0) {
                console.log("Adding drawn cards to player's hand:", drawnCards.length);
                const container = gameState.playerSeat === 1 ? player1Cards : player2Cards;
                drawnCards.forEach(card => createCardElement(card, container));
                
                // Show a message about drawing cards at the start of turn
                const drawMessage = document.createElement('div');
                drawMessage.textContent = `You drew ${drawnCards.length} card${drawnCards.length > 1 ? 's' : ''}`;
                drawMessage.style.color = '#4ecdc4';
                drawMessage.style.textAlign = 'center';
                drawMessage.style.marginTop = '15px';
                drawMessage.style.fontSize = '16px';
                drawMessage.style.fontWeight = 'bold';
                drawMessage.style.animation = 'fadeOut 3s forwards 2s';
                playedCardsArea.appendChild(drawMessage);
            }
        } else {
            // It's now opponent's turn
            gameState.gamePhase = "opponent-turn";
            
            // Forcefully update turn indicator visuals
            turnIndicator.textContent = 'Opponent Turn';
            turnIndicator.style.color = '#e74c3c'; // Red text
            turnIndicator.style.display = 'block';
            turnIndicator.style.opacity = '1';
            
            console.log("Turn is now Opponent's Turn");
            
            // Update opponent card count if they drew cards
            if (drawnCards && drawnCards.length > 0) {
                // Handle both formats: actual card objects or count objects
                const cardCount = drawnCards[0].count !== undefined 
                    ? drawnCards[0].count 
                    : drawnCards.length;
                
                console.log("Adding drawn cards to opponent's hand:", cardCount);
                gameState.opponentCardCount += cardCount;
                updateHealthDisplays();
                
                // Show a message about opponent drawing cards
                const drawMessage = document.createElement('div');
                drawMessage.textContent = `Opponent drew ${cardCount} card${cardCount > 1 ? 's' : ''}`;
                drawMessage.style.color = '#e74c3c';
                drawMessage.style.textAlign = 'center';
                drawMessage.style.marginTop = '15px';
                drawMessage.style.fontSize = '16px';
                drawMessage.style.fontWeight = 'bold';
                drawMessage.style.animation = 'fadeOut 3s forwards 2s';
                playedCardsArea.appendChild(drawMessage);
            }
        }
        
        console.log('Updated game phase to:', gameState.gamePhase, 'isPlayerTurn:', gameState.isPlayerTurn);
    });
    
    // Force update turn indicator when receiving specific turn change events
    socket.on('opponentTurn', () => {
        // Explicitly update game state for opponent's turn
        gameState.gamePhase = "opponent-turn";
        gameState.isPlayerTurn = false;
        
        // Update turn indicator
        turnIndicator.textContent = 'Opponent Turn';
        turnIndicator.style.color = '#e74c3c'; // Red for opponent's turn
        turnIndicator.style.display = 'block';
    });
    
    socket.on('playerTurn', () => {
        // Explicitly update game state for player's turn
        gameState.gamePhase = "player-turn";
        gameState.isPlayerTurn = true;
        
        // Update turn indicator
        turnIndicator.textContent = 'Player Turn';
        turnIndicator.style.color = '#2ecc71'; // Green for player's turn
        turnIndicator.style.display = 'block';
    });
    
    // Handle game over
    socket.on('gameOver', (data) => {
        const { winner, loser } = data;
        const isPlayerWinner = winner === gameState.playerSeat;
        const isPlayerLoser = loser === gameState.playerSeat;
        
        // Clear the played cards area
        playedCardsArea.innerHTML = '';
        
        // Create game over message
        const gameOverMessage = document.createElement('div');
        gameOverMessage.className = 'game-over-message';
        
        if (isPlayerWinner) {
            gameOverMessage.textContent = 'You Win!';
            gameOverMessage.style.color = '#2ecc71'; // Green for winning
        } else if (isPlayerLoser) {
            gameOverMessage.textContent = 'You Lose!';
            gameOverMessage.style.color = '#e74c3c'; // Red for losing
        } else {
            gameOverMessage.textContent = 'Game Over';
            gameOverMessage.style.color = 'white';
        }
        
        gameOverMessage.style.fontSize = '48px';
        gameOverMessage.style.fontWeight = 'bold';
        gameOverMessage.style.textAlign = 'center';
        gameOverMessage.style.padding = '20px';
        gameOverMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        gameOverMessage.style.borderRadius = '10px';
        gameOverMessage.style.position = 'absolute';
        gameOverMessage.style.top = '50%';
        gameOverMessage.style.left = '50%';
        gameOverMessage.style.transform = 'translate(-50%, -50%)';
        gameOverMessage.style.zIndex = '1000';
        gameOverMessage.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        gameOverMessage.style.animation = 'fadeIn 0.5s ease-in-out';
        
        // Add restart button
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Return to Lobby';
        restartButton.style.display = 'block';
        restartButton.style.margin = '20px auto 0';
        restartButton.style.padding = '10px 20px';
        restartButton.style.backgroundColor = '#3498db';
        restartButton.style.color = 'white';
        restartButton.style.border = 'none';
        restartButton.style.borderRadius = '5px';
        restartButton.style.cursor = 'pointer';
        restartButton.style.fontSize = '16px';
        
        // Add click handler to return to lobby
        restartButton.addEventListener('click', () => {
            window.location.reload(); // Reload the page to restart
        });
        
        gameOverMessage.appendChild(restartButton);
        document.querySelector('.game-container').appendChild(gameOverMessage);
        
        // Add fade-in animation to stylesheet if it doesn't exist
        if (!document.getElementById('fadeInAnimation')) {
            const style = document.createElement('style');
            style.id = 'fadeInAnimation';
            style.textContent = `
                @keyframes fadeIn {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Hide turn indicators and game elements
        turnIndicator.style.display = 'none';
        
        console.log(`Game over! Winner: Player ${winner}, Loser: Player ${loser}`);
    });
}); 