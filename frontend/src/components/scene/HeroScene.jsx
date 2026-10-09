import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function starShape(outer = 1, inner = 0.46, points = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

function useStarGeometry() {
  return useMemo(() => {
    const g = new THREE.ExtrudeGeometry(starShape(), {
      depth: 0.36,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.09,
      bevelSegments: 5,
    });
    g.center();
    return g;
  }, []);
}

const ORBIT = [
  { p: [-2.6, 1.3, -0.6], s: 0.42, c: '#ffb020', r: 0.4 },
  { p: [2.5, 1.7, -1.1], s: 0.3, c: '#f5efe6', r: -0.6 },
  { p: [2.9, -1.1, 0.2], s: 0.5, c: '#ff8a5c', r: 0.9 },
  { p: [-2.3, -1.6, 0.5], s: 0.33, c: '#f5efe6', r: -0.3 },
  { p: [0.4, 2.5, -1.6], s: 0.26, c: '#ffb020', r: 0.2 },
  { p: [-0.9, -2.4, -0.8], s: 0.28, c: '#ff5a2c', r: 0.7 },
];

function Cluster() {
  const group = useRef();
  const hero = useRef();
  const geometry = useStarGeometry();

  useFrame((state, dt) => {
    const { x, y } = state.pointer;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, x * 0.5, 3, dt);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -y * 0.3, 3, dt);
    hero.current.rotation.y += dt * 0.45;
  });

  return (
    <group ref={group} position={[0.9, 0.9, 0]} scale={0.82}>
      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.9}>
        <mesh ref={hero} geometry={geometry} scale={1.55}>
          <meshStandardMaterial color="#ff5a2c" roughness={0.28} metalness={0.15} />
        </mesh>
      </Float>

      {ORBIT.map((o, i) => (
        <Float key={i} speed={1.2 + i * 0.25} rotationIntensity={1.1} floatIntensity={1.4}>
          <mesh geometry={geometry} position={o.p} scale={o.s} rotation={[0.3, o.r, o.r]}>
            <meshStandardMaterial color={o.c} roughness={0.35} metalness={0.1} />
          </mesh>
        </Float>
      ))}

      <mesh rotation={[1.2, 0.3, 0]} position={[0, 0, -0.4]}>
        <torusGeometry args={[2.9, 0.012, 12, 160]} />
        <meshBasicMaterial color="#f5efe6" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[0.5, -0.6, 0.4]} position={[0, 0, -0.4]}>
        <torusGeometry args={[3.5, 0.01, 12, 160]} />
        <meshBasicMaterial color="#ff5a2c" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 8.4], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 5, 6]} intensity={2.4} />
      <pointLight position={[-5, -2, 3]} intensity={18} color="#ffb020" />
      <pointLight position={[3, -4, 2]} intensity={10} color="#ff5a2c" />
      <Cluster />
    </Canvas>
  );
}
