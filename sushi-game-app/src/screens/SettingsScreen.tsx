import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Modal, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { useTheme, Button, IconButton, Divider, SegmentedButtons, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useColorScheme } from '../theme/ThemeProvider';
import SoundManager from '../utils/SoundManager';
import useGameStore from '../store/gameStore';
import { shareService } from '../services/shareService';
import { preferences, ThemePreference } from '../services/preferences';
import { APP_VARIANT, APP_VERSION, PRIVACY_POLICY_URL } from '../config';
import { logger } from '../utils/logger';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isDarkMode, preference, setPreference } = useColorScheme();
  const [soundEnabled, setSoundEnabled] = useState(SoundManager.isSoundEnabled());
  const [creditsVisible, setCreditsVisible] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const { sessionId, sessionName, gameEnded, status } = useGameStore(
    useShallow((s) => ({
      sessionId: s.sessionId,
      sessionName: s.sessionName,
      gameEnded: s.gameEnded,
      status: s.status,
    }))
  );

  // La condivisione è disponibile finché il server considera la sessione attiva
  const canShare = !!sessionId && !gameEnded && status === 'active';

  const copySessionCode = async () => {
    if (!sessionId) return;
    const success = await shareService.copySessionCode(sessionId);
    setShowShareModal(false);
    setSnackbar(success ? 'Codice sessione copiato!' : 'Impossibile copiare il codice');
  };

  const shareSessionLink = async () => {
    if (!sessionId || !sessionName) return;
    const result = await shareService.shareSession(sessionId, sessionName);
    setShowShareModal(false);
    if (result === 'error') setSnackbar('Impossibile condividere il link');
  };

  const openPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (error) {
      logger.warn('Apertura informativa privacy non riuscita', error);
      setSnackbar('Impossibile aprire la pagina');
    }
  };

  const confirmClearLocalData = () => {
    Alert.alert(
      'Cancellare i dati locali?',
      "Verranno eliminati da questo dispositivo lo storico delle partite, il nome salvato e le preferenze. L'operazione non si può annullare.",
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella',
          style: 'destructive',
          onPress: async () => {
            try {
              await preferences.clearAllLocalData();
              setPreference('system');
              SoundManager.setSoundEnabled(true);
              setSoundEnabled(true);
              setSnackbar('Dati locali cancellati');
            } catch (error) {
              logger.error('Cancellazione dati locali non riuscita', error);
              setSnackbar('Impossibile cancellare i dati');
            }
          },
        },
      ]
    );
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    SoundManager.setSoundEnabled(newState);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 + insets.bottom }}
    >
      <Text style={[styles.title, { color: theme.colors.primary }]}>Impostazioni</Text>

      {/* Aspetto */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Aspetto</Text>
        <SegmentedButtons
          value={preference}
          onValueChange={(value) => setPreference(value as ThemePreference)}
          buttons={[
            { value: 'system', label: 'Sistema', icon: 'theme-light-dark' },
            { value: 'light', label: 'Chiaro', icon: 'white-balance-sunny' },
            { value: 'dark', label: 'Scuro', icon: 'weather-night' },
          ]}
        />
      </View>

      <Divider style={styles.divider} />

      {/* Audio */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Audio</Text>
        <View style={styles.settingRow}>
          <Text style={{ color: theme.colors.onSurface, fontSize: 16 }}>Suoni</Text>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>{soundEnabled ? '🔊' : '🔇'}</Text>
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              style={styles.switch}
              ios_backgroundColor={theme.colors.surface}
              trackColor={{ false: '#767577', true: theme.colors.primaryContainer }}
            />
          </View>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Condivisione sessione, solo se c'è una partita in corso */}
      {sessionId && (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Sessione</Text>
            <View style={styles.shareContainer}>
              <View style={styles.shareInfo}>
                <Text style={{ color: theme.colors.onSurface, fontSize: 14, opacity: 0.7 }}>
                  Sessione attiva: {sessionName} ({sessionId})
                </Text>
              </View>
              <IconButton
                icon="share-variant"
                size={24}
                accessibilityLabel="Condividi la sessione"
                iconColor={canShare ? theme.colors.primary : theme.colors.onSurfaceDisabled}
                onPress={() => setShowShareModal(true)}
                style={[
                  styles.shareButton,
                  {
                    backgroundColor: canShare
                      ? isDarkMode
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.05)'
                      : 'rgba(128, 128, 128, 0.1)',
                  },
                ]}
                disabled={!canShare}
              />
            </View>
            {!canShare && (
              <Text style={[styles.shareDisabledText, { color: theme.colors.onSurfaceDisabled }]}>
                {gameEnded ? 'Sessione terminata' : 'Condivisione non disponibile'}
              </Text>
            )}
          </View>

          <Divider style={styles.divider} />
        </>
      )}

      {/* Privacy */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Privacy</Text>
        <Button
          mode="outlined"
          icon="shield-account"
          onPress={openPrivacyPolicy}
          style={[styles.privacyButton, { borderColor: theme.colors.primary }]}
          textColor={theme.colors.primary}
        >
          Informativa sulla privacy
        </Button>
        <Button mode="text" icon="delete-outline" onPress={confirmClearLocalData} textColor={theme.colors.error}>
          Cancella dati locali
        </Button>
      </View>

      <Divider style={styles.divider} />

      {/* Info */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Info</Text>
        <Button
          mode="outlined"
          onPress={() => setCreditsVisible(true)}
          style={{ borderColor: theme.colors.primary }}
          textColor={theme.colors.primary}
        >
          Crediti
        </Button>

        <Modal
          visible={creditsVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setCreditsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>Crediti</Text>
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                <Text style={[styles.modalItemTitle, { color: theme.colors.onSurface }]}>Sushi Streak</Text>
                <Text style={[styles.modalItemDescription, { color: theme.colors.onSurfaceVariant }]}>
                  Versione {APP_VERSION}
                  {APP_VARIANT !== 'production' ? ` (${APP_VARIANT})` : ''}
                </Text>

                <Text style={[styles.modalItemTitle, { color: theme.colors.onSurface }]}>Sviluppato da</Text>
                <Text style={[styles.modalItemDescription, { color: theme.colors.onSurfaceVariant }]}>
                  Dario Stevanato
                </Text>

                <Text style={[styles.modalItemTitle, { color: theme.colors.onSurface }]}>Tecnologie</Text>
                <Text style={[styles.modalItemDescription, { color: theme.colors.onSurfaceVariant }]}>
                  React Native, Expo, Socket.IO
                </Text>

                <Text style={[styles.modalItemTitle, { color: theme.colors.onSurface }]}>
                  © {new Date().getFullYear()}
                </Text>
                <Text style={[styles.modalItemDescription, { color: theme.colors.onSurfaceVariant }]}>
                  Tutti i diritti riservati
                </Text>
              </ScrollView>

              <Button
                mode="contained"
                onPress={() => setCreditsVisible(false)}
                style={[styles.button, { backgroundColor: theme.colors.primary, alignSelf: 'center' }]}
                labelStyle={{ color: theme.colors.onPrimary }}
              >
                Chiudi
              </Button>
            </View>
          </View>
        </Modal>
      </View>

      <Button
        mode="contained"
        onPress={() => navigation.goBack()}
        style={[styles.button, { backgroundColor: theme.colors.primary, alignSelf: 'center' }]}
        labelStyle={{ color: theme.colors.onPrimary }}
      >
        Chiudi
      </Button>

      {/* Modale di condivisione */}
      <Modal visible={showShareModal} animationType="slide" transparent onRequestClose={() => setShowShareModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.shareModalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.shareModalTitle, { color: theme.colors.primary }]}>Condividi Sessione</Text>

            <View style={styles.shareModalButtons}>
              <TouchableOpacity
                style={[styles.shareModalButton, { backgroundColor: theme.colors.primary }]}
                onPress={copySessionCode}
              >
                <Text style={[styles.shareModalButtonText, { color: theme.colors.onPrimary }]}>Copia Codice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shareModalButton, { backgroundColor: theme.colors.primary }]}
                onPress={shareSessionLink}
              >
                <Text style={[styles.shareModalButtonText, { color: theme.colors.onPrimary }]}>Condividi Link</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.shareModalCancelButton, { borderColor: theme.colors.outline }]}
              onPress={() => setShowShareModal(false)}
            >
              <Text style={[styles.shareModalCancelText, { color: theme.colors.onSurfaceVariant }]}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={2500}>
        {snackbar}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  privacyButton: {
    marginBottom: 4,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 40,
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
  shareModalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  shareModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  shareModalButtons: {
    width: '100%',
    gap: 16,
    marginBottom: 20,
  },
  shareModalButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  shareModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  shareModalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareModalCancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SettingsScreen;
