// Gestore del suono per l'app
// Migrato da expo-av a expo-audio per compatibilità con SDK 54+
import { createAudioPlayer } from 'expo-audio';

class SoundManager {
  private static instance: SoundManager;
  private soundEnabled: boolean = true;
  private players: { [key: string]: any | null } = {};
  private soundsLoaded: boolean = false;

  private constructor() {
    this.loadSounds();
  }

  private async loadSounds() {
    try {
      // Precarica i suoni con gestione degli errori migliorata usando expo-audio
      try {
        const piecePlayer = createAudioPlayer(require('../../assets/sounds/piece.mp3'));
        this.players['piece'] = piecePlayer;
      } catch (pieceError) {
        console.warn('Impossibile caricare il suono piece:', pieceError);
        this.players['piece'] = null;
      }

      try {
        const victoryPlayer = createAudioPlayer(require('../../assets/sounds/victory.mp3'));
        this.players['victory'] = victoryPlayer;
      } catch (victoryError) {
        console.warn('Impossibile caricare il suono victory:', victoryError);
        this.players['victory'] = null;
      }

      this.soundsLoaded = true;
    } catch (error) {
      console.error('Errore nel caricamento dei suoni:', error);
      this.soundsLoaded = false;
    }
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  public async playPieceSound(): Promise<void> {
    if (!this.soundEnabled || !this.soundsLoaded) return;
    
    try {
      // Crea un nuovo player per ogni riproduzione per permettere sovrapposizioni
      const newPlayer = createAudioPlayer(require('../../assets/sounds/piece.mp3'));
      if (newPlayer) {
        try {
          newPlayer.play();
          
          // Rilascia automaticamente il player dopo la riproduzione
          setTimeout(() => {
            newPlayer.release?.();
          }, 2000); // Rilascia dopo 2 secondi (durata stimata del suono)
        } catch (error) {
          console.warn('Impossibile riprodurre il suono piece:', error);
        }
      }
    } catch (error) {
      console.error('Errore nella riproduzione del suono:', error);
    }
  }

  public async playVictorySound(): Promise<void> {
    if (!this.soundEnabled || !this.soundsLoaded) return;
    
    try {
      const player = this.players['victory'];
      if (player) {
        try {
          // Con expo-audio, resettiamo la posizione e riproduciamo
          player.seekTo(0);
          player.play();
        } catch (error) {
          // Gestione silenziosa dell'errore per non interrompere l'esperienza utente
          console.warn('Impossibile riprodurre il suono victory:', error);
        }
      }
    } catch (error) {
      console.error('Errore nella riproduzione del suono:', error);
    }
  }

  public async unloadSounds(): Promise<void> {
    try {
      for (const key in this.players) {
        if (this.players[key]) {
          try {
            // Con expo-audio, utilizziamo release() per liberare le risorse
            await this.players[key]?.release();
          } catch (error) {
            console.warn(`Impossibile rilasciare il player ${key}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Errore nel rilascio dei player:', error);
    }
  }
}

export default SoundManager.getInstance();