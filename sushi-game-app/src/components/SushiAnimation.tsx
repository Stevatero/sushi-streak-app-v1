import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SushiAnimationProps {
  isVisible: boolean;
}

const SushiAnimation: React.FC<SushiAnimationProps> = ({ isVisible }) => {
  const fallAnim = useRef(new Animated.Value(-50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isVisible) {
      // Reset animation values
      fallAnim.setValue(-50);
      rotateAnim.setValue(0);
      scaleAnim.setValue(1);

      // Start animation sequence
      Animated.parallel([
        Animated.timing(fallAnim, {
          toValue: height / 2 - 50,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [isVisible, fallAnim, rotateAnim, scaleAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[
          styles.sushi,
          {
            transform: [
              { translateY: fallAnim },
              { rotate: spin },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        🍣
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  sushi: {
    fontSize: 50,
  },
});

export default SushiAnimation;