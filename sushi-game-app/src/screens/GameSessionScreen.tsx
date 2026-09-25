import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme, Button, Card, TextInput, Snackbar } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import useGameStore, { Player } from '../store/gameStore';
import SushiStack from '../components/SushiStack';
import Fireworks from '../components/Fireworks';
import SettingsButton from '../components/SettingsButton';
import SoundManager from '../utils/SoundManager';
import { useColorScheme } from '../theme/ThemeProvider';
import { SessionStorageService, SavedSession } from '../services/sessionStorage';
import { shareService } from '../services/shareService';
import type { RootNavigationProp, RootStackParamList } from '../navigation/types';

const FIREWORKS_DURATION_MS = 6000;

const GameSessionScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'GameSession'>>();
  const navigation = useNavigation<RootNavigationProp>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useColorScheme();
  const { sessionId, sessionName, playerName, playerId, playerToken, isHost } = route.params;

  const { players, gameEnded, endReason, connection, status, startSession, addPiece, removePiece, finishGame } =
    useGameStore(
      useShallow((s) => ({
        players: s.players,
        gameEnded: s.gameEnded,
        endReason: s.endReason,
        connection: s.connection,
        status: s.status,
        startSession: s.startSession,
        addPiece: s.addPiece,
        removePiece: s.removePiece,
        finishGame: s.finishGame,
      }))
    );

  const [sushiIconAnimation] = useState(() => new Animated.Value(1));
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [finishRequested, setFinishRequested] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [snackbar, setSnackbar] = useState('');

  const startedAtRef = useRef<string>(new Date().toISOString());
  const restaurantRef = useRef('');
  const allowExitRef = useRef(false);
  const endHandledRef = useRef(false);
  // Salvataggio iniziale della sessione attiva: la pulizia di fine partita deve avvenire dopo
  const activeSavedRef = useRef<Promise<void>>(Promise.resolve());

  const me = players.find((p) => p.id === playerId);
  const myScore = me?.score ?? 0;
  const hasFinished = finishRequested || !!me?.finished;
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
  const myRank = sortedPlayers.findIndex((p) => p.id === playerId) + 1;
  const winner = sortedPlayers[0];
  const isOnline = connection === 'connected';
  const canShare = status === 'active' && !gameEnded;

  // Avvio o ripresa della partita: il socket si (ri)collega con le credenziali del giocatore
  useEffect(() => {
    startSession({ sessionId, sessionName, playerId, playerName, playerToken, isHost });

    activeSavedRef.current = (async () => {
      const saved = await SessionStorageService.getActiveSession();
      // In caso di riconnessione si conserva l'orario di inizio originale
      if (saved?.sessionId === sessionId && saved.playerId === playerId && saved.startedAt) {
        startedAtRef.current = saved.startedAt;
      }
      await SessionStorageService.saveActiveSession({
        sessionId,
        sessionName,
        playerId,
        playerName,
        playerToken,
        isHost,
        startedAt: startedAtRef.current,
      });
    })();

    // All'uscita dalla schermata si abbandona la stanza e si chiude il socket
    return () => useGameStore.getState().resetGame();
  }, [sessionId, sessionName, playerId, playerName, playerToken, isHost, startSession]);

  // Uscita con conferma (tasto indietro Android): la partita resta riprendibile dalla Home
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (allowExitRef.current || gameEnded) return;
      e.preventDefault();
      Alert.alert('Uscire dalla partita?', 'Potrai rientrare dalla Home finché la sessione è attiva.', [
        { text: 'Resta', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: () => {
            allowExitRef.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
  }, [navigation, gameEnded]);

  const persistResult = useCallback(
    async (list: Player[]) => {
      if (list.length === 0) return;
      const sorted = [...list].sort((a, b) => b.score - a.score);
      const record: SavedSession = {
        id: `${sessionId}:${startedAtRef.current}`,
        sessionName,
        restaurant: restaurantRef.current,
        date: startedAtRef.current,
        players: sorted,
        winner: { name: sorted[0]?.name || 'Nessuno', score: sorted[0]?.score || 0 },
        duration: SessionStorageService.formatDuration(startedAtRef.current),
      };
      try {
        await SessionStorageService.upsertSession(record);
      } catch {
        setSnackbar('Impossibile salvare la partita nello storico');
      }
    },
    [sessionId, sessionName]
  );

  // Salvataggio automatico nello storico quando il giocatore ha finito o la partita è chiusa
  useEffect(() => {
    if (hasFinished || gameEnded) persistResult(players);
  }, [players, hasFinished, gameEnded, persistResult]);

  // Gestione della fine partita (tutti hanno finito, scadenza o credenziali non valide)
  useEffect(() => {
    if (!gameEnded || endHandledRef.current) return;
    endHandledRef.current = true;
    activeSavedRef.current.then(() => SessionStorageService.clearActiveSession());

    if (endReason === 'ended') {
      setShowLeaderboardModal(true);
      if (winner?.id === playerId) {
        SoundManager.playVictorySound();
        setShowFireworks(true);
        setTimeout(() => setShowFireworks(false), FIREWORKS_DURATION_MS);
      }
    } else if (endReason === 'expired') {
      Alert.alert(
        'Sessione scaduta',
        'La sessione è stata chiusa per inattività. I punteggi sono stati salvati nello storico.'
      );
    } else if (endReason === 'unauthorized' || endReason === 'not_found') {
      Alert.alert('Sessione non disponibile', 'Non è possibile rientrare in questa partita.', [
        { text: 'OK', onPress: () => goHome() },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameEnded, endReason]);

  const goHome = () => {
    allowExitRef.current = true;
    navigation.popTo('Home');
  };

  const handleAddPiece = async () => {
    if (!isOnline) {
      setSnackbar('Sei offline: attendi la riconnessione');
      return;
    }
    SoundManager.playPieceSound();
    Animated.sequence([
      Animated.timing(sushiIconAnimation, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(sushiIconAnimation, { toValue: 1.2, duration: 200, useNativeDriver: true }),
      Animated.timing(sushiIconAnimation, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    const res = await addPiece();
    if (!res.ok && res.code !== 'rate_limited') setSnackbar(res.error || 'Pezzo non registrato');
  };

  const handleRemovePiece = async () => {
    const res = await removePiece();
    setSnackbar(res.ok ? 'Ultimo pezzo annullato' : res.error || 'Impossibile annullare');
  };

  const handleFinish = () => {
    Alert.alert('Hai finito di mangiare?', 'Dopo la conferma non potrai più aggiungere pezzi.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Ho finito!',
        onPress: async () => {
          setFinishRequested(true);
          const res = await finishGame();
          if (!res.ok) {
            setFinishRequested(false);
            setSnackbar(res.error || 'Impossibile completare, riprova');
            return;
          }
          SoundManager.playVictorySound();
          setShowLeaderboardModal(true);
        },
      },
    ]);
  };

  const copySessionCode = async () => {
    const success = await shareService.copySessionCode(sessionId);
    setShowShareModal(false);
    setSnackbar(success ? 'Codice sessione copiato!' : 'Impossibile copiare il codice');
  };

  const shareSessionLink = async () => {
    const result = await shareService.shareSession(sessionId, sessionName);
    setShowShareModal(false);
    if (result === 'error') setSnackbar('Impossibile condividere la sessione');
  };

  const saveRestaurant = async () => {
    restaurantRef.current = restaurantName.trim();
    await persistResult(useGameStore.getState().players);
    setShowSaveModal(false);
    setSnackbar('Partita salvata nello storico');
  };

  const textColor = isDarkMode ? '#FFFFFF' : theme.colors.onSurface;

  const renderPlayerRow = (item: Player, index: number, large = false) => (
    <View
      style={[
        large ? styles.modalPlayerRow : styles.playerRow,
        { borderBottomColor: theme.colors.outlineVariant },
        item.id === playerId ? { backgroundColor: theme.colors.primaryContainer } : null,
      ]}
    >
      <Text style={[large ? styles.modalRank : styles.rank, { color: large ? theme.colors.primary : textColor }]}>
        {index + 1}°
      </Text>
      <Text style={[large ? styles.modalPlayerName : styles.playerName, { color: textColor }]} numberOfLines={1}>
        {item.name}
        {item.id === playerId ? ' (tu)' : ''}
      </Text>
      <Text style={[large ? styles.modalScore : styles.score, { color: textColor }]}>{item.score} 🍣</Text>
      {!large && item.finished && <Text style={styles.finishedTag}>Finito</Text>}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom },
      ]}
    >
      <SushiStack pieceCount={myScore} />
      <Fireworks isVisible={showFireworks} />

      {!isOnline && !gameEnded && (
        <View style={[styles.connectionBanner, { backgroundColor: theme.colors.errorContainer }]}>
          <Text style={{ color: theme.colors.onErrorContainer, textAlign: 'center' }}>
            {connection === 'connecting' ? '🔄 Riconnessione in corso…' : '⚠️ Non connesso al server'}
          </Text>
        </View>
      )}

      <Text style={[styles.sessionLabel, { color: theme.colors.onSurface }]}>Sessione</Text>
      <TouchableOpacity
        onPress={canShare ? () => setShowShareModal(true) : undefined}
        disabled={!canShare}
        style={styles.sessionTitleContainer}
        accessibilityRole="button"
        accessibilityLabel="Condividi la sessione"
      >
        <Text
          style={[
            styles.title,
            {
              color: canShare ? theme.colors.primary : theme.colors.onSurface,
              textDecorationLine: canShare ? 'underline' : 'none',
            },
          ]}
        >
          {sessionName || sessionId}
        </Text>
        {canShare && <Text style={[styles.shareHint, { color: theme.colors.onSurfaceVariant }]}>👆 Condividi</Text>}
      </TouchableOpacity>

      <Card style={styles.leaderboardCard}>
        <Card.Title
          title="Classifica in tempo reale"
          subtitle={myRank > 0 ? `Sei ${myRank}° su ${players.length} · ${myScore} pezzi` : undefined}
        />
        <Card.Content>
          <FlatList
            data={sortedPlayers}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => renderPlayerRow(item, index)}
            style={styles.liveList}
          />
        </Card.Content>
      </Card>

      {!gameEnded ? (
        <>
          <View style={styles.controlsContainer}>
            {!hasFinished && (
              <>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: theme.colors.primary, opacity: isOnline ? 1 : 0.6 }]}
                  onPress={handleAddPiece}
                  accessibilityRole="button"
                  accessibilityLabel="Aggiungi pezzo"
                >
                  <Animated.Text
                    style={[
                      styles.sushiIcon,
                      { transform: [{ scale: sushiIconAnimation }], opacity: sushiIconAnimation },
                    ]}
                  >
                    🍣
                  </Animated.Text>
                  <Text style={styles.addButtonText}>Aggiungi Pezzo</Text>
                </TouchableOpacity>
                <Button mode="text" icon="undo" onPress={handleRemovePiece} disabled={myScore === 0 || !isOnline}>
                  Annulla ultimo
                </Button>
              </>
            )}
            {hasFinished && (
              <Text style={[styles.waitingText, { color: theme.colors.onSurface }]}>
                Hai finito! In attesa degli altri giocatori…
              </Text>
            )}
          </View>

          <Button
            mode="outlined"
            onPress={handleFinish}
            disabled={hasFinished}
            style={[
              styles.finishButtonBottomLeft,
              {
                bottom: 20 + insets.bottom,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.8)',
              },
            ]}
          >
            Ho finito!
          </Button>
        </>
      ) : (
        <View style={styles.gameEndedContainer}>
          <Text style={[styles.gameEndedText, { color: theme.colors.primary }]}>
            {endReason === 'expired' ? 'Sessione scaduta' : 'Partita terminata!'}
          </Text>
          <Text style={[styles.winnerText, { color: theme.colors.secondary }]}>
            Vincitore: {winner?.name || 'Nessuno'} con {winner?.score || 0} pezzi!
          </Text>
          <Button mode="outlined" onPress={() => setShowSaveModal(true)} style={styles.modalButton}>
            📍 Aggiungi ristorante
          </Button>
          <Button mode="contained" onPress={goHome} style={styles.newGameButton}>
            🎮 Nuova Partita
          </Button>
        </View>
      )}

      {/* Modale della classifica finale */}
      <Modal
        visible={showLeaderboardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLeaderboardModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
              {gameEnded ? '🏆 Classifica Finale' : '🏆 Classifica attuale'}
            </Text>

            <FlatList
              data={sortedPlayers}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => renderPlayerRow(item, index, true)}
              style={styles.leaderboardList}
            />

            <Text style={[styles.savedNote, { color: theme.colors.onSurfaceVariant }]}>
              La partita viene salvata automaticamente nello storico.
            </Text>

            <View style={styles.modalButtons}>
              <Button mode="outlined" onPress={() => setShowLeaderboardModal(false)} style={styles.modalButton}>
                Chiudi
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowLeaderboardModal(false);
                  setShowSaveModal(true);
                }}
                style={styles.modalButton}
              >
                📍 Aggiungi ristorante
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  setShowLeaderboardModal(false);
                  goHome();
                }}
                style={styles.modalButton}
              >
                🎮 Nuova Partita
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modale per il nome del ristorante */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSaveModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>📍 Dove avete mangiato?</Text>

              <TextInput
                mode="outlined"
                label="Nome del ristorante"
                placeholder="Es. Sushi Zen, Sakura, ..."
                value={restaurantName}
                onChangeText={setRestaurantName}
                style={styles.restaurantInput}
                maxLength={60}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveRestaurant}
              />

              <View style={styles.saveModalInfo}>
                <Text style={[styles.saveInfoLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Sessione: {sessionName}
                </Text>
                <Text style={[styles.saveInfoLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Data: {SessionStorageService.formatDate(startedAtRef.current)}
                </Text>
                <Text style={[styles.saveInfoLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Vincitore: {winner?.name || 'Nessuno'} ({winner?.score || 0} pezzi)
                </Text>
              </View>

              <View style={styles.modalButtons}>
                <Button mode="outlined" onPress={() => setShowSaveModal(false)} style={styles.modalButton}>
                  Annulla
                </Button>
                <Button mode="contained" onPress={saveRestaurant} style={styles.modalButton}>
                  Salva
                </Button>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modale di condivisione */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
        statusBarTranslucent
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowShareModal(false)}>
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>🍣 Condividi Sessione</Text>
            <Text style={[styles.saveModalDescription, { color: theme.colors.onSurface }]}>
              Codice: <Text style={{ fontWeight: 'bold' }}>{sessionId}</Text>
            </Text>
            <View style={styles.shareModalButtons}>
              <Button mode="contained" onPress={copySessionCode} style={styles.shareModalButton} icon="content-copy">
                Copia Codice
              </Button>
              <Button mode="contained" onPress={shareSessionLink} style={styles.shareModalButton} icon="share-variant">
                Condividi Link
              </Button>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <View style={[styles.settingsButtonContainer, { bottom: 20 + insets.bottom }]}>
        <SettingsButton />
      </View>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={2500} style={styles.snackbar}>
        {snackbar}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  connectionBanner: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  sessionLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 2,
    opacity: 0.7,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sessionTitleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  shareHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  leaderboardCard: {
    marginBottom: 16,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  liveList: {
    maxHeight: 200,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 6,
    marginBottom: 4,
  },
  rank: {
    width: 34,
    fontWeight: 'bold',
    fontSize: 16,
  },
  playerName: {
    flex: 1,
    fontSize: 16,
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  finishedTag: {
    fontSize: 12,
    color: 'green',
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 200, 0, 0.1)',
  },
  controlsContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  addButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    marginBottom: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sushiIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  waitingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.8,
  },
  finishButtonBottomLeft: {
    position: 'absolute',
    left: 20,
    borderRadius: 30,
    paddingVertical: 6,
    zIndex: 1,
  },
  gameEndedContainer: {
    alignItems: 'center',
    marginTop: 10,
    padding: 20,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  gameEndedText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  winnerText: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  newGameButton: {
    marginTop: 12,
    paddingHorizontal: 50,
    paddingVertical: 15,
    borderRadius: 30,
    minWidth: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 5,
  },
  modalRank: {
    width: 40,
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalPlayerName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
  },
  modalScore: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  savedNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'column',
    marginTop: 16,
    gap: 10,
  },
  modalButton: {
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 6,
    minWidth: 120,
  },
  leaderboardList: {
    maxHeight: 300,
    marginBottom: 10,
  },
  saveModalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  restaurantInput: {
    marginBottom: 20,
  },
  saveModalInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 15,
    borderRadius: 10,
  },
  saveInfoLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  settingsButtonContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  shareModalButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 15,
    marginTop: 10,
  },
  shareModalButton: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 30,
  },
  snackbar: {
    marginBottom: 80,
  },
});

export default GameSessionScreen;
