import React, { useEffect, useState, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';
import Matter from 'matter-js';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
}

const SushiStack: React.FC<SushiStackProps> = ({ pieceCount }) => {
  const [pieces, setPieces] = useState<SushiPiece[]>([]);
  const engineRef = useRef<Matter.Engine>(null);
  const worldRef = useRef<Matter.World>(null);
  const animationFrameRef = useRef<number>(0);

  // Inizializza il motore fisico
  useEffect(() => {
    const engine = Matter.Engine.create();
    engine.world.gravity.y = 1.2; // Gravità aumentata per far cadere i pezzi più velocemente
    engineRef.current = engine;
    worldRef.current = engine.world;

    // Crea i bordi del mondo fisico
    const ground = Matter.Bodies.rectangle(screenWidth / 2, screenHeight - 10, screenWidth, 20, { isStatic: true });
    const leftWall = Matter.Bodies.rectangle(10, screenHeight / 2, 20, screenHeight, { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(screenWidth - 10, screenHeight / 2, 20, screenHeight, { isStatic: true });
    
    Matter.World.add(engine.world, [ground, leftWall, rightWall]);

    // Avvia il motore fisico con frame rate più alto
    const runner = Matter.Runner.create({
      delta: 1000 / 60, // 60 FPS per animazioni più fluide
      isFixed: true,
    });
    Matter.Runner.run(runner, engine);

    return () => {
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, []);

  // Aggiorna le posizioni dei pezzi in base alla fisica
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

  // Aggiungi nuovi pezzi quando il conteggio cambia
  useEffect(() => {
    if (pieceCount > pieces.length && worldRef.current) {
      const newPieces: SushiPiece[] = [];
      
      for (let i = pieces.length; i < pieceCount; i++) {
        const spawnX = Math.random() * (screenWidth - 40) + 20; // Posizione casuale orizzontale
        const spawnY = -50; // Spawn dall'alto
        
        // Crea il corpo fisico
        const body = Matter.Bodies.circle(spawnX, spawnY, 15, {
          restitution: 0.4, // Ridotto per meno rimbalzi
          friction: 0.5, // Aumentato per più stabilità
          density: 0.002, // Aumentato leggermente per più peso
          frictionAir: 0.01, // Aggiunta resistenza dell'aria per movimento più naturale
        });
        
        const newPiece: SushiPiece = {
          id: i,
          animatedValue: new Animated.Value(spawnY),
          rotateValue: new Animated.Value(Math.random() * 360),
          scaleValue: new Animated.Value(0.8 + Math.random() * 0.4),
          x: spawnX,
          y: spawnY,
          body: body,
        };
        
        // Aggiungi il corpo al mondo fisico
        Matter.World.add(worldRef.current!, body);
        newPieces.push(newPiece);
      }
      
      setPieces(prev => [...prev, ...newPieces]);
    }
  }, [pieceCount, pieces.length]);

  return (
    <View style={styles.container}>
      {pieces.map((piece) => (
        <Animated.View
          key={piece.id}
          style={[
            styles.sushiPiece,
            {
              left: piece.x - 20, // Centra il pezzo
              top: piece.y - 20,
              transform: [
                { rotate: piece.rotateValue.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg']
                }) },
                { scale: piece.scaleValue },
              ],
            },
          ]}
        >
          <View style={styles.sushi} />
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  sushiPiece: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sushi: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF8A65',
    borderWidth: 2,
    borderColor: '#FF5722',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default SushiStack;