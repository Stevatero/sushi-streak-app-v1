import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedSession {
  id: string;
  sessionName: string;
  restaurant: string;
  date: string;
  players: Array<{
    id: string;
    name: string;
    score: number;
    finished: boolean;
  }>;
  winner: {
    name: string;
    score: number;
  };
  duration?: string;
}

const STORAGE_KEY = 'saved_sessions';

export class SessionStorageService {
  static async saveSession(session: SavedSession): Promise<void> {
    try {
      const existingSessions = await this.getSavedSessions();
      const updatedSessions = [session, ...existingSessions];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('Errore nel salvare la sessione:', error);
      throw new Error('Impossibile salvare la sessione');
    }
  }

  static async getSavedSessions(): Promise<SavedSession[]> {
    try {
      const sessionsJson = await AsyncStorage.getItem(STORAGE_KEY);
      return sessionsJson ? JSON.parse(sessionsJson) : [];
    } catch (error) {
      console.error('Errore nel recuperare le sessioni:', error);
      return [];
    }
  }

  static async deleteSession(sessionId: string): Promise<void> {
    try {
      const existingSessions = await this.getSavedSessions();
      const filteredSessions = existingSessions.filter(session => session.id !== sessionId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSessions));
    } catch (error) {
      console.error('Errore nell\'eliminare la sessione:', error);
      throw new Error('Impossibile eliminare la sessione');
    }
  }

  static async clearAllSessions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Errore nel pulire le sessioni:', error);
      throw new Error('Impossibile eliminare tutte le sessioni');
    }
  }

  static formatDate(date: Date): string {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static generateSessionId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}