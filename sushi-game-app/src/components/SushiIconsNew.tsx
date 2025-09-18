import React from 'react';
import { Image, ImageStyle } from 'react-native';

interface SushiIconProps {
  width?: number;
  height?: number;
  style?: ImageStyle;
}

// Nigiri Icon
export const NigiriIcon: React.FC<SushiIconProps> = ({ width = 40, height = 40, style }) => (
  <Image
    source={require('../../assets/sushi-icons/nigiri.png')}
    style={[{ width, height }, style]}
    resizeMode="contain"
  />
);

// Maki Icon
export const MakiIcon: React.FC<SushiIconProps> = ({ width = 40, height = 40, style }) => (
  <Image
    source={require('../../assets/sushi-icons/maki.png')}
    style={[{ width, height }, style]}
    resizeMode="contain"
  />
);

// Gunkan Icon
export const GunkanIcon: React.FC<SushiIconProps> = ({ width = 40, height = 40, style }) => (
  <Image
    source={require('../../assets/sushi-icons/gunkan.png')}
    style={[{ width, height }, style]}
    resizeMode="contain"
  />
);

// Sashimi Icon
export const SashimiIcon: React.FC<SushiIconProps> = ({ width = 40, height = 40, style }) => (
  <Image
    source={require('../../assets/sushi-icons/sashimi.png')}
    style={[{ width, height }, style]}
    resizeMode="contain"
  />
);

// Temaki Icon
export const TemakiIcon: React.FC<SushiIconProps> = ({ width = 40, height = 40, style }) => (
  <Image
    source={require('../../assets/sushi-icons/temaki.png')}
    style={[{ width, height }, style]}
    resizeMode="contain"
  />
);

// Nigiri2 Icon
export const Nigiri2Icon: React.FC<SushiIconProps> = ({ width = 40, height = 40, style }) => (
  <Image
    source={require('../../assets/sushi-icons/nigiri-2.png')}
    style={[{ width, height }, style]}
    resizeMode="contain"
  />
);

// Uramaki Icon
export const UramakiIcon: React.FC<SushiIconProps> = ({ width = 40, height = 40, style }) => (
  <Image
    source={require('../../assets/sushi-icons/uramaki.png')}
    style={[{ width, height }, style]}
    resizeMode="contain"
  />
);

// Uramaki2 Icon
export const Uramaki2Icon: React.FC<SushiIconProps> = ({ width = 40, height = 40, style }) => (
  <Image
    source={require('../../assets/sushi-icons/uramaki-2.png')}
    style={[{ width, height }, style]}
    resizeMode="contain"
  />
);