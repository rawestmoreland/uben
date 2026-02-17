import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// Keep the splash screen visible while we prepare resources
SplashScreen.preventAutoHideAsync();

interface AnimatedSplashProps {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  // Letter animations
  const letterU = useRef(new Animated.Value(-100)).current;
  const letterB = useRef(new Animated.Value(-100)).current;
  const letterE = useRef(new Animated.Value(-100)).current;
  const letterN = useRef(new Animated.Value(-100)).current;

  // Letter rotation animations
  const rotateU = useRef(new Animated.Value(0)).current;
  const rotateB = useRef(new Animated.Value(0)).current;
  const rotateE = useRef(new Animated.Value(0)).current;
  const rotateN = useRef(new Animated.Value(0)).current;

  // Tagline animation
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(20)).current;

  // Loading dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // Decorative elements
  const circleScale = useRef(new Animated.Value(0)).current;
  const squareScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log(
      '[AnimatedSplash] Component mounted, hiding native splash and starting animations',
    );
    // Hide the native splash screen immediately so our animated splash is visible
    SplashScreen.hideAsync();

    // Create bouncing animation for each letter
    const createLetterBounce = (
      anim: Animated.Value,
      delay: number,
      rotation?: Animated.Value,
    ) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.spring(anim, {
            toValue: 0,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }),
          rotation
            ? Animated.sequence([
                Animated.timing(rotation, {
                  toValue: 1,
                  duration: 600,
                  easing: Easing.out(Easing.back(1.5)),
                  useNativeDriver: true,
                }),
                Animated.spring(rotation, {
                  toValue: 0,
                  friction: 8,
                  useNativeDriver: true,
                }),
              ])
            : Animated.timing(new Animated.Value(0), {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
              }),
        ]),
      ]);
    };

    // Stagger the letter animations with more spacing
    const letterAnimations = Animated.parallel([
      createLetterBounce(letterU, 200, rotateU),
      createLetterBounce(letterB, 350, rotateB),
      createLetterBounce(letterE, 500, rotateE),
      createLetterBounce(letterN, 650, rotateN),
    ]);

    // Decorative elements pop in (after letters start)
    const decoAnimations = Animated.parallel([
      Animated.spring(circleScale, {
        toValue: 1,
        delay: 800,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(squareScale, {
        toValue: 1,
        delay: 950,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]);

    // Tagline fades in (after letters finish bouncing)
    const taglineAnimation = Animated.parallel([
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 800,
        delay: 1100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(taglineY, {
        toValue: 0,
        delay: 1100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]);

    // Loading dots animation (loop)
    const dotAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.bezier(0.34, 1.56, 0.64, 1), // Bouncy easing
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const dotAnimations = [
      dotAnimation(dot1, 1400),
      dotAnimation(dot2, 1600),
      dotAnimation(dot3, 1800),
    ];

    // Start all animations
    letterAnimations.start();
    decoAnimations.start();
    taglineAnimation.start();
    dotAnimations.forEach((anim) => anim.start());

    // Keep splash visible longer to showcase the full animation
    const timer = setTimeout(async () => {
      // Fade out animation before finishing
      Animated.parallel([
        Animated.timing(letterU, {
          toValue: -100,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(letterB, {
          toValue: -100,
          duration: 400,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.timing(letterE, {
          toValue: -100,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(letterN, {
          toValue: -100,
          duration: 400,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log('[AnimatedSplash] Animations complete, finishing splash');
        onFinish();
      });
    }, 3500);

    console.log('[AnimatedSplash] Splash will auto-hide in 3.5 seconds');

    return () => {
      clearTimeout(timer);
      dotAnimations.forEach((anim) => anim.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Interpolations for rotation
  const rotateUInterpolate = rotateU.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotateBInterpolate = rotateB.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const rotateEInterpolate = rotateE.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotateNInterpolate = rotateN.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  // Dot scale interpolations
  const dot1Scale = dot1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.3],
  });

  const dot2Scale = dot2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.3],
  });

  const dot3Scale = dot3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.3],
  });

  return (
    <View style={styles.container}>
      {/* Decorative circle */}
      <Animated.View
        style={[
          styles.decoCircle,
          {
            transform: [{ scale: circleScale }],
          },
        ]}
      />

      {/* Decorative square */}
      <Animated.View
        style={[
          styles.decoSquare,
          {
            transform: [{ scale: squareScale }, { rotate: '15deg' }],
          },
        ]}
      />

      {/* Logo letters */}
      <View style={styles.logoContainer}>
        <Animated.Text
          style={[
            styles.letter,
            {
              transform: [
                { translateY: letterU },
                { rotate: rotateUInterpolate },
              ],
            },
          ]}
        >
          Ü
        </Animated.Text>
        <Animated.Text
          style={[
            styles.letter,
            {
              transform: [
                { translateY: letterB },
                { rotate: rotateBInterpolate },
              ],
            },
          ]}
        >
          B
        </Animated.Text>
        <Animated.Text
          style={[
            styles.letter,
            {
              transform: [
                { translateY: letterE },
                { rotate: rotateEInterpolate },
              ],
            },
          ]}
        >
          E
        </Animated.Text>
        <Animated.Text
          style={[
            styles.letter,
            {
              transform: [
                { translateY: letterN },
                { rotate: rotateNInterpolate },
              ],
            },
          ]}
        >
          N
        </Animated.Text>
      </View>

      {/* Tagline */}
      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineY }],
          },
        ]}
      >
        PRACTICE MAKES PERFECT
      </Animated.Text>

      {/* Loading dots */}
      <View style={styles.loadingDots}>
        <Animated.View
          style={[
            styles.dot,
            {
              transform: [{ scale: dot1Scale }],
              opacity: dot1,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              transform: [{ scale: dot2Scale }],
              opacity: dot2,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              transform: [{ scale: dot3Scale }],
              opacity: dot3,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  letter: {
    fontSize: 100,
    fontWeight: '900',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: -4,
    marginHorizontal: 2,
    // Use your custom font here when loaded
    fontFamily: 'System',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 60,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  dot: {
    width: 16,
    height: 16,
    backgroundColor: '#000',
    borderWidth: 3,
    borderColor: '#000',
  },
  decoCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    backgroundColor: '#0066FF',
    borderRadius: 100,
    top: -100,
    right: -80,
    borderWidth: 5,
    borderColor: '#000',
  },
  decoSquare: {
    position: 'absolute',
    width: 120,
    height: 120,
    backgroundColor: '#FF3333',
    bottom: -60,
    left: -40,
    borderWidth: 5,
    borderColor: '#000',
  },
});
