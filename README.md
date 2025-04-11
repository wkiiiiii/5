# Two Player Card Game

A web-based card game room for 2 players. When both seats are taken, players are dealt 5 random cards each. Now with online multiplayer support using Socket.IO!

## Features

- Two-player card game with online multiplayer
- Players can take seats by clicking "Take Seat" buttons
- When both seats are filled, the game automatically starts
- Each player is dealt 5 random cards
- Real-time updates via Socket.IO
- Supports playing from different browsers/devices

## Gameplay Mechanics

- Deck consists of 5 element types (gold, wood, water, fire, earth) with 20 cards each, plus 10 "miss" cards
- When it's a player's turn, they can choose any card they have, except miss cards
- Selected cards show a dotted line border to indicate they are selected
- Players must click the Confirm button to play their selected card
- The card played by the player is then displayed at the middle of the game board, showing which card the player played
- Players take turns playing cards
- Each player starts with 5 health points
- Game ends when a player's health reaches zero

## How to Use

### Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

3. Open your browser and go to:
   ```
   http://localhost:3000
   ```

4. Share your local IP address with another player to play together on the same network, or deploy to a hosting service for internet play.

### Playing the Game

1. Two players each open the game in their own browser
2. Each player clicks a "Take Seat" button to join
3. Enter your name when prompted
4. Once both seats are taken, the game will automatically start
5. Each player will be dealt 5 random cards
6. On your turn, select a card from your hand (except miss cards) - a dotted border will appear around the selected card
7. Click the Confirm button to play your selected card
8. Played cards appear in the center of the game board

## Tech Stack

- Node.js and Express.js for the server
- Socket.IO for real-time communication
- Vanilla HTML, CSS, and JavaScript for the front-end
- Custom elemental card deck (110 cards)
- Fisher-Yates algorithm for shuffling cards

## Deployment

To deploy this game online:

1. Push the code to a hosting service like Heroku, Vercel, or Railway
2. The PORT environment variable is automatically detected by the server 