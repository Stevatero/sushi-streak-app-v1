import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Modal, Share, Alert } from 'react-native';
import { Text, Switch, Button, Divider, useTheme, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useColorScheme } from '../theme/ThemeProvider';
import SoundManager from '../utils/SoundManager';
import useGameStore from '../store/gameStore';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useColorScheme();
  const [soundEnabled, setSoundEnabled] = useState(SoundManager.isSoundEnabled());
  const [creditsVisible, setCreditsVisible] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
  // Ottieni i dati della sessione dal game store
  const { sessionId, sessionName, gameEnded } = useGameStore();
  
  // Calcola se sono passati più di 10 minuti dall'inizio della sessione
  const isSessionExpired = sessionStartTime ? 
    (Date.now() - sessionStartTime.getTime()) > 10 * 60 * 1000 : false;
  
  // Determina se la condivisione è disponibile
  const canShare = sessionId && !gameEnded && !isSessionExpired;

  useEffect(() => {
    // Imposta il tempo di inizio sessione quando il componente viene montato
    if (sessionId && !sessionStartTime) {
      setSessionStartTime(new Date());
    }
  }, [sessionId]);

  const shareSession = async () => {
    if (!sessionId || !sessionName) {
      Alert.alert('Errore', 'Nessuna sessione attiva da condividere');
      return;
    }

    if (gameEnded) {
      Alert.alert('Sessione terminata', 'Non puoi condividere una sessione già terminata');
      return;
    }

    if (isSessionExpired) {
      Alert.alert('Sessione scaduta', 'Non è più possibile condividere questa sessione. Sono passati più di 10 minuti.');
      return;
    }

    try {
      await Share.share({
        message: `🍣 Unisciti alla mia sessione Sushi Streak!\n\nNome sessione: ${sessionName}\nCodice: ${sessionId}\n\nScarica l'app e inserisci questo codice per giocare insieme!`,
        title: 'Invito Sushi Streak'
      });
    } catch (error) {
      console.error('Errore durante la condivisione:', error);
      Alert.alert('Errore', 'Impossibile condividere la sessione');
    }
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    SoundManager.setSoundEnabled(newState);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.primary }]}>Settings</Text>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Appearance</Text>
        <View style={styles.settingRow}>
          <Text style={{ color: theme.colors.onSurface, fontSize: 16 }}>{isDarkMode ? 'Tema Scuro' : 'Tema Chiaro'}</Text>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>{isDarkMode ? '🌙' : '☀️'}</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              color={theme.colors.primary}
              style={styles.switch}
              ios_backgroundColor={theme.colors.surface}
              trackColor={{ false: '#767577', true: theme.colors.primaryContainer }}
            />
          </View>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Audio Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Audio</Text>
        <View style={styles.settingRow}>
          <Text style={{ color: theme.colors.onSurface, fontSize: 16 }}>Suoni</Text>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>{soundEnabled ? '🔊' : '🔇'}</Text>
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              color={theme.colors.primary}
              style={styles.switch}
              ios_backgroundColor={theme.colors.surface}
              trackColor={{ false: '#767577', true: theme.colors.primaryContainer }}
            />
          </View>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Condivisione Sessione - Solo se c'è una sessione attiva */}
      {sessionId && (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Sessione</Text>
            <View style={styles.shareContainer}>
              <View style={styles.shareInfo}>
                <Text style={{ color: theme.colors.onSurface, fontSize: 14, opacity: 0.7 }}>
                  Sessione attiva: {sessionName}
                </Text>
                <Text style={{ color: theme.colors.onSurface, fontSize: 12, opacity: 0.5 }}>
                  Codice: {sessionId}
                </Text>
              </View>
              <IconButton
                icon="share-variant"
                size={24}
                iconColor={canShare ? theme.colors.primary : theme.colors.onSurfaceDisabled}
                onPress={canShare ? shareSession : undefined}
                style={[
                  styles.shareButton,
                  {
                    backgroundColor: canShare 
                      ? (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)')
                      : 'rgba(128, 128, 128, 0.1)',
                  }
                ]}
                disabled={!canShare}
              />
            </View>
            {!canShare && (
              <Text style={[styles.shareDisabledText, { color: theme.colors.onSurfaceDisabled }]}>
                {gameEnded ? 'Sessione terminata' : isSessionExpired ? 'Sessione scaduta (>10 min)' : 'Condivisione non disponibile'}
              </Text>
            )}
          </View>

          <Divider style={styles.divider} />
        </>
      )}

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Info</Text>
        <Button
          mode="outlined"
          onPress={() => setCreditsVisible(true)}
          style={{ borderColor: theme.colors.primary }}
          textColor={theme.colors.primary}
        >
          Credits
        </Button>

        <Modal
          visible={creditsVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCreditsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>Credits</Text>
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                <Text style={[styles.modalItemTitle, { color: theme.colors.onSurface }]}>Sushi Streak</Text>
                <Text style={[styles.modalItemDescription, { color: theme.colors.onSurfaceVariant }]}>Version 1.0.0</Text>

                <Text style={[styles.modalItemTitle, { color: theme.colors.onSurface }]}>Developed by</Text>
                <Text style={[styles.modalItemDescription, { color: theme.colors.onSurfaceVariant }]}>Dario Stevanato</Text>

                <Text style={[styles.modalItemTitle, { color: theme.colors.onSurface }]}>Technologies</Text>
                <Text style={[styles.modalItemDescription, { color: theme.colors.onSurfaceVariant }]}>React Native, Expo, Socket.IO</Text>

                <Text style={[styles.modalItemTitle, { color: theme.colors.onSurface }]}>© 2025</Text>
                <Text style={[styles.modalItemDescription, { color: theme.colors.onSurfaceVariant }]}>All rights reserved</Text>
              </ScrollView>

              <Button
                mode="contained"
                onPress={() => setCreditsVisible(false)}
                style={[styles.button, { backgroundColor: theme.colors.primary, alignSelf: 'center' }]}
                labelStyle={{ color: theme.colors.onPrimary }}
              >
                Close
              </Button>
            </View>
          </View>
        </Modal>
      </View>

      {/* Save Button */}
      <Button
        mode="contained"
        onPress={() => navigation.goBack()}
        style={[styles.button, { backgroundColor: theme.colors.primary, alignSelf: 'center' }]}
        labelStyle={{ color: theme.colors.onPrimary }}
      >
        Salva
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginVertical: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    marginRight: 10,
    fontSize: 18,
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  divider: {
    marginVertical: 15,
  },
  button: {
    marginTop: 30,
    marginBottom: 20,
    borderRadius: 8,
    paddingVertical: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalScrollContent: {
    alignItems: 'center', // All elements centered
    paddingVertical: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalItemTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
  modalItemDescription: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  shareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    marginVertical: 5,
  },
  shareInfo: {
    flex: 1,
  },
  shareButton: {
    borderRadius: 25,
  },
  shareDisabledText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default SettingsScreen;
