import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme, Button } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SettingsButton from '../components/SettingsButton';
import { shareService } from '../services/shareService';
import { SessionStorageService, ActiveSession } from '../services/sessionStorage';
import { api, ApiError } from '../services/api';
import { preferences } from '../services/preferences';
import { PLAYER_NAME_MAX_LENGTH, SESSION_CODE_MAX_LENGTH, SESSION_CODE_MIN_LENGTH } from '../config';
import { extractSessionCode, generateSessionCode, isValidSessionCode, sanitizeSessionCode } from '../utils/sessionCode';
import type { RootNavigationProp } from '../navigation/types';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

type PendingAction = 'create' | 'join' | null;

const HomeScreen = () => {
  const [sessionName, setSessionName] = useState(generateSessionCode);
  const [playerName, setPlayerName] = useState('');
  const [sessionToJoin, setSessionToJoin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryAction, setRetryAction] = useState<PendingAction>(null);
  const [expandedSection, setExpandedSection] = useState<'create' | 'join' | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [expiredSession, setExpiredSession] = useState<ActiveSession | null>(null);

  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavigationProp>();
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);
  const iconScale = useSharedValue(0.9);

  const handleDeepLink = useCallback((url: string | null) => {
    if (!url) return;
    const code = extractSessionCode(url);
    if (code) {
      setSessionToJoin(code);
      setExpandedSection('join');
      setError('');
    }
  }, []);

  useEffect(() => {
    preferences.getPlayerName().then((saved) => {
      if (saved) setPlayerName(saved);
    });

    Linking.getInitialURL().then(handleDeepLink);
    const linkingListener = Linking.addEventListener('url', (event) => handleDeepLink(event.url));
    return () => linkingListener.remove();
  }, [handleDeepLink]);

  // A ogni ritorno sulla Home verifica se esiste una partita a cui riconnettersi
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const saved = await SessionStorageService.getActiveSession();
        if (!saved?.sessionId || !saved.playerToken) {
          if (!cancelled) {
            setActiveSession(null);
            // Le sessioni salvate dalle versioni precedenti (senza token) non si possono riprendere
            setExpiredSession(saved?.sessionId ? saved : null);
          }
          return;
        }
        const result = await shareService.getSessionInfo(saved.sessionId);
        if (cancelled) return;
        // Se il server non è raggiungibile lasciamo comunque la possibilità di riconnettersi
        const stillActive = result.status === 'error' || (result.status === 'ok' && result.info.isActive);
        setActiveSession(stillActive ? saved : null);
        setExpiredSession(stillActive ? null : saved);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
    headerTranslateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) });
    iconScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
  }, [headerOpacity, headerTranslateY, iconScale]);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const trimmedPlayerName = playerName.trim();
  const canCreate = isValidSessionCode(sessionName) && trimmedPlayerName.length > 0;
  const canJoin = isValidSessionCode(sessionToJoin) && trimmedPlayerName.length > 0;

  const handleRequestError = (err: unknown, action: PendingAction) => {
    setError(err instanceof Error ? err.message : 'Si è verificato un errore');
    setRetryAction(err instanceof ApiError && err.isNetworkError ? action : null);
  };

  const createSession = async () => {
    if (!canCreate || loading) return;
    await preferences.setPlayerName(trimmedPlayerName);
    setLoading(true);
    setError('');

    try {
      const data = await api.createSession(sessionName, trimmedPlayerName);
      navigation.navigate('GameSession', {
        sessionId: data.sessionId,
        sessionName: data.sessionName,
        playerId: data.playerId,
        playerName: trimmedPlayerName,
        playerToken: data.playerToken,
        isHost: true,
      });
      setSessionName(generateSessionCode());
    } catch (err) {
      handleRequestError(err, 'create');
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async () => {
    if (!canJoin || loading) return;
    await preferences.setPlayerName(trimmedPlayerName);
    setLoading(true);
    setError('');

    try {
      const data = await api.joinSession(sessionToJoin, trimmedPlayerName);
      navigation.navigate('GameSession', {
        sessionId: data.sessionId,
        sessionName: data.sessionName,
        playerId: data.playerId,
        playerName: trimmedPlayerName,
        playerToken: data.playerToken,
        isHost: false,
      });
      setSessionToJoin('');
    } catch (err) {
      handleRequestError(err, 'join');
    } finally {
      setLoading(false);
    }
  };

  const reconnect = (session: ActiveSession) => {
    if (!session.playerToken) return;
    navigation.navigate('GameSession', {
      sessionId: session.sessionId,
      sessionName: session.sessionName || session.sessionId,
      playerId: session.playerId,
      playerName: session.playerName,
      playerToken: session.playerToken,
      isHost: session.isHost,
    });
  };

  const dismissSavedSession = () => {
    SessionStorageService.clearActiveSession();
    setActiveSession(null);
    setExpiredSession(null);
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface,
      color: theme.colors.onSurface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
  ];

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: 100 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, headerStyle]}>
            <Animated.Image
              source={require('../../assets/icon.png')}
              style={[styles.appIcon, iconStyle]}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.colors.primary }]}>Sushi Streak</Text>
          </Animated.View>

          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]}>
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
              {retryAction && (
                <Button
                  mode="outlined"
                  onPress={() => (retryAction === 'join' ? joinSession() : createSession())}
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
              <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Partita in corso</Text>
              <Text style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
                {activeSession.sessionName || activeSession.sessionId} · {activeSession.playerName}
              </Text>
              <Button mode="contained" onPress={() => reconnect(activeSession)} style={styles.button} icon="refresh">
                Riconnettiti
              </Button>
              <Button mode="text" onPress={dismissSavedSession} style={styles.button}>
                Ignora
              </Button>
            </View>
          ) : null}

          {expiredSession ? (
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Sessione terminata</Text>
              <Text style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
                {expiredSession.sessionName || expiredSession.sessionId}
              </Text>
              <Button
                mode="contained"
                onPress={() => {
                  setSessionName(sanitizeSessionCode(expiredSession.sessionName || expiredSession.sessionId));
                  setPlayerName(expiredSession.playerName);
                  setExpandedSection('create');
                  dismissSavedSession();
                }}
                style={styles.button}
                icon="plus"
              >
                Crea nuova sessione
              </Button>
              <Button mode="text" onPress={dismissSavedSession} style={styles.button}>
                Chiudi
              </Button>
            </View>
          ) : null}

          {/* Sezione Crea una nuova sessione */}
          <TouchableOpacity
            style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}
            onPress={() => setExpandedSection(expandedSection === 'create' ? null : 'create')}
            accessibilityRole="button"
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>🎮 Crea una nuova sessione</Text>
            <Text style={[styles.expandIcon, { color: theme.colors.primary }]}>
              {expandedSection === 'create' ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSection === 'create' && (
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={inputStyle}
                placeholder="Codice della sessione"
                placeholderTextColor={theme.colors.onSurfaceDisabled}
                value={sessionName}
                onChangeText={(text) => setSessionName(sanitizeSessionCode(text))}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={SESSION_CODE_MAX_LENGTH}
              />
              <View style={styles.inputHintRow}>
                <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
                  {SESSION_CODE_MIN_LENGTH}-{SESSION_CODE_MAX_LENGTH} caratteri: lettere, numeri, trattino
                </Text>
                <TouchableOpacity onPress={() => setSessionName(generateSessionCode())}>
                  <Text style={{ color: theme.colors.primary, fontSize: 12 }}>🎲 Genera</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={inputStyle}
                placeholder="Il tuo nome"
                placeholderTextColor={theme.colors.onSurfaceDisabled}
                value={playerName}
                onChangeText={setPlayerName}
                maxLength={PLAYER_NAME_MAX_LENGTH}
                onSubmitEditing={createSession}
                returnKeyType="go"
              />
              <Button
                mode="contained"
                onPress={createSession}
                style={styles.button}
                disabled={!canCreate || loading}
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
            accessibilityRole="button"
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>🔗 Unisciti a una sessione</Text>
            <Text style={[styles.expandIcon, { color: theme.colors.primary }]}>
              {expandedSection === 'join' ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSection === 'join' && (
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={inputStyle}
                placeholder="Codice della sessione"
                placeholderTextColor={theme.colors.onSurfaceDisabled}
                value={sessionToJoin}
                onChangeText={(text) => setSessionToJoin(sanitizeSessionCode(text))}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={SESSION_CODE_MAX_LENGTH}
              />
              <TextInput
                style={inputStyle}
                placeholder="Il tuo nome"
                placeholderTextColor={theme.colors.onSurfaceDisabled}
                value={playerName}
                onChangeText={setPlayerName}
                maxLength={PLAYER_NAME_MAX_LENGTH}
                onSubmitEditing={joinSession}
                returnKeyType="go"
              />
              <Button
                mode="contained"
                onPress={joinSession}
                style={styles.button}
                disabled={!canJoin || loading}
                loading={loading}
              >
                Unisciti
              </Button>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pulsanti fissi in basso */}
      <View
        style={[
          styles.bottomButtonsContainer,
          { backgroundColor: theme.colors.background, paddingBottom: 15 + insets.bottom },
        ]}
      >
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('SessionHistory')}
          style={[styles.historyButton, { borderColor: theme.colors.primary }]}
          textColor={theme.colors.primary}
          icon="history"
        >
          Storico Partite
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
  inputHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 12,
  },
  hint: {
    fontSize: 11,
    flex: 1,
    marginRight: 8,
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
