import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float, Sparkles, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function AnimatedSphere({ score }) {
  const meshRef = useRef();
  const ringRef1 = useRef();
  const ringRef2 = useRef();

  const color = useMemo(() => {
    if (score >= 800) return new THREE.Color("#10b981"); // green
    if (score >= 700) return new THREE.Color("#4DA6FF"); // blue
    if (score >= 600) return new THREE.Color("#f59e0b"); // yellow
    return new THREE.Color("#ef4444");                   // red
  }, [score]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.18;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.28;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.x = state.clock.getElapsedTime() * 0.5;
      ringRef1.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.x = state.clock.getElapsedTime() * -0.2;
      ringRef2.current.rotation.y = state.clock.getElapsedTime() * 0.6;
    }
  });

  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={meshRef} scale={1.4}>
          <icosahedronGeometry args={[1, 6]} />
          <MeshDistortMaterial
            color={color}
            attach="material"
            distort={0.4}
            speed={2}
            roughness={0.1}
            metalness={0.9}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
        
        {/* Orbital Rings */}
        <mesh ref={ringRef1} scale={1.9}>
          <torusGeometry args={[1, 0.02, 16, 100]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.6} />
        </mesh>
        
        <mesh ref={ringRef2} scale={2.2}>
          <torusGeometry args={[1, 0.015, 16, 100]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.4} />
        </mesh>
        
        <Sparkles count={80} scale={5} size={3} speed={0.4} opacity={0.5} color={color} />
      </Float>
    </group>
  );
}

const ScoreOrb = ({ score }) => (
  <div className="score-orb-wrapper" style={{ cursor: 'pointer' }}>
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-10, -10, -5]} intensity={0.8} color="#a5b4fc" />
      
      <AnimatedSphere score={score} />
      
      <ContactShadows position={[0, -2.5, 0]} opacity={0.6} scale={10} blur={2} far={4} />
      <Environment preset="city" />
    </Canvas>
    
    <div className="score-orb-overlay" style={{ pointerEvents: 'none' }}>
      <span className="score-number">{score}</span>
      <span className="score-grade">FINPERSONA SCORE</span>
    </div>
  </div>
);

export default ScoreOrb;
