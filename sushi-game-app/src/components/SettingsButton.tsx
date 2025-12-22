import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useColorScheme } from '../theme/ThemeProvider';

type RootStackParamList = {
  Settings: undefined;
};

const SettingsButton = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const { isDarkMode } = useColorScheme();

  return (
    <View style={styles.container}>
      <IconButton
        icon="cog"
        size={30}
        iconColor={theme.colors.primary}
        onPress={() => navigation.navigate('Settings')}
        style={[
          styles.button,
          {
            backgroundColor: isDarkMode 
              ? 'rgba(255, 255, 255, 0.2)' 
              : 'rgba(255, 255, 255, 0.8)',
            borderWidth: 1,
            borderColor: theme.colors.outline,
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Rimuovo il posizionamento assoluto per permettere il posizionamento relativo
  },
  button: {
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
});

export default SettingsButton;
