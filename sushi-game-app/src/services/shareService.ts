import { Share } from 'react-native';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const SERVER_URL = 'https://sushi.dietalab.net';

export interface ShareableSession {
  sessionId: string;
  sessionName: string;
  playersCount: number;
  isActive: boolean;
  players: Array<{
    name: string;
    score: number;
    finished: boolean;
  }>;
}

class ShareService {
  /**
   * Genera il link di condivisione per una sessione
   */
  generateShareLink(sessionId: string): string {
    return `${SERVER_URL}/join/${sessionId}`;
  }

  /**
   * Genera il deep link per aprire direttamente l'app
   */
  generateDeepLink(sessionId: string): string {
    return `sushi-streak://join/${sessionId}`;
  }

  /**
   * Ottiene le informazioni di una sessione per la condivisione
   */
  async getSessionInfo(sessionId: string): Promise<ShareableSession | null> {
    try {
      const response = await fetch(`${SERVER_URL}/api/sessions/${sessionId}/info`);
      
      if (!response.ok) {
        console.error('Errore nel recupero informazioni sessione:', response.status);
        return null;
      }
      
      const sessionInfo = await response.json();
      return sessionInfo;
    } catch (error) {
      console.error('Errore nella richiesta informazioni sessione:', error);
      return null;
    }
  }

  /**
   * Condivide una sessione utilizzando il sistema nativo di condivisione
   */
  async shareSession(sessionId: string, sessionName: string): Promise<boolean> {
    try {
      // Ottieni informazioni aggiornate sulla sessione
      const sessionInfo = await this.getSessionInfo(sessionId);
      
      if (!sessionInfo) {
        throw new Error('Impossibile ottenere le informazioni della sessione');
      }

      const shareLink = this.generateShareLink(sessionId);
      
      // Crea il messaggio di condivisione
      const message = this.createShareMessage(sessionInfo, shareLink);
      
      const result = await Share.share({
        message,
        url: shareLink, // Su iOS verrà utilizzato questo
        title: `🍣 Unisciti a "${sessionName}" su Sushi Streak!`
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Errore nella condivisione:', error);
      return false;
    }
  }

  /**
   * Copia il link di condivisione negli appunti
   */
  async copyShareLink(sessionId: string): Promise<boolean> {
    try {
      const shareLink = this.generateShareLink(sessionId);
      await Clipboard.setStringAsync(shareLink);
      return true;
    } catch (error) {
      console.error('Errore nella copia del link:', error);
      return false;
    }
  }

  /**
   * Copia il codice sessione negli appunti
   */
  async copySessionCode(sessionId: string): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(sessionId);
      return true;
    } catch (error) {
      console.error('Errore nella copia del codice:', error);
      return false;
    }
  }

  /**
   * Apre il link di condivisione nel browser
   */
  async openShareLink(sessionId: string): Promise<boolean> {
    try {
      const shareLink = this.generateShareLink(sessionId);
      const supported = await Linking.canOpenURL(shareLink);
      
      if (supported) {
        await Linking.openURL(shareLink);
        return true;
      } else {
        console.error('URL non supportato:', shareLink);
        return false;
      }
    } catch (error) {
      console.error('Errore nell\'apertura del link:', error);
      return false;
    }
  }

  /**
   * Verifica se una sessione può essere condivisa
   */
  async canShareSession(sessionId: string): Promise<boolean> {
    const sessionInfo = await this.getSessionInfo(sessionId);
    return sessionInfo !== null;
  }

  /**
   * Crea il messaggio di condivisione formattato
   */
  private createShareMessage(sessionInfo: ShareableSession, shareLink: string): string {
    const statusEmoji = sessionInfo.isActive ? '🟢' : '🔴';
    const statusText = sessionInfo.isActive ? 'Attiva' : 'Terminata';
    
    let message = `🍣 Sushi Streak - Unisciti alla partita!\n\n`;
    message += `📋 Sessione: ${sessionInfo.sessionName}\n`;
    message += `${statusEmoji} Stato: ${statusText}\n`;
    message += `👥 Giocatori: ${sessionInfo.playersCount}\n\n`;
    
    if (sessionInfo.players.length > 0) {
      message += `🏆 Classifica:\n`;
      sessionInfo.players
        .sort((a, b) => b.score - a.score)
        .forEach((player, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
          const finishedIcon = player.finished ? ' ✅' : '';
          message += `${medal} ${player.name}: ${player.score} 🍣${finishedIcon}\n`;
        });
      message += `\n`;
    }
    
    if (sessionInfo.isActive) {
      message += `🎮 Clicca il link per unirti automaticamente alla partita!\n`;
    } else {
      message += `📊 Guarda i risultati finali!\n`;
    }
    
    message += `🔗 ${shareLink}`;
    
    return message;
  }

  /**
   * Gestisce i deep link per unirsi a una sessione
   */
  async handleJoinLink(sessionId: string): Promise<{ success: boolean; sessionInfo?: ShareableSession }> {
    try {
      const sessionInfo = await this.getSessionInfo(sessionId);
      
      if (!sessionInfo) {
        return { success: false };
      }
      
      return { success: true, sessionInfo };
    } catch (error) {
      console.error('Errore nella gestione del link di join:', error);
      return { success: false };
    }
  }
}

// Esporta un'istanza singleton del servizio
export const shareService = new ShareService();
export default shareService;
