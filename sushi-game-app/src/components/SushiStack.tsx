import React, { useEffect, useState, useRef } from "react";
import { View, Animated, Dimensions, StyleSheet } from "react-native";
import Matter from "matter-js";
import { 
  NigiriIcon, 
  MakiIcon, 
  GunkanIcon, 
  SashimiIcon, 
  TemakiIcon, 
  UramakiIcon,
  Nigiri2Icon,
  Uramaki2Icon
} from "./SushiIconsNew";

const SUSHI_ICON_COMPONENTS = [
  NigiriIcon,
  MakiIcon,
  GunkanIcon,
  SashimiIcon,
  TemakiIcon,
  UramakiIcon,
  Nigiri2Icon,
  Uramaki2Icon
];

// Funzione per selezionare icone con maggiore probabilità per i nigiri
const getRandomIconIndex = (): number => {
  const random = Math.random();
  
  // 50% di probabilità per i nigiri (indici 0 e 6)
  if (random < 0.5) {
    return Math.random() < 0.5 ? 0 : 6; // NigiriIcon o Nigiri2Icon
  }
  
  // 50% per le altre icone (indici 1-5, 7)
  const otherIndices = [1, 2, 3, 4, 5, 7];
  return otherIndices[Math.floor(Math.random() * otherIndices.length)];
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface SushiStackProps {
  pieceCount: number;
}

interface SushiPiece {
  id: number;
  animatedValue: Animated.Value;
  rotateValue: Animated.Value;
  scaleValue: Animated.Value;
  x: number;
  y: number;
  body: Matter.Body;
  iconIndex: number;
  size: number;
}

const SushiStack: React.FC<SushiStackProps> = ({ pieceCount }) => {
  const [pieces, setPieces] = useState<SushiPiece[]>([]);
  const engineRef = useRef<Matter.Engine>(null);
  const worldRef = useRef<Matter.World>(null);

  useEffect(() => {
    const engine = Matter.Engine.create();
    engine.world.gravity.y = 1.2;
    engineRef.current = engine;
    worldRef.current = engine.world;

    const ground = Matter.Bodies.rectangle(
      screenWidth / 2,
      screenHeight - 10,
      screenWidth,
      20,
      { isStatic: true }
    );
    const leftWall = Matter.Bodies.rectangle(10, screenHeight / 2, 20, screenHeight, { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(screenWidth - 10, screenHeight / 2, 20, screenHeight, { isStatic: true });

    Matter.World.add(engine.world, [ground, leftWall, rightWall]);

    const runner = Matter.Runner.create({ 
      delta: 1000 / 60
    });
    Matter.Runner.run(runner, engine);

    return () => {
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, []);

  useEffect(() => {
    let animationId: number;

    const updatePositions = () => {
      if (engineRef.current && pieces.length > 0) {
        setPieces(prevPieces =>
          prevPieces.map(piece => ({
            ...piece,
            x: piece.body.position.x,
            y: piece.body.position.y,
          }))
        );
      }
      animationId = requestAnimationFrame(updatePositions);
    };

    if (pieces.length > 0) {
      updatePositions();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [pieces.length]);

  useEffect(() => {
    if (pieceCount > pieces.length && worldRef.current) {
      const newPieces: SushiPiece[] = [];

      for (let i = pieces.length; i < pieceCount; i++) {
        const spawnX = Math.random() * (screenWidth - 60) + 30;
        const spawnY = -50;

        // Dimensioni ridotte per migliorare il contatto
        const randomSize = 35 + Math.random() * 25; // Era 50 + Math.random() * 40
        // Raggio fisico leggermente più grande per ridurre la sovrapposizione
        const physicsRadius = (randomSize * 0.95) / 2; // Era 0.85

        const body = Matter.Bodies.circle(spawnX, spawnY, physicsRadius, {
          restitution: 0.3, // Ridotto per meno rimbalzi
          friction: 0.7,    // Aumentato per più attrito
          density: 0.003,   // Leggermente aumentato
          frictionAir: 0.015, // Aumentato per rallentare il movimento
        });

        const newPiece: SushiPiece = {
          id: i,
          animatedValue: new Animated.Value(spawnY),
          rotateValue: new Animated.Value(Math.random() * 360),
          scaleValue: new Animated.Value(1),
          x: spawnX,
          y: spawnY,
          body: body,
          iconIndex: getRandomIconIndex(), // Usa la nuova funzione per favorire i nigiri
          size: randomSize,
        };

        Matter.World.add(worldRef.current!, body);
        newPieces.push(newPiece);
      }

      setPieces(prev => [...prev, ...newPieces]);
    }
  }, [pieceCount, pieces.length]);

  return (
    <View style={styles.container}>
      {pieces.map(piece => {
        const IconComponent = SUSHI_ICON_COMPONENTS[piece.iconIndex];

        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.sushiPiece,
              {
                transform: [
                  { translateX: piece.x - piece.size / 2 },
                  { translateY: piece.y - piece.size / 2 },
                  { rotate: `${piece.body.angle * (180 / Math.PI)}deg` },
                  { scale: piece.scaleValue },
                ],
                width: piece.size,
                height: piece.size,
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  sushiPiece: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  sushiIcon: {
    width: "100%",
    height: "100%",
  },
});

export default SushiStack;
