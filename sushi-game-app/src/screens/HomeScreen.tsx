import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Linking, Image, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { useTheme, Button, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SettingsButton from '../components/SettingsButton';
import shareService from '../services/shareService';
import { SessionStorageService, ActiveSession } from '../services/sessionStorage';
import { resolveServerUrl } from '../services/networkConfig';
import useGameStore from '../store/gameStore';
import { useFonts, JotiOne_400Regular } from '@expo-google-fonts/joti-one';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

let SERVER_URL = 'http://sushi.dietalab.net:3005';
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
  const [sessionToJoin, setSessionToJoin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSection, setExpandedSection] = useState<'create' | 'join' | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const resetGame = useGameStore(state => state.resetGame);
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);
  const iconScale = useSharedValue(0.9);

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
  const handleDeepLink = async (url: string) => {
    try {
      let sessionCode: string | undefined;
      const lower = url.toLowerCase();
      
      // Path style: .../join/ABC123 or sushi-streak://join/ABC123
      const pathMatch = lower.match(/\/join\/([a-z0-9]+)/i) || lower.match(/sushi-streak:\/\/join\/([a-z0-9]+)/i);
      if (pathMatch && pathMatch[1]) {
        sessionCode = pathMatch[1];
      }
      
      // Query style: ...?session=ABC123
      if (!sessionCode) {
        const qIndex = url.indexOf('?');
        if (qIndex !== -1) {
          const query = url.substring(qIndex + 1);
          const params = query.split('&');
          for (const p of params) {
            const [k, v] = p.split('=');
            if (k === 'session' && v) {
              sessionCode = v;
              break;
            }
          }
        }
      }
      
      if (sessionCode) {
        const normalized = sessionCode.toUpperCase().trim();
        setSessionToJoin(normalized);
        setExpandedSection('join');
        
        // Recupera info della sessione per impostare automaticamente il nome
        const info = await shareService.getSessionInfo(normalized);
        if (info?.sessionName) {
          setSessionName(info.sessionName);
        }
      }
    } catch (e) {
      console.error('Errore nel parsing del deep link:', e);
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
        await handleDeepLink(initialUrl);
      }
    };

    const linkingListener = Linking.addEventListener('url', async (event) => {
      await handleDeepLink(event.url);
    });

    handleInitialURL();

    return () => {
      linkingListener.remove();
    };
  }, []);
  useEffect(() => {
    (async () => {
      SERVER_URL = await resolveServerUrl();
    })();
  }, []);
  useEffect(() => {
    const checkActive = async () => {
      const saved = await SessionStorageService.getActiveSession();
      if (saved && saved.sessionId) {
        const info = await shareService.getSessionInfo(saved.sessionId);
        const started = new Date(saved.startedAt).getTime();
        const expired = (Date.now() - started) > (10 * 60 * 1000);
        if (info && info.isActive && !expired) {
          setActiveSession(saved);
        } else {
          setActiveSession(null);
        }
      } else {
        setActiveSession(null);
      }
    };
    checkActive();
  }, []);
  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
    headerTranslateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) });
    iconScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }]
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }]
  }));

  const createSession = async () => {
    if (!sessionName || !playerName) return;

    // Salva il nome del giocatore
    await savePlayerName(playerName);

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionName,
          playerName,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Risposta server non valida:', text);
        throw new Error('Il server ha restituito una risposta non valida (HTML invece di JSON). Verifica che il server sia attivo.');
      }

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
    if (!sessionToJoin || !playerName) return;

    // Salva il nome del giocatore
    await savePlayerName(playerName);

    setLoading(true);
    setError('');

    try {
      // Crea un controller per il timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 secondi

      const response = await fetch(`${SERVER_URL}/api/sessions/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionToJoin.toUpperCase().trim(),
          playerName: playerName.trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Risposta server non valida:', text);
        throw new Error('Il server ha restituito una risposta non valida. Verifica che il server sia attivo.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'accesso alla sessione');
      }

      navigation.navigate('GameSession', {
        sessionId: sessionToJoin.toUpperCase().trim(),
        sessionName: data.sessionName,
        playerName: playerName.trim(),
        isHost: false,
        playerId: data.playerId
      });
    } catch (err) {
      // Gestione specifica per errori di rete e timeout
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Connessione scaduta dopo 20 secondi. Verifica che il server sia raggiungibile e riprova.');
        } else if (err.message.includes('Network request failed') || err.message.includes('fetch')) {
          setError('Impossibile connettersi al server. Verifica la connessione di rete e riprova.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Errore durante l\'accesso alla sessione');
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
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, headerStyle]}>
            <Animated.Image 
              source={require('../../assets/icon.png')} 
              style={[styles.appIcon, iconStyle as any]}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.colors.primary }]}>Sushi Streak</Text>
          </Animated.View>
          
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]}>
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
              {(error.includes('Connessione scaduta') || error.includes('Impossibile connettersi')) && (
                <Button
                  mode="outlined"
                  onPress={() => {
                    setError('');
                    if (expandedSection === 'join' && sessionToJoin && playerName) {
                      joinSession();
                    }
                  }}
                  style={[styles.button, { marginTop: 10 }]}
                  disabled={loading}
                >
                  🔄 Riprova
                </Button>
              )}
            </View>
          ) : null}
          
          {activeSession ? (
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>
                Sessione attiva trovata
              </Text>
              <Text style={{ color: theme.colors.onSurface }}>
                {activeSession.sessionName || activeSession.sessionId}
              </Text>
              <Button
                mode="contained"
                onPress={() => {
                  navigation.navigate('GameSession', {
                    sessionId: activeSession.sessionId,
                    sessionName: activeSession.sessionName,
                    playerName: activeSession.playerName,
                    isHost: activeSession.isHost,
                    playerId: activeSession.playerId
                  });
                }}
                style={styles.button}
                icon="refresh"
              >
                Riconnettiti
              </Button>
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
                onSubmitEditing={() => {
                  if (sessionName && playerName && !loading) {
                    createSession();
                  }
                }}
                returnKeyType="go"
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
                placeholder="Nome della sessione"
                placeholderTextColor={theme.colors.onSurfaceDisabled}
                value={sessionToJoin}
                onChangeText={setSessionToJoin}
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
                onSubmitEditing={() => {
                  if (sessionToJoin && playerName && !loading) {
                    joinSession();
                  }
                }}
                returnKeyType="go"
              />
              <Button
                mode="contained"
                onPress={joinSession}
                style={styles.button}
                disabled={!sessionToJoin || !playerName || loading}
                loading={loading}
              >
                Unisciti
              </Button>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pulsanti fissi in basso */}
      <View style={[styles.bottomButtonsContainer, { backgroundColor: theme.colors.background }]}>
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
