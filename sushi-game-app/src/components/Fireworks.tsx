import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withSequence, 
  withDelay,
  withSpring,
  withRepeat,
  Easing
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface FireworkProps {
  x: number;
  y: number;
  color: string;
  delay: number;
  size: number;
  moveX: number;
  moveY: number;
}

const Firework: React.FC<FireworkProps> = ({ x, y, color, delay, size, moveX, moveY }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Animazione di scala con effetto più dinamico e più lunga
    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1.2, { damping: 8, stiffness: 100 }),
        withTiming(2, { duration: 2000, easing: Easing.out(Easing.quad) }), // Aumentato da 1000 a 2000ms
        withTiming(0, { duration: 1200, easing: Easing.in(Easing.quad) })   // Aumentato da 600 a 1200ms
      )
    );

    // Animazione di opacità più fluida e più lunga
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 500 }),     // Aumentato da 300 a 500ms
        withTiming(0.8, { duration: 2000 }),  // Aumentato da 1000 a 2000ms
        withTiming(0, { duration: 1200 })     // Aumentato da 600 a 1200ms
      )
    );

    // Movimento sparso per tutto lo schermo con durata maggiore
    translateX.value = withDelay(
      delay,
      withTiming(moveX, { duration: 3000, easing: Easing.out(Easing.cubic) }) // Aumentato da 1500 a 3000ms
    );

    translateY.value = withDelay(
      delay,
      withTiming(moveY, { duration: 3000, easing: Easing.out(Easing.cubic) }) // Aumentato da 1500 a 3000ms
    );

    // Rotazione continua più lunga
    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }), // Aumentato da 2000 a 3000ms
        4, // Aumentato da 3 a 4 ripetizioni
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` }
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x, 
          top: y, 
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2
        },
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
      const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#FF9F43', '#EE5A24', '#0984e3', '#FF8A65', '#fd79a8', '#a29bfe', '#6c5ce7', '#00b894', '#00cec9', '#e17055'];
      
      // Aumentato il numero di particelle per un effetto più spettacolare
      for (let i = 0; i < 80; i++) {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        
        // Movimento più ampio e vario per coprire tutto lo schermo
        const moveX = (Math.random() - 0.5) * width * 0.8; // Movimento orizzontale più ampio
        const moveY = (Math.random() - 0.5) * height * 0.8; // Movimento verticale più ampio
        
        // Dimensioni variabili per più dinamismo
        const size = 12 + Math.random() * 16; // Da 12 a 28 pixel
        
        newFireworks.push({
          x: startX,
          y: startY,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 3000, // Aumentato da 2000 a 3000ms per distribuire meglio nel tempo
          size: size,
          moveX: moveX,
          moveY: moveY,
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
});

export default Fireworks;