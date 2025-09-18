import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Modal, Share, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme, Button, Card, TextInput } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import useGameStore from '../store/gameStore';
import SushiAnimation from '../components/SushiAnimation';
import SushiStack from '../components/SushiStack';
import Fireworks from '../components/Fireworks';
import SettingsButton from '../components/SettingsButton';
import SoundManager from '../utils/SoundManager';
import { useColorScheme } from '../theme/ThemeProvider';
import { SessionStorageService, SavedSession } from '../services/sessionStorage';
import shareService from '../services/shareService';

const GameSessionScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const theme = useTheme();
  const { isDarkMode } = useColorScheme();
  const { sessionId, sessionName, playerName, isHost, playerId } = route.params as any;
  
  // Stato globale con Zustand
  const { 
    players, 
    gameEnded, 
    setSession, 
    addPiece: addPieceToStore, 
    finishGame: finishGameInStore 
  } = useGameStore();
  
  // Stato locale per le animazioni
  const [animation] = useState(new Animated.Value(1));
  const [sushiIconAnimation] = useState(new Animated.Value(1));
  const [showSushiAnimation, setShowSushiAnimation] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [sessionStartTime] = useState(new Date());
  
  // Stati per il salvataggio della sessione
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Calcola se sono passati più di 10 minuti dall'inizio della sessione
  const isSessionExpired = (Date.now() - sessionStartTime.getTime()) > 10 * 60 * 1000;
  
  // Determina se la condivisione è disponibile
  const canShare = sessionId && !gameEnded && !isSessionExpired;
  
  // Inizializza la sessione quando il componente viene montato
  useEffect(() => {
    // Usa il playerId dal backend se disponibile, altrimenti genera uno nuovo
    const finalPlayerId = playerId || 'player-' + Date.now();
    setSession(sessionId, sessionName, finalPlayerId, playerName, isHost);
  }, []);

  // Funzione per aggiungere un pezzo di sushi
  const addPiece = () => {
    addPieceToStore();
    
    // Riproduci il suono del pezzo
    SoundManager.playPieceSound();
    
    // Animazione di pop dell'icona sushi (scomparsa e riapparizione)
    Animated.sequence([
      Animated.timing(sushiIconAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(sushiIconAnimation, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sushiIconAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Funzione per segnalare che il giocatore ha finito
  const finishGame = () => {
    setHasFinished(true); // Nascondi immediatamente il pulsante "Aggiungi pezzo"
    finishGameInStore();
    // Riproduci il suono di vittoria
    SoundManager.playVictorySound();
    // Mostra la modale della classifica
    setShowLeaderboardModal(true);
  };

  // Funzione per condividere la sessione
  const shareSession = async () => {
    try {
      if (!sessionId || !sessionName) {
        Alert.alert('Errore', 'Dati della sessione non disponibili');
        return;
      }

      // Verifica se la sessione può essere condivisa
      const canShare = await shareService.canShareSession(sessionId);
      
      if (!canShare) {
        Alert.alert(
          'Sessione non disponibile',
          'La sessione non è più disponibile per la condivisione.'
        );
        return;
      }

      // Mostra il modale di condivisione
      setShowShareModal(true);

    } catch (error) {
      console.error('Errore nella condivisione:', error);
      Alert.alert('Errore', 'Si è verificato un errore durante la condivisione');
    }
  };

  // Funzione per copiare il codice sessione
  const copySessionCode = async () => {
    try {
      const success = await shareService.copySessionCode(sessionId);
      
      if (success) {
        Alert.alert('✅ Copiato', 'Codice sessione copiato negli appunti!');
      } else {
        Alert.alert('❌ Errore', 'Impossibile copiare il codice');
      }
      setShowShareModal(false);
    } catch (error) {
      console.error('Errore nella copia del codice:', error);
      Alert.alert('❌ Errore', 'Impossibile copiare il codice');
    }
  };

  // Funzione per condividere il link
  const shareSessionLink = async () => {
    try {
      const success = await shareService.shareSession(sessionId, sessionName);
      
      if (success) {
        Alert.alert('✅ Successo', 'Sessione condivisa con successo!');
      } else {
        Alert.alert('❌ Errore', 'Impossibile condividere la sessione');
      }
      setShowShareModal(false);
    } catch (error) {
      console.error('Errore nella condivisione:', error);
      Alert.alert('❌ Errore', 'Impossibile condividere la sessione');
    }
  };

  // Funzione per salvare la sessione localmente
  const saveSessionLocally = async () => {
    if (!restaurantName.trim()) {
      Alert.alert('Campo obbligatorio', 'Inserisci il nome del ristorante');
      return;
    }

    setIsSaving(true);
    try {
      const winner = sortedPlayers[0];
      const savedSession: SavedSession = {
        id: SessionStorageService.generateSessionId(),
        sessionName,
        restaurant: restaurantName.trim(),
        date: SessionStorageService.formatDate(new Date()),
        players: sortedPlayers,
        winner: {
          name: winner?.name || 'Nessuno',
          score: winner?.score || 0
        }
      };

      await SessionStorageService.saveSession(savedSession);
      setShowSaveModal(false);
      setRestaurantName('');
      Alert.alert('Successo', 'Sessione salvata con successo!');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare la sessione');
    } finally {
      setIsSaving(false);
    }
  };

  // Ordinamento dei giocatori per punteggio e limitazione alla top 3
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const top3Players = sortedPlayers.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Animazioni */}
      <SushiAnimation isVisible={showSushiAnimation} />
      <SushiStack pieceCount={players.find(p => p.name === playerName)?.score || 0} />
      <Fireworks isVisible={false} />
      
      <Text style={[styles.sessionLabel, { color: theme.colors.onSurface }]}>
        Sessione
      </Text>
      <TouchableOpacity 
        onPress={canShare ? shareSession : undefined}
        disabled={!canShare}
        style={styles.sessionTitleContainer}
      >
        <Text style={[
          styles.title, 
          { 
            color: canShare ? theme.colors.primary : theme.colors.onSurface,
            textDecorationLine: canShare ? 'underline' : 'none'
          }
        ]}>
          {sessionName || sessionId}
        </Text>
        {canShare && (
          <Text style={[styles.shareHint, { color: theme.colors.onSurfaceVariant }]}>
            👆 Condividi
          </Text>
        )}
      </TouchableOpacity>
      
      <Card style={styles.leaderboardCard}>
        <Card.Title title="Classifica in tempo reale" />
        <Card.Content>
          <FlatList
            data={top3Players}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View style={[
                styles.playerRow, 
                item.name === playerName ? { backgroundColor: theme.colors.primaryContainer } : null
              ]}>
                <Text style={styles.rank}>{index + 1}</Text>
                <Text style={styles.playerName}>{item.name}</Text>
                <Text style={styles.score}>{item.score}   🍣</Text>
                {item.finished && <Text style={styles.finishedTag}>Finito</Text>}
              </View>
            )}
          />
        </Card.Content>
      </Card>
      
      {!gameEnded ? (
        <>
          <View style={styles.controlsContainer}>
            {!hasFinished && !players.find(p => p.name === playerName)?.finished && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={addPiece}
              >
                <Animated.Text 
                  style={[
                    styles.sushiIcon,
                    {
                      transform: [{ scale: sushiIconAnimation }],
                      opacity: sushiIconAnimation
                    }
                  ]}
                >
                  🍣
                </Animated.Text>
                <Text style={styles.addButtonText}>Aggiungi Pezzo</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Button 
            mode="outlined" 
            onPress={finishGame}
            disabled={hasFinished || players.find(p => p.name === playerName)?.finished}
            style={[
              styles.finishButtonBottomLeft,
              {
                backgroundColor: isDarkMode 
                  ? 'rgba(255, 255, 255, 0.5)' 
                  : 'rgba(255, 255, 255, 0.8)'
              }
            ]}
          >
            Ho finito!
          </Button>
        </>
      ) : (
        <View style={styles.gameEndedContainer}>
          <Text style={[styles.gameEndedText, { color: theme.colors.primary }]}>
            Partita terminata!
          </Text>
          <Text style={[styles.winnerText, { color: theme.colors.secondary }]}>
            Vincitore: {sortedPlayers[0]?.name || 'Nessuno'} con {sortedPlayers[0]?.score || 0} pezzi!
          </Text>
          
          <Button 
            mode="contained" 
            onPress={() => {
              useGameStore.getState().resetGame();
              navigation.navigate('Home' as never);
            }}
            style={styles.newGameButton}
          >
            🎮 Nuova Partita
          </Button>
        </View>
      )}

      {/* Modale della classifica finale */}
      <Modal
        visible={showLeaderboardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLeaderboardModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
              🏆 Classifica Finale
            </Text>
            
            <FlatList
              data={sortedPlayers}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <View style={[styles.modalPlayerRow, { borderBottomColor: theme.colors.outline }]}>
                  <Text style={[styles.modalRank, { color: theme.colors.primary }]}>
                    {index + 1}°
                  </Text>
                  <Text style={[styles.modalPlayerName, { color: theme.colors.onSurface }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.modalScore, { color: theme.colors.secondary }]}>
                    {item.score}   🍣
                  </Text>
                </View>
              )}
              style={styles.leaderboardList}
              showsVerticalScrollIndicator={true}
            />
            
            <View style={styles.modalButtons}>
              <Button 
                mode="outlined" 
                onPress={() => setShowLeaderboardModal(false)}
                style={styles.modalButton}
              >
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
                Salva Sessione
              </Button>
              <Button 
                mode="contained" 
                onPress={() => {
                  setShowLeaderboardModal(false);
                  useGameStore.getState().resetGame();
                  navigation.navigate('Home' as never);
                }}
                style={styles.modalButton}
              >
                🎮 Nuova Partita
              </Button>
            </View>
          </View>
        </View>
      </Modal>

       {/* Modale per salvare la sessione */}
       <Modal
         visible={showSaveModal}
         transparent={true}
         animationType="slide"
         onRequestClose={() => setShowSaveModal(false)}
         statusBarTranslucent={true}
       >
         <View style={styles.modalOverlay}>
           <KeyboardAvoidingView 
             style={styles.keyboardAvoidingContainer}
             behavior={Platform.OS === 'ios' ? 'padding' : undefined}
             keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
           >
             <TouchableOpacity 
               style={styles.modalTouchableOverlay}
               activeOpacity={1}
               onPress={() => {
                 setShowSaveModal(false);
                 setRestaurantName('');
               }}
             >
               <TouchableOpacity 
                 style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
                 activeOpacity={1}
                 onPress={(e) => e.stopPropagation()}
               >
                 <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
                   💾 Salva Sessione
                 </Text>
                 
                 <Text style={[styles.saveModalDescription, { color: theme.colors.onSurface }]}>
                   Salva questa partita per rivederla in futuro
                 </Text>
                 
                 <TextInput
                   mode="outlined"
                   label="Nome del ristorante"
                   placeholder="Es. Sushi Zen, Sakura, ..."
                   value={restaurantName}
                   onChangeText={setRestaurantName}
                   style={styles.restaurantInput}
                   theme={{ colors: { primary: theme.colors.primary } }}
                   autoFocus={true}
                   returnKeyType="done"
                   onSubmitEditing={() => {
                     if (restaurantName.trim()) {
                       saveSessionLocally();
                     }
                   }}
                 />
                 
                 <View style={styles.saveModalInfo}>
                   <Text style={[styles.saveInfoLabel, { color: theme.colors.onSurfaceVariant }]}>
                     Sessione: {sessionName}
                   </Text>
                   <Text style={[styles.saveInfoLabel, { color: theme.colors.onSurfaceVariant }]}>
                     Data: {SessionStorageService.formatDate(new Date())}
                   </Text>
                   <Text style={[styles.saveInfoLabel, { color: theme.colors.onSurfaceVariant }]}>
                     Vincitore: {sortedPlayers[0]?.name || 'Nessuno'} ({sortedPlayers[0]?.score || 0} pezzi)
                   </Text>
                 </View>
                 
                 <View style={styles.modalButtons}>
                   <Button 
                     mode="outlined" 
                     onPress={() => {
                       setShowSaveModal(false);
                       setRestaurantName('');
                     }}
                     style={styles.modalButton}
                     disabled={isSaving}
                   >
                     Annulla
                   </Button>
                   <Button 
                     mode="contained" 
                     onPress={saveSessionLocally}
                     style={styles.modalButton}
                     loading={isSaving}
                     disabled={isSaving}
                   >
                     Salva
                   </Button>
                 </View>
               </TouchableOpacity>
             </TouchableOpacity>
           </KeyboardAvoidingView>
         </View>
       </Modal>

             {/* Modale di condivisione */}
       <Modal
         visible={showShareModal}
         transparent={true}
         animationType="slide"
         onRequestClose={() => setShowShareModal(false)}
         statusBarTranslucent={true}
       >
         <View style={styles.modalOverlay}>
           <TouchableOpacity 
             style={styles.modalTouchableOverlay}
             activeOpacity={1}
             onPress={() => setShowShareModal(false)}
           >
             <TouchableOpacity 
               style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
               activeOpacity={1}
               onPress={(e) => e.stopPropagation()}
             >
               <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
                 🍣 Condividi Sessione
               </Text>
               
               <Text style={[styles.saveModalDescription, { color: theme.colors.onSurface }]}>
                 Condividi la sessione "{sessionName}" con i tuoi amici
               </Text>
               
               <View style={styles.shareModalButtons}>
                 <Button 
                   mode="contained" 
                   onPress={copySessionCode}
                   style={styles.shareModalButton}
                   icon="content-copy"
                 >
                    Copia Codice
                 </Button>
                 
                 <Button 
                   mode="contained" 
                   onPress={shareSessionLink}
                   style={styles.shareModalButton}
                   icon="share-variant"
                 >
                    Condividi Link
                 </Button>
               </View>
             </TouchableOpacity>
           </TouchableOpacity>
         </View>
       </Modal>

       
       {/* Settings Button positioned at bottom right */}
       <View style={styles.settingsButtonContainer}>
         <SettingsButton />
       </View>
     </View>
   );
 };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60, // Aumentato per evitare sovrapposizione con il notch
  },
  sessionLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 2,
    opacity: 0.7,
    marginTop: 10, // Aggiunto margine superiore per abbassare ulteriormente
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  sessionTitleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shareHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  leaderboardCard: {
    marginBottom: 20,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 6,
    marginBottom: 4,
  },
  rank: {
    width: 30,
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
    marginTop: 20,
  },
  addButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    marginBottom: 15,
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
  finishButton: {
    borderRadius: 30,
    paddingVertical: 6,
  },
  finishButtonBottomLeft: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    borderRadius: 30,
    paddingVertical: 6,
    zIndex: 1,
  },
  gameEndedContainer: {
    alignItems: 'center',
    marginTop: 30,
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
    marginBottom: 30,
  },
  newGameButton: {
    marginTop: 20,
    paddingHorizontal: 50, // Aumentato da 30 a 50
    paddingVertical: 15,   // Aggiunto padding verticale
    borderRadius: 30,
    minWidth: 200,         // Larghezza minima
  },
  // Stili per la modale
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
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
  modalTouchableOverlay: {
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
  modalButtons: {
    flexDirection: 'column',
    marginTop: 20,
    paddingTop: 20,
    gap: 10,
  },
  modalButton: {
    borderRadius: 25,
    paddingHorizontal: 20, // Aggiunto padding orizzontale
    paddingVertical: 12,   // Aggiunto padding verticale
    minWidth: 120,         // Larghezza minima
  },
  leaderboardList: {
    maxHeight: 300,
    marginBottom: 10,
  },
  // Stili per il modale di salvataggio
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
    marginBottom: 20,
  },
  saveInfoLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  settingsButtonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  // Stili per il modale di condivisione
  shareModalButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 15,
    marginTop: 20,
  },
  shareModalButton: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  });
  
  export default GameSessionScreen;