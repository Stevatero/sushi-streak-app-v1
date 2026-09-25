import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useColorScheme } from '../theme/ThemeProvider';

const SettingsButton = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { isDarkMode } = useColorScheme();

  return (
    <View style={styles.container}>
      <IconButton
        icon="cog"
        accessibilityLabel="Impostazioni"
        size={30}
        iconColor={theme.colors.primary}
        onPress={() => navigation.navigate('Settings')}
        style={[
          styles.button,
          {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.8)',
            borderWidth: 1,
            borderColor: theme.colors.outline,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
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
