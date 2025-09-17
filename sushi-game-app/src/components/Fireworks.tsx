import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withSequence, 
  withDelay 
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface FireworkProps {
  x: number;
  y: number;
  color: string;
  delay: number;
}

const Firework: React.FC<FireworkProps> = ({ x, y, color, delay }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(1.5, { duration: 800 }),
        withTiming(0, { duration: 500 })
      )
    );

    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(1, { duration: 800 }),
        withTiming(0, { duration: 500 })
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.firework,
        { left: x, top: y, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
};

interface FireworksProps {
  isVisible: boolean;
}

const Fireworks: React.FC<FireworksProps> = ({ isVisible }) => {
  const [fireworks, setFireworks] = useState<FireworkProps[]>([]);

  useEffect(() => {
    if (isVisible) {
      const newFireworks = [];
      const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#FF9F43', '#EE5A24', '#0984e3', '#FF8A65', '#fd79a8'];
      
      for (let i = 0; i < 50; i++) {
        newFireworks.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.7,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 3000,
        });
      }
      
      setFireworks(newFireworks);
    } else {
      setFireworks([]);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {fireworks.map((props, index) => (
        <Firework key={index} {...props} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1000,
  },
  firework: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default Fireworks;