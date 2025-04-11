# Element Card Game - Game Summary

## Game Overview
This is a strategic two-player card game where players take turns playing element cards and reacting to opponents' plays. The goal is to reduce your opponent's health to zero by forcing them to take damage when they cannot respond with matching cards.

## Card Types
- **Element Cards**: Gold, Wood, Water, Fire, Earth
- **Miss Cards**: Special cards that can only be used as reactions

## Setup
- Each player starts with 5 health points
- 5 cards are initially dealt to each player
- The starting player is randomly determined

## Game Flow
The game follows a clear turn structure:

### Player Turn
1. **Active Phase**: The player can play one element card (Miss cards cannot be played directly)
2. **Response Phase**: When a player plays a card, their opponent must respond by either:
   - Playing a matching card of the same element type
   - Passing and taking 1 damage

### Turn Switching
- **After Response**: When an opponent responds with a matching card, the turn switches to them
- **After Pass**: When an opponent passes and takes damage, the turn also switches to them

## Visual Interface

### Game Board
- Players' cards are displayed at the bottom of the screen
- The play area is positioned in the center, 3cm higher than center
- Cards in play are shown at 70% of their original size
- Player labels appear at the bottom of cards

### Status Indicators
- **Turn Indicator**: Located in the top left corner
  - "Player Turn" (green) - When it's your turn to play
  - "Opponent Turn" (red) - When it's opponent's turn
  - Additional context like "(Waiting for reaction)" or "(Your Reaction)" is shown when appropriate

### Health and Card Information
- **Player Health**: Displayed at the bottom left
- **Opponent Information**: Shows opponent's health and card count at the top of the screen

## Strategic Elements
- Deciding when to play valuable element cards
- Choosing whether to respond with a matching card or take damage
- Managing your hand to ensure you have response options
- Anticipating opponent's plays and conserving appropriate cards for response

## Game End
- The game ends when one player's health reaches zero
- The player who maintains health points wins

## Implementation Details
- Built using Socket.io for real-time player communication
- Client-side interface with JavaScript, HTML, and CSS
- Server manages game state, card dealing, and turn management
- Visual feedback for card plays, health changes, and turn switching 