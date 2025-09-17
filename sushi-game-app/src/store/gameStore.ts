import { create } from 'zustand';
import socketService from '../services/socketService';

// Tipi
export interface Player {
  id: string;
  name: string;
  score: number;
  finished: boolean;
}

interface GameState {
  sessionId: string | null;
  sessionName: string | null;
  playerId: string | null;
  playerName: string | null;
  isHost: boolean;
  players: Player[];
  gameEnded: boolean;
  
  // Azioni
  setSession: (sessionId: string, sessionName: string, playerId: string, playerName: string, isHost: boolean) => void;
  updatePlayers: (players: Player[]) => void;
  addPiece: () => void;
  finishGame: () => void;
  setGameEnded: (ended: boolean) => void;
  resetGame: () => void;
}

// Store Zustand
const useGameStore = create<GameState>((set, get) => ({
  sessionId: null,
  sessionName: null,
  playerId: null,
  playerName: null,
  isHost: false,
  players: [],
  gameEnded: false,
  
  setSession: (sessionId, sessionName, playerId, playerName, isHost) => {
    set({ sessionId, sessionName, playerId, playerName, isHost });
    
    // Connetti al socket e unisciti alla sessione
    socketService.connect();
    socketService.joinSession(sessionId, playerId, playerName);
    
    // Configura i listener per gli aggiornamenti
    socketService.onSessionUpdate((data) => {
      if (data.players) {
        get().updatePlayers(data.players);
      }
    });
    
    socketService.onGameEnded(() => {
      get().setGameEnded(true);
    });
  },
  
  updatePlayers: (players) => {
    set({ players });
  },
  
  addPiece: () => {
    socketService.addPiece();
  },
  
  finishGame: () => {
    socketService.finishGame();
  },
  
  setGameEnded: (ended) => {
    set({ gameEnded: ended });
  },
  
  resetGame: () => {
    socketService.disconnect();
    set({
      sessionId: null,
      sessionName: null,
      playerId: null,
      playerName: null,
      isHost: false,
      players: [],
      gameEnded: false
    });
  }
}));

export default useGameStore;