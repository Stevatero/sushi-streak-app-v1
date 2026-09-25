import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { logger } from '../utils/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Intercetta gli errori di rendering e mostra una schermata di recupero senza dettagli tecnici.
// Non usa il tema: deve funzionare anche se l'errore nasce dai provider.
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('Errore di rendering non gestito', error, { componentStack: info.componentStack });
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container} accessibilityRole="alert">
        <Text style={styles.emoji}>🍣</Text>
        <Text style={styles.title}>Qualcosa è andato storto</Text>
        <Text style={styles.message}>
          Si è verificato un errore imprevisto. I tuoi dati sono al sicuro: puoi riprovare subito.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.reset} accessibilityRole="button">
          <Text style={styles.buttonText}>Riprova</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#3E2843',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#E6DDEA',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#FF8A65',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonText: {
    color: '#1E2022',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
