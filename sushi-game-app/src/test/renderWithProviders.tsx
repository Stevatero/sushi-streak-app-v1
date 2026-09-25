import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '../theme/ThemeProvider';

// Render con i provider globali dell'app (tema e componenti Paper)
export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <PaperProvider>{ui}</PaperProvider>
    </ThemeProvider>
  );
}
