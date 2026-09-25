import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Animated, StyleSheet, LayoutChangeEvent } from 'react-native';
import Matter from 'matter-js';
import {
  NigiriIcon,
  MakiIcon,
  GunkanIcon,
  SashimiIcon,
  TemakiIcon,
  UramakiIcon,
  Nigiri2Icon,
  Uramaki2Icon,
} from './SushiIcons';

const SUSHI_ICON_COMPONENTS = [
  NigiriIcon,
  MakiIcon,
  GunkanIcon,
  SashimiIcon,
  TemakiIcon,
  UramakiIcon,
  Nigiri2Icon,
  Uramaki2Icon,
];

// Oltre questo numero i pezzi più vecchi vengono rimossi per mantenere fluida la simulazione
const MAX_VISIBLE_PIECES = 60;
const WALL_THICKNESS = 40;

// 50% di probabilità per i nigiri (indici 0 e 6), il resto distribuito sulle altre icone
const getRandomIconIndex = (): number => {
  if (Math.random() < 0.5) {
    return Math.random() < 0.5 ? 0 : 6;
  }
  const otherIndices = [1, 2, 3, 4, 5, 7];
  return otherIndices[Math.floor(Math.random() * otherIndices.length)];
};

interface SushiStackProps {
  pieceCount: number;
}

interface SushiPiece {
  id: number;
  body: Matter.Body;
  iconIndex: number;
  size: number;
  x: Animated.Value;
  y: Animated.Value;
  angle: Animated.Value;
}

const SushiStack: React.FC<SushiStackProps> = ({ pieceCount }) => {
  const [pieces, setPieces] = useState<SushiPiece[]>([]);
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const piecesRef = useRef<SushiPiece[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const nextIdRef = useRef(0);
  // Numero di pezzi "logici" (punteggio) già rappresentati, anche se alcuni sono stati rimossi per il limite
  const representedRef = useRef(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!layout || layout.width !== width || layout.height !== height) setLayout({ width, height });
  };

  // Ciclo di simulazione: aggiorna direttamente gli Animated.Value e si ferma quando tutto è fermo
  const step = useCallback((time: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const delta = lastTimeRef.current == null ? 16.6 : Math.min(time - lastTimeRef.current, 33);
    lastTimeRef.current = time;
    Matter.Engine.update(engine, delta);

    let allSleeping = true;
    for (const piece of piecesRef.current) {
      const { position, angle, isSleeping } = piece.body;
      piece.x.setValue(position.x - piece.size / 2);
      piece.y.setValue(position.y - piece.size / 2);
      piece.angle.setValue(angle);
      if (!isSleeping) allSleeping = false;
    }

    if (allSleeping) {
      frameRef.current = null;
      lastTimeRef.current = null;
      return;
    }
    frameRef.current = requestAnimationFrame(step);
  }, []);

  const wake = useCallback(() => {
    if (frameRef.current == null) frameRef.current = requestAnimationFrame(step);
  }, [step]);

  // Creazione del mondo fisico in base alle dimensioni reali del contenitore
  useEffect(() => {
    if (!layout) return;
    const engine = Matter.Engine.create({ enableSleeping: true });
    engine.gravity.y = 1.2;
    const { width, height } = layout;
    const half = WALL_THICKNESS / 2;
    Matter.Composite.add(engine.world, [
      Matter.Bodies.rectangle(width / 2, height + half, width * 2, WALL_THICKNESS, { isStatic: true }),
      Matter.Bodies.rectangle(-half, height / 2, WALL_THICKNESS, height * 3, { isStatic: true }),
      Matter.Bodies.rectangle(width + half, height / 2, WALL_THICKNESS, height * 3, { isStatic: true }),
    ]);
    // I pezzi esistenti (es. dopo una rotazione dello schermo) vengono reinseriti nel nuovo mondo
    piecesRef.current.forEach((p) => {
      Matter.Body.setPosition(p.body, { x: Math.min(Math.max(p.body.position.x, p.size), width - p.size), y: -p.size });
      Matter.Composite.add(engine.world, p.body);
    });
    engineRef.current = engine;
    wake();

    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastTimeRef.current = null;
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
      engineRef.current = null;
    };
  }, [layout, wake]);

  // Sincronizza i pezzi con il punteggio: aggiunge quelli nuovi e rimuove in caso di annullamento
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !layout) return;

    let list = piecesRef.current;
    let changed = false;

    while (representedRef.current < pieceCount) {
      const size = 35 + Math.random() * 25;
      const x = Math.random() * (layout.width - size * 2) + size;
      const y = -size - Math.random() * 60;
      const body = Matter.Bodies.circle(x, y, (size * 0.95) / 2, {
        restitution: 0.3,
        friction: 0.7,
        density: 0.003,
        frictionAir: 0.015,
        angle: Math.random() * Math.PI * 2,
      });
      Matter.Composite.add(engine.world, body);
      list = [
        ...list,
        {
          id: nextIdRef.current++,
          body,
          iconIndex: getRandomIconIndex(),
          size,
          x: new Animated.Value(x - size / 2),
          y: new Animated.Value(y - size / 2),
          angle: new Animated.Value(body.angle),
        },
      ];
      representedRef.current += 1;
      changed = true;
    }

    while (representedRef.current > pieceCount) {
      const removed = list[list.length - 1];
      if (removed) {
        Matter.Composite.remove(engine.world, removed.body);
        list = list.slice(0, -1);
      }
      representedRef.current -= 1;
      changed = true;
    }

    while (list.length > MAX_VISIBLE_PIECES) {
      Matter.Composite.remove(engine.world, list[0].body);
      list = list.slice(1);
      changed = true;
    }

    if (changed) {
      piecesRef.current = list;
      setPieces(list);
      // Sveglia i corpi fermi così la pila si riassesta
      list.forEach((p) => Matter.Sleeping.set(p.body, false));
      wake();
    }
  }, [pieceCount, layout, wake]);

  return (
    <View style={styles.container} pointerEvents="none" onLayout={onLayout}>
      {pieces.map((piece) => {
        const IconComponent = SUSHI_ICON_COMPONENTS[piece.iconIndex];
        const rotate = piece.angle.interpolate({
          inputRange: [-Math.PI * 100, Math.PI * 100],
          outputRange: ['-18000deg', '18000deg'],
        });
        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.sushiPiece,
              {
                width: piece.size,
                height: piece.size,
                transform: [{ translateX: piece.x }, { translateY: piece.y }, { rotate }],
              },
            ]}
          >
            <IconComponent width={piece.size} height={piece.size} />
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  sushiPiece: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

export default SushiStack;
