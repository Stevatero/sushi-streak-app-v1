import { io, Socket } from 'socket.io-client';

// Indirizzo del server backend
const SOCKET_URL = 'http://192.168.26.103:3000';

class SocketService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private playerId: string | null = null;

  // Inizializza la connessione socket
  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL);
      console.log('Socket connesso');
    }
    return this.socket;
  }

  // Unisciti a una sessione
  joinSession(sessionId: string, playerId: string, playerName?: string) {
    this.sessionId = sessionId;
    this.playerId = playerId;
    
    if (this.socket) {
      this.socket.emit('join_session', { sessionId, playerId, playerName });
    }
  }

  // Aggiungi un pezzo di sushi
  addPiece() {
    if (this.socket && this.sessionId && this.playerId) {
      this.socket.emit('add_piece', { 
        sessionId: this.sessionId, 
        playerId: this.playerId 
      });
    }
  }

  // Segnala che il giocatore ha finito
  finishGame() {
    if (this.socket && this.sessionId && this.playerId) {
      this.socket.emit('player_finished', { 
        sessionId: this.sessionId, 
        playerId: this.playerId 
      });
    }
  }

  // Ascolta gli aggiornamenti della sessione
  onSessionUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('session_update', callback);
    }
  }

  // Ascolta la fine del gioco
  onGameEnded(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('game_ended', callback);
    }
  }

  // Disconnetti il socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.sessionId = null;
      this.playerId = null;
    }
  }
}

// Esporta un'istanza singleton del servizio
export default new SocketService();