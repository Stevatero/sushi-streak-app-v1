import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ErrorBoundary from '../ErrorBoundary';

let shouldThrow = true;

const Unstable = () => {
  if (shouldThrow) throw new Error('boom: dettaglio tecnico');
  return <Text>Contenuto ripristinato</Text>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('mostra una schermata di recupero senza dettagli tecnici', () => {
    render(
      <ErrorBoundary>
        <Unstable />
      </ErrorBoundary>
    );
    expect(screen.getByText('Qualcosa è andato storto')).toBeTruthy();
    expect(screen.queryByText(/boom/)).toBeNull();
  });

  it('permette di riprovare e ripristina il contenuto', () => {
    render(
      <ErrorBoundary>
        <Unstable />
      </ErrorBoundary>
    );
    shouldThrow = false;
    fireEvent.press(screen.getByText('Riprova'));
    expect(screen.getByText('Contenuto ripristinato')).toBeTruthy();
  });
});
