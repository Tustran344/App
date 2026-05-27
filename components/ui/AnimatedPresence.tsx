import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { ui } from '@/constants/ui';

export function AnimatedIn({
  children,
  deps,
}: {
  children: React.ReactNode;
  deps: any[];
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(10);
    scale.setValue(0.98);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: ui.animation.durationFast, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: ui.animation.durationFast, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: ui.animation.durationFast, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      {children}
    </Animated.View>
  );
}

