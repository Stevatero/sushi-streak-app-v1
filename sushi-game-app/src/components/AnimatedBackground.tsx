import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface BlobConfig {
  size: number;
  color: string;
  startX: number;
  startY: number;
  moveX: number;
  moveY: number;
  delay: number;
  opacity: number;
}

const blobs: BlobConfig[] = [
  { size: Math.min(width, height) * 0.6, color: 'rgba(255,107,107,0.18)', startX: -width * 0.2, startY: -height * 0.15, moveX: width * 0.15, moveY: height * 0.1, delay: 0, opacity: 1 },
  { size: Math.min(width, height) * 0.5, color: 'rgba(78,205,196,0.16)', startX: width * 0.6, startY: -height * 0.1, moveX: -width * 0.2, moveY: height * 0.12, delay: 800, opacity: 1 },
  { size: Math.min(width, height) * 0.55, color: 'rgba(17,138,178,0.14)', startX: -width * 0.25, startY: height * 0.55, moveX: width * 0.18, moveY: -height * 0.1, delay: 1600, opacity: 1 },
  { size: Math.min(width, height) * 0.45, color: 'rgba(255,209,102,0.14)', startX: width * 0.65, startY: height * 0.6, moveX: -width * 0.15, moveY: -height * 0.12, delay: 1200, opacity: 1 }
];

const AnimatedBackground: React.FC = () => {
  const translateXs = blobs.map(() => useSharedValue(0));
  const translateYs = blobs.map(() => useSharedValue(0));
  const scales = blobs.map(() => useSharedValue(1));
  const opacities = blobs.map(() => useSharedValue(0));

  useEffect(() => {
    blobs.forEach((b, i) => {
      translateXs[i].value = withDelay(
        b.delay,
        withRepeat(
          withSequence(
            withTiming(b.moveX, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
            withTiming(-b.moveX, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 6000 })
          ),
          -1,
          true
        )
      );
      translateYs[i].value = withDelay(
        b.delay,
        withRepeat(
          withSequence(
            withTiming(b.moveY, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
            withTiming(-b.moveY, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 6000 })
          ),
          -1,
          true
        )
      );
      scales[i].value = withDelay(
        b.delay,
        withRepeat(
          withSequence(
            withTiming(1.08, { duration: 6000, easing: Easing.inOut(Easing.quad) }),
            withTiming(0.98, { duration: 6000, easing: Easing.inOut(Easing.quad) }),
            withTiming(1, { duration: 4000 })
          ),
          -1,
          true
        )
      );
      opacities[i].value = withDelay(
        b.delay,
        withRepeat(
          withSequence(
            withTiming(b.opacity, { duration: 3000 }),
            withTiming(b.opacity * 0.85, { duration: 4000 }),
            withTiming(b.opacity, { duration: 3000 })
          ),
          -1,
          true
        )
      );
    });
  }, []);

  const stylesArr = blobs.map((b, i) =>
    useAnimatedStyle(() => ({
      transform: [
        { translateX: translateXs[i].value },
        { translateY: translateYs[i].value },
        { scale: scales[i].value }
      ],
      opacity: opacities[i].value
    }))
  );

  return (
    <View style={styles.container} pointerEvents="none">
      {blobs.map((b, i) => (
        <Animated.View
          key={i}
          style={[
            {
              position: 'absolute',
              width: b.size,
              height: b.size,
              borderRadius: b.size / 2,
              backgroundColor: b.color,
              left: b.startX,
              top: b.startY
            },
            stylesArr[i]
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
  }
});

export default AnimatedBackground;
