"use client";

import { Suspense, useMemo, useRef, useEffect, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

// Cinematic "journey home" imagery — reliable CORS-enabled sources, easily swappable.
const IMAGES = [
  "https://picsum.photos/id/1018/900/1200",
  "https://picsum.photos/id/1039/900/1200",
  "https://picsum.photos/id/1043/900/1200",
  "https://picsum.photos/id/1015/900/1200",
  "https://picsum.photos/id/1016/900/1200",
  "https://picsum.photos/id/1024/900/1200",
  "https://picsum.photos/id/1036/900/1200",
  "https://picsum.photos/id/110/900/1200",
];

const vertex = `
uniform float uVelocity; uniform float uTime; varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 p = position;
  // ripple/bend driven by scroll velocity — heavy, organic
  p.z += sin(p.y * 2.4 + uTime) * uVelocity * 0.7;
  p.x += sin(p.y * 5.0 + uTime * 1.4) * uVelocity * 0.28;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const fragment = `
uniform sampler2D uTex; uniform float uOpacity; varying vec2 vUv;
void main(){
  vec4 c = texture2D(uTex, vUv);
  // warm dawn grade
  c.rgb = mix(c.rgb, c.rgb * vec3(1.08, 0.96, 0.82) + vec3(0.04, 0.01, 0.0), 0.45);
  gl_FragColor = vec4(c.rgb, c.a * uOpacity);
}`;

interface PanelProps {
  url: string;
  index: number;
  count: number;
  prog: RefObject<number>;
  vel: RefObject<number>;
}

function Panel({ url, index, count, prog, vel }: PanelProps) {
  const tex = useTexture(url);
  const mesh = useRef<THREE.Mesh>(null!);
  const uniforms = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    return {
      uTex: { value: tex },
      uVelocity: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    };
  }, [tex]);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const p = prog.current * (count - 1);
    const local = p - index; // ~0 when this panel is centered in view
    m.position.z = THREE.MathUtils.lerp(m.position.z, -local * 5.5, 0.12);
    m.position.x = (index % 2 ? 1 : -1) * 2.1;
    m.position.y = -local * 2.1;
    m.rotation.z = (index % 2 ? 1 : -1) * 0.045;
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uVelocity.value = vel.current;
    uniforms.uOpacity.value = THREE.MathUtils.clamp(1.5 - Math.abs(local) * 0.7, 0, 1);
  });

  return (
    <mesh ref={mesh} position={[0, 0, -index * 5.5]}>
      <planeGeometry args={[3.4, 4.6, 40, 40]} />
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

function Rig({ prog, vel }: { prog: RefObject<number>; vel: RefObject<number> }) {
  const target = useRef(0);
  const prev = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      target.current = max > 0 ? window.scrollY / max : 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useFrame(() => {
    // heavy, premium lerp
    prog.current = THREE.MathUtils.lerp(prog.current, target.current, 0.07);
    vel.current = THREE.MathUtils.lerp(vel.current, (prog.current - prev.current) * 38, 0.1);
    prev.current = prog.current;
  });
  return null;
}

export default function Scene3D() {
  const prog = useRef(0);
  const vel = useRef(0);
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 55 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <Rig prog={prog} vel={vel} />
      <Suspense fallback={null}>
        {IMAGES.map((u, i) => (
          <Panel key={i} url={u} index={i} count={IMAGES.length} prog={prog} vel={vel} />
        ))}
      </Suspense>
    </Canvas>
  );
}
