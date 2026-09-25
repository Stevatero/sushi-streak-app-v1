import { create } from 'zustand';
import socketService, { AckResponse, ConnectionStatus, Player, SessionSnapshot } from '../services/socketService';

export type { Player } from '../services/socketService';

export type SessionEndReason = 'ended' | 'expired' | 'unauthorized' | 'not_found' | null;

interface StartSessionParams {
  sessionId: string;
  sessionName: string;
  playerId: string;
  playerName: string;
  playerToken: string;
  isHost: boolean;
}

interface GameState {
  sessionId: string | null;
  sessionName: string | null;
  playerId: string | null;
  playerName: string | null;
  isHost: boolean;
  players: Player[];
  status: SessionSnapshot['status'] | null;
  expiresAt: number | null;
  connection: ConnectionStatus;
  gameEnded: boolean;
  endReason: SessionEndReason;

  startSession: (params: StartSessionParams) => void;
  addPiece: () => Promise<AckResponse>;
  removePiece: () => Promise<AckResponse>;
  finishGame: () => Promise<AckResponse>;
  resetGame: () => void;
}

const initialState = {
  sessionId: null,
  sessionName: null,
  playerId: null,
  playerName: null,
  isHost: false,
  players: [] as Player[],
  status: null,
  expiresAt: null,
  connection: 'disconnected' as ConnectionStatus,
  gameEnded: false,
  endReason: null as SessionEndReason,
};

const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  startSession: ({ sessionId, sessionName, playerId, playerName, playerToken, isHost }) => {
    const current = get();
    if (current.sessionId !== sessionId || current.playerId !== playerId) {
      set({ ...initialState, connection: socketService.getStatus() });
    }
    set({ sessionId, sessionName, playerId, playerName, isHost });
    socketService.joinSession({ sessionId, playerId, token: playerToken });
  },

  addPiece: () => socketService.addPiece(),
  removePiece: () => socketService.removePiece(),
  finishGame: () => socketService.finishGame(),

  resetGame: () => {
    socketService.leaveSession();
    set({ ...initialState });
  },
}));

// Gli eventi del socket vengono collegati allo store una sola volta
const applySnapshot = (snapshot: SessionSnapshot) => {
  const { sessionId } = useGameStore.getState();
  if (!sessionId || snapshot.id !== sessionId) return;
  const ended = snapshot.status !== 'active';
  useGameStore.setState({
    players: snapshot.players,
    status: snapshot.status,
    expiresAt: snapshot.expiresAt,
    gameEnded: ended,
    endReason: ended ? (snapshot.status as SessionEndReason) : null,
  });
};

socketService.on('session', applySnapshot);
socketService.on('gameEnded', applySnapshot);
socketService.on('connection', (connection) => useGameStore.setState({ connection }));
socketService.on('sessionExpired', ({ sessionId }) => {
  if (useGameStore.getState().sessionId === sessionId) {
    useGameStore.setState({ status: 'expired', gameEnded: true, endReason: 'expired' });
  }
});
socketService.on('joinFailed', (response) => {
  if (response.code === 'unauthorized' || response.code === 'not_found') {
    useGameStore.setState({ gameEnded: true, endReason: response.code });
  }
});

export default useGameStore;
