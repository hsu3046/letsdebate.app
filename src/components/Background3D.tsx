'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function FloatingParticles() {
    const meshRef = useRef<THREE.Points>(null);
    const count = 100;

    const particles = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20; // x
            positions[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10; // z

            // Mint accent color (#3FEEAE) with variations
            colors[i * 3] = 0.25 + Math.random() * 0.1; // R
            colors[i * 3 + 1] = 0.9 + Math.random() * 0.1; // G
            colors[i * 3 + 2] = 0.6 + Math.random() * 0.1; // B
        }

        return { positions, colors };
    }, []);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.05;
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.08;
        }
    });

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[particles.positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[particles.colors, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                vertexColors
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    );
}

function GradientSphere() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.3;
        }
    });

    return (
        <mesh ref={meshRef} position={[3, 0, -5]} scale={2}>
            <icosahedronGeometry args={[1, 2]} />
            <meshBasicMaterial
                color="#3FEEAE"
                wireframe
                transparent
                opacity={0.3}
            />
        </mesh>
    );
}

export default function Background3D() {
    return (
        <div className="fixed inset-0 -z-10 pointer-events-none">
            <Canvas
                camera={{ position: [0, 0, 8], fov: 50 }}
                dpr={[1, 1.5]}
                gl={{ antialias: true, alpha: true }}
            >
                <ambientLight intensity={0.5} />
                <FloatingParticles />
                <GradientSphere />
            </Canvas>
        </div>
    );
}
