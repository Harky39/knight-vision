/* KnightVision Opening Intelligence
 * Local recognition layer for common opening families and variations.
 * This is intentionally lightweight; statistical book moves continue to
 * come from the opening explorer when available.
 */
const KNIGHTVISION_OPENING_BOOK = [
  // King's Pawn openings
  { moves: ['e2e4','e7e5','g1f3','b8c6','f1b5'], name: 'Ruy Lopez', family: 'King\'s Pawn' },
  { moves: ['e2e4','e7e5','g1f3','b8c6','f1c4'], name: 'Italian Game', family: 'King\'s Pawn' },
  { moves: ['e2e4','e7e5','g1f3','b8c6','d2d4'], name: 'Scotch Game', family: 'King\'s Pawn' },
  { moves: ['e2e4','e7e5','g1f3','f8c5'], name: 'King\'s Pawn Game: Italian Setup', family: 'King\'s Pawn' },
  { moves: ['e2e4','e7e5','g1f3','g8f6'], name: 'Petrov Defence', family: 'King\'s Pawn' },
  { moves: ['e2e4','e7e6'], name: 'French Defence', family: 'Semi-Open Game' },
  { moves: ['e2e4','c7c6'], name: 'Caro-Kann Defence', family: 'Semi-Open Game' },
  { moves: ['e2e4','c7c5'], name: 'Sicilian Defence', family: 'Semi-Open Game' },
  { moves: ['e2e4','d7d6'], name: 'Pirc Defence', family: 'Semi-Open Game' },
  { moves: ['e2e4','g7g6'], name: 'Modern Defence', family: 'Semi-Open Game' },
  { moves: ['e2e4','b8c6'], name: 'Nimzowitsch Defence', family: 'Semi-Open Game' },

  // Queen's Pawn openings
  { moves: ['d2d4','d7d5','c2c4','e7e6'], name: 'Queen\'s Gambit Declined', family: 'Queen\'s Gambit' },
  { moves: ['d2d4','d7d5','c2c4','d5c4'], name: 'Queen\'s Gambit Accepted', family: 'Queen\'s Gambit' },
  { moves: ['d2d4','d7d5','c2c4'], name: 'Queen\'s Gambit', family: 'Queen\'s Pawn' },
  { moves: ['d2d4','g8f6','c2c4','e7e6','g1f3','b7b6'], name: 'Queen\'s Indian Defence', family: 'Indian Defence' },
  { moves: ['d2d4','g8f6','c2c4','g7g6','b1c3','f8g7'], name: 'King\'s Indian Defence', family: 'Indian Defence' },
  { moves: ['d2d4','g8f6','c2c4','e7e6','b1c3','f8b4'], name: 'Nimzo-Indian Defence', family: 'Indian Defence' },
  { moves: ['d2d4','g8f6','g1f3','g7g6','c2c4','f8g7'], name: 'King\'s Indian Defence', family: 'Indian Defence' },
  { moves: ['d2d4','g8f6','g1f3','e7e6','c2c4','b7b6'], name: 'Queen\'s Indian Defence', family: 'Indian Defence' },
  { moves: ['d2d4','g8f6','g1f3','d7d5','c1f4'], name: 'London System', family: 'Queen\'s Pawn' },
  { moves: ['d2d4','g8f6','g1f3','e7e6','c1f4'], name: 'London System', family: 'Queen\'s Pawn' },
  { moves: ['d2d4','d7d5','c1f4'], name: 'London System', family: 'Queen\'s Pawn' },
  { moves: ['d2d4','g8f6','c2c4','c7c5'], name: 'Benoni Defence', family: 'Indian Defence' },
  { moves: ['d2d4','g8f6','c2c4','c7c6'], name: 'Slav Defence', family: 'Queen\'s Gambit' },

  // Flank openings
  { moves: ['c2c4','e7e5'], name: 'English Opening: Reversed Sicilian', family: 'Flank Opening' },
  { moves: ['c2c4','g8f6','b1c3'], name: 'English Opening', family: 'Flank Opening' },
  { moves: ['g1f3','d7d5','d2d4'], name: 'Zukertort Opening', family: 'Flank Opening' },
  { moves: ['g1f3','d7d5','c2c4'], name: 'Réti Opening', family: 'Flank Opening' },

  // Scandinavian / Dutch
  { moves: ['e2e4','d7d5'], name: 'Scandinavian Defence', family: 'Semi-Open Game' },
  { moves: ['d2d4','f7f5'], name: 'Dutch Defence', family: 'Semi-Open Game' }
];

function knightVisionFindOpening(moveHistory) {
  if (!Array.isArray(moveHistory) || moveHistory.length === 0) return null;

  let best = null;
  for (const opening of KNIGHTVISION_OPENING_BOOK) {
    if (opening.moves.length > moveHistory.length) continue;
    let matches = true;
    for (let i = 0; i < opening.moves.length; i++) {
      if (opening.moves[i] !== moveHistory[i]) {
        matches = false;
        break;
      }
    }
    if (matches && (!best || opening.moves.length > best.moves.length)) {
      best = opening;
    }
  }
  return best;
}
