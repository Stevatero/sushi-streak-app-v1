// Gestore dei suoni dell'app (expo-audio)
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { preferences } from '../services/preferences';
import { logger } from './logger';

const PIECE_POOL_SIZE = 3;

class SoundManager {
  private static instance: SoundManager;
  private soundEnabled = true;
  private piecePool: AudioPlayer[] = [];
  private pieceIndex = 0;
  private victoryPlayer: AudioPlayer | null = null;

  private constructor() {
    this.loadSounds();
    preferences.getSoundEnabled().then((enabled) => {
      this.soundEnabled = enabled;
    });
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  // Precarica un piccolo pool di player per permettere suoni sovrapposti senza ricrearli a ogni tocco
  private loadSounds() {
    try {
      for (let i = 0; i < PIECE_POOL_SIZE; i++) {
        this.piecePool.push(createAudioPlayer(require('../../assets/sounds/piece.mp3')));
      }
    } catch (error) {
      logger.warn('Impossibile caricare il suono piece', error);
    }
    try {
      this.victoryPlayer = createAudioPlayer(require('../../assets/sounds/victory.mp3'));
    } catch (error) {
      logger.warn('Impossibile caricare il suono victory', error);
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    preferences.setSoundEnabled(enabled);
  }

  private play(player: AudioPlayer | null | undefined) {
    if (!this.soundEnabled || !player) return;
    try {
      player.seekTo(0);
      player.play();
    } catch (error) {
      logger.warn('Impossibile riprodurre il suono', error);
    }
  }

  public playPieceSound(): void {
    if (this.piecePool.length === 0) return;
    const player = this.piecePool[this.pieceIndex];
    this.pieceIndex = (this.pieceIndex + 1) % this.piecePool.length;
    this.play(player);
  }

  public playVictorySound(): void {
    this.play(this.victoryPlayer);
  }

  public unloadSounds(): void {
    [...this.piecePool, this.victoryPlayer].forEach((player) => {
      try {
        player?.remove();
      } catch (error) {
        logger.warn('Impossibile rilasciare il player', error);
      }
    });
    this.piecePool = [];
    this.victoryPlayer = null;
  }
}

export default SoundManager.getInstance();
