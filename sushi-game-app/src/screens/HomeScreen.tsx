import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { useTheme, Button, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SettingsButton from '../components/SettingsButton';
import useGameStore from '../store/gameStore';
import { useFonts, JotiOne_400Regular } from '@expo-google-fonts/joti-one';
type RootStackParamList = {
  Home: undefined;
  GameSession: {
    sessionId: string;
    sessionName?: string;
    playerName: string;
    isHost: boolean;
    playerId?: string;
  };
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const [sessionName, setSessionName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSection, setExpandedSection] = useState<'create' | 'join' | null>(null);

  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const resetGame = useGameStore(state => state.resetGame);

  // Carica il font Google Joti One
  const [fontsLoaded] = useFonts({
    JotiOne_400Regular,
  });

  // Funzione per salvare il nome del giocatore
  const savePlayerName = async (name: string) => {
    try {
      await AsyncStorage.setItem('playerName', name);
    } catch (error) {
      console.error('Errore nel salvare il nome del giocatore:', error);
    }
  };

  // Funzione per caricare il nome del giocatore salvato
  const loadPlayerName = async () => {
    try {
      const savedName = await AsyncStorage.getItem('playerName');
      if (savedName) {
        setPlayerName(savedName);
      }
    } catch (error) {
      console.error('Errore nel caricare il nome del giocatore:', error);
    }
  };

  // Funzione per gestire deep links
  const handleDeepLink = (url: string) => {
    const sessionCode = url.split('session=')[1];
    if (sessionCode) {
      setJoinCode(sessionCode);
      setExpandedSection('join');
    }
  };

  // Funzione per generare un nome sessione automatico
  const generateSessionName = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  useEffect(() => {
    resetGame();
    // Genera automaticamente il nome della sessione all'avvio
    setSessionName(generateSessionName());
    // Carica il nome del giocatore salvato
    loadPlayerName();

    // Gestione deep links
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    const linkingListener = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    handleInitialURL();

    return () => {
      linkingListener.remove();
    };
  }, []);

  const createSession = async () => {
    if (!sessionName || !playerName) return;

    // Salva il nome del giocatore
    await savePlayerName(playerName);

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://192.168.26.103:3000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionName,
          playerName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante la creazione della sessione');
      }

      navigation.navigate('GameSession', {
        sessionId: data.sessionId,
        sessionName: data.sessionName,
        playerName,
        isHost: true,
        playerId: data.playerId
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la creazione della sessione');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async () => {
    if (!joinCode || !playerName) return;

    // Salva il nome del giocatore
    await savePlayerName(playerName);

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://192.168.26.103:3000/api/sessions/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: joinCode,
          playerName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'accesso alla sessione');
      }

      navigation.navigate('GameSession', {
        sessionId: joinCode,
        sessionName: data.sessionName,
        playerName,
        isHost: false,
        playerId: data.playerId
      });
    } catch (err) {
      // Gestione specifica per errori di rete
      if (err instanceof Error && err.message.includes('Network request failed')) {
        setError('Sessione non trovata, devi crearne una nuova');
      } else {
        setError(err instanceof Error ? err.message : 'Errore durante l\'accesso alla sessione');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Se i font non sono ancora caricati, mostra uno schermo di caricamento
  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.appIcon}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.colors.primary }]}>Sushi Streak</Text>
        </View>
        
        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        ) : null}

        {/* Sezione Crea una nuova sessione */}
        <TouchableOpacity 
          style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}
          onPress={() => setExpandedSection(expandedSection === 'create' ? null : 'create')}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            🎮  Crea una nuova sessione
          </Text>
          <Text style={[styles.expandIcon, { color: theme.colors.primary }]}>
            {expandedSection === 'create' ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSection === 'create' && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.surface, 
                color: theme.colors.onSurface,
                borderWidth: 1,
                borderColor: theme.colors.outline
              }]}
              placeholder="Nome della sessione"
              placeholderTextColor={theme.colors.onSurfaceDisabled}
              value={sessionName}
              onChangeText={setSessionName}
              editable={true}
            />
            <TouchableOpacity 
              onPress={() => setSessionName(generateSessionName())}
              style={{ alignSelf: 'flex-end', marginBottom: 10 }}
            >
              <Text style={{ color: theme.colors.primary, fontSize: 12 }}>
                🎲 Genera nome casuale
              </Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.surface, 
                color: theme.colors.onSurface,
                borderWidth: 1,
                borderColor: theme.colors.outline
              }]}
              placeholder="Il tuo nome"
              placeholderTextColor={theme.colors.onSurfaceDisabled}
              value={playerName}
              onChangeText={setPlayerName}
            />
            <Button
              mode="contained"
              onPress={createSession}
              style={styles.button}
              disabled={!sessionName || !playerName || loading}
              loading={loading}
            >
              Crea Sessione
            </Button>
          </View>
        )}

        {/* Sezione Unisciti a una sessione */}
        <TouchableOpacity 
          style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}
          onPress={() => setExpandedSection(expandedSection === 'join' ? null : 'join')}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            🔗  Unisciti a una sessione
          </Text>
          <Text style={[styles.expandIcon, { color: theme.colors.primary }]}>
            {expandedSection === 'join' ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSection === 'join' && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.surface, 
                color: theme.colors.onSurface,
                borderWidth: 1,
                borderColor: theme.colors.outline
              }]}
              placeholder="Codice sessione"
              placeholderTextColor={theme.colors.onSurfaceDisabled}
              value={joinCode}
              onChangeText={setJoinCode}
            />
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.surface, 
                color: theme.colors.onSurface,
                borderWidth: 1,
                borderColor: theme.colors.outline
              }]}
              placeholder="Il tuo nome"
              placeholderTextColor={theme.colors.onSurfaceDisabled}
              value={playerName}
              onChangeText={setPlayerName}
            />
            <Button
              mode="contained"
              onPress={joinSession}
              style={styles.button}
              disabled={!joinCode || !playerName || loading}
              loading={loading}
            >
              Unisciti
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Pulsanti fissi in basso */}
      <View style={styles.bottomButtonsContainer}>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('SessionHistory' as never)}
          style={[styles.historyButton, { borderColor: theme.colors.primary }]}
          textColor={theme.colors.primary}
          icon="history"
        >
          📚 Storico Partite
        </Button>
        <SettingsButton />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100, // Spazio per i pulsanti fissi in basso
  },
  header: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  appIcon: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  title: {
    fontSize: 36,
    fontWeight: '400',
    letterSpacing: 1,
    textAlign: 'center',
    fontFamily: 'JotiOne_400Regular',
  },
  settingsButton: {
    position: 'absolute',
    right: 0,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 6,
  },
  errorContainer: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  historyButtonContainer: {
    width: '100%',
    marginTop: 20,
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 25,
    paddingVertical: 5,
  },
});

export default HomeScreen;
