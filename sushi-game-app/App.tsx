import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { Linking } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useColorScheme } from './src/theme/ThemeProvider';
import { shareService } from './src/services/shareService';

const ThemedApp = () => {
  const { theme, isDarkMode } = useColorScheme();
  
  useEffect(() => {
    // Gestisce i deep link quando l'app è già aperta
    const handleDeepLink = (url: string) => {
      console.log('Deep link ricevuto:', url);
      
      // Estrae il sessionId dall'URL
      const sessionIdMatch = url.match(/\/join\/([a-zA-Z0-9-]+)/);
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        console.log('SessionId estratto:', sessionId);
        
        // Gestisce il join alla sessione
        shareService.handleJoinLink(sessionId).then((result) => {
          if (result.success && result.sessionInfo) {
            console.log('Sessione trovata:', result.sessionInfo);
            // Qui potresti navigare automaticamente alla schermata di join
            // o mostrare un modal con le informazioni della sessione
          } else {
            console.log('Sessione non trovata o non valida');
          }
        });
      }
    };

    // Gestisce i link quando l'app viene aperta da un deep link
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Gestisce i link quando l'app è già aperta
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    getInitialURL();

    return () => {
      subscription?.remove();
    };
  }, []);
  
  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <AppNavigator />
    </PaperProvider>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
