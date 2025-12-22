import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#FF8A65', // Arancione più caldo, simile al tema scuro
    secondary: '#4ECDC4',
    background: '#F7F9FC',
    surface: '#FFFFFF',
    error: '#FF5252',
    text: '#1E2022',
    onSurface: '#1E2022',
    disabled: '#C5C6C7',
    placeholder: '#A0A0A0',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#FF8A65', // Arancione più caldo, simile al tema scuro
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#FF9E80',////Aaipc oteepEùd e uGaro
    surface: '#3A3A3A', // Grigio più chiaro
    error: '#FF5252',
    text: '#E0E0E0', // Bianco meno brillante
    onSurface: '#E0E0E0', // Bianco meno brillante
    disabled: '#757575',
    placeholder: '#A0A0A0',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#FF9E80', // Arancione più tenue
  },
};
9E80 // Arancione più tenue