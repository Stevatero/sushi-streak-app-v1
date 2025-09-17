import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal, Alert } from 'react-native';
import { Text, Button, Card, useTheme, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useColorScheme } from '../theme/ThemeProvider';
import { SessionStorageService, SavedSession } from '../services/sessionStorage';

const SessionHistoryScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { isDarkMode } = useColorScheme();
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SavedSession | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedSessions();
  }, []);

  const loadSavedSessions = async () => {
    try {
      const sessions = await SessionStorageService.getSavedSessions();
      setSavedSessions(sessions);
    } catch (error) {
      Alert.alert('Errore', 'Impossibile caricare le sessioni salvate');
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    Alert.alert(
      'Elimina Sessione',
      'Sei sicuro di voler eliminare questa sessione?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await SessionStorageService.deleteSession(sessionId);
              await loadSavedSessions();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare la sessione');
            }
          }
        }
      ]
    );
  };

  const openSessionDetail = (session: SavedSession) => {
    setSelectedSession(session);
    setShowDetailModal(true);
  };

  const renderSessionItem = ({ item }: { item: SavedSession }) => (
    <TouchableOpacity onPress={() => openSessionDetail(item)}>
      <Card style={[styles.sessionCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionName, { color: theme.colors.primary }]}>
                {item.sessionName}
              </Text>
              <Text style={[styles.sessionDate, { color: theme.colors.onSurfaceVariant }]}>
                {item.date}
              </Text>
              <Text style={[styles.restaurantName, { color: theme.colors.secondary }]}>
                📍 {item.restaurant}
              </Text>
            </View>
            <IconButton
              icon="delete"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => deleteSession(item.id)}
              style={styles.deleteButton}
            />
          </View>
          
          <View style={styles.winnerInfo}>
            <Text style={[styles.winnerLabel, { color: theme.colors.onSurfaceVariant }]}>
              Vincitore:
            </Text>
            <Text style={[styles.winnerText, { color: theme.colors.onSurface }]}>
              🏆 {item.winner.name} ({item.winner.score} pezzi)
            </Text>
          </View>
          
          <Text style={[styles.playersCount, { color: theme.colors.onSurfaceVariant }]}>
            {item.players.length} giocatori
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor={theme.colors.primary}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          📚 Storico Partite
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            Caricamento...
          </Text>
        </View>
      ) : savedSessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            Nessuna partita salvata
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
            Le partite che salverai appariranno qui
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modale dettaglio sessione */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            {selectedSession && (
              <>
                <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
                  {selectedSession.sessionName}
                </Text>
                
                <View style={styles.sessionDetails}>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    📍 Ristorante: {selectedSession.restaurant}
                  </Text>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    📅 Data: {selectedSession.date}
                  </Text>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    🏆 Vincitore: {selectedSession.winner.name} ({selectedSession.winner.score} pezzi)
                  </Text>
                </View>

                <Text style={[styles.leaderboardTitle, { color: theme.colors.primary }]}>
                  🏆 Classifica Finale
                </Text>
                
                <FlatList
                  data={selectedSession.players}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <View style={[styles.playerRow, { borderBottomColor: theme.colors.outline }]}>
                      <Text style={[styles.playerRank, { color: theme.colors.primary }]}>
                        {index + 1}°
                      </Text>
                      <Text style={[styles.playerName, { color: theme.colors.onSurface }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.playerScore, { color: theme.colors.secondary }]}>
                        {item.score}  🍣
                      </Text>
                    </View>
                  )}
                  style={styles.leaderboardList}
                />
                
                <Button 
                  mode="contained" 
                  onPress={() => setShowDetailModal(false)}
                  style={styles.closeButton}
                >
                  Chiudi
                </Button>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sessionCard: {
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sessionDate: {
    fontSize: 14,
    marginBottom: 5,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  deleteButton: {
    margin: 0,
  },
  winnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  winnerLabel: {
    fontSize: 14,
    marginRight: 5,
  },
  winnerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  playersCount: {
    fontSize: 12,
    opacity: 0.7,
  },
  // Stili per il modale
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  sessionDetails: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 10,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  leaderboardList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  playerRank: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 40,
  },
  playerName: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
  },
  playerScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    borderRadius: 25,
  },
});

export default SessionHistoryScreen;