import React from 'react';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function LogoSvg({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
        stroke="url(#gradient)"
        strokeWidth="1.5"
        fill="none"
      />
      <Circle cx="16" cy="16" r="4" fill="url(#gradient)" />
      <Defs>
        <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#a78bfa" />
          <Stop offset="100%" stopColor="#3b82f6" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}
