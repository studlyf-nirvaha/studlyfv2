import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

// Types for the visualizer
interface CharacterNode {
  char: string;
  index: number;
  position: [number, number, number];
  color: string;
  isPalindrome: boolean;
  radius: number;
}

interface PalindromeRange {
  start: number;
  end: number;
  length: number;
  text: string;
}

// 3D Character Sphere Component
function CharacterSphere({ node, isActive, onClick }: {
  node: CharacterNode;
  isActive: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      if (isActive || hovered) {
        meshRef.current.scale.setScalar(1.2);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[node.radius, 16, 16]} />
        <meshStandardMaterial
          color={node.color}
          emissive={isActive ? node.color : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      <Html position={[0, node.radius + 0.3, 0]} center>
        <div className="text-white font-bold text-lg bg-black/50 px-2 py-1 rounded">
          {node.char}
        </div>
      </Html>
      <Text
        position={[0, -node.radius - 0.3, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {node.index}
      </Text>
    </group>
  );
}

// Connection Line Component
function ConnectionLine({ start, end, color }: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) {
  const points = React.useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
  const lineGeometry = React.useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const line = React.useMemo(() => {
    const material = new THREE.LineBasicMaterial({ color });
    return new THREE.Line(lineGeometry, material);
  }, [lineGeometry, color]);

  return <primitive object={line} />;
}

// Main 3D Visualizer Component
function DSAVisualizer3D({ input }: { input: string }) {
  const [characters, setCharacters] = useState<CharacterNode[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [palindromes, setPalindromes] = useState<PalindromeRange[]>([]);
  const [currentPalindrome, setCurrentPalindrome] = useState<PalindromeRange | null>(null);

  // Initialize characters
  useEffect(() => {
    const chars = input.split('').map((char, index) => ({
      char,
      index,
      position: [index * 2 - (input.length - 1), 0, 0] as [number, number, number],
      color: '#4F46E5',
      isPalindrome: false,
      radius: 0.5
    }));
    setCharacters(chars);
  }, [input]);

  // Expand Around Center Algorithm
  const expandAroundCenter = (s: string, left: number, right: number): PalindromeRange => {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      left--;
      right++;
    }
    return {
      start: left + 1,
      end: right - 1,
      length: right - left - 1,
      text: s.substring(left + 1, right)
    };
  };

  // Find longest palindromic substring
  const findLongestPalindrome = () => {
    const steps: PalindromeRange[] = [];
    let maxLength = 0;
    let start = 0;

    for (let i = 0; i < input.length; i++) {
      // Odd length palindromes
      const odd = expandAroundCenter(input, i, i);
      steps.push(odd);
      if (odd.length > maxLength) {
        maxLength = odd.length;
        start = odd.start;
      }

      // Even length palindromes
      const even = expandAroundCenter(input, i, i + 1);
      steps.push(even);
      if (even.length > maxLength) {
        maxLength = even.length;
        start = even.start;
      }
    }

    setPalindromes(steps);
    return { start, length: maxLength };
  };

  // Animation logic
  useEffect(() => {
    if (isPlaying && currentStep < palindromes.length) {
      const timer = setTimeout(() => {
        const currentPal = palindromes[currentStep];
        setCurrentPalindrome(currentPal);

        // Update character colors based on current palindrome
        setCharacters(prev => prev.map(char => ({
          ...char,
          color: (char.index >= currentPal.start && char.index <= currentPal.end)
            ? '#10B981' // Green for palindrome
            : '#4F46E5' // Blue for normal
        })));

        setCurrentStep(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (currentStep >= palindromes.length) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, palindromes, speed]);

  const startVisualization = () => {
    findLongestPalindrome();
    setCurrentStep(0);
    setIsPlaying(true);
  };

  const resetVisualization = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setCurrentPalindrome(null);
    setCharacters(prev => prev.map(char => ({ ...char, color: '#4F46E5' })));
  };

  return (
    <div className="w-full h-[600px] bg-gray-900 rounded-2xl overflow-hidden relative">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 bg-black/50 p-4 rounded-lg">
        <div className="flex gap-2 mb-4">
          <button
            onClick={startVisualization}
            disabled={isPlaying}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Start
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            {isPlaying ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={resetVisualization}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Reset
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-white text-sm">Speed:</label>
          <input
            type="range"
            min="200"
            max="2000"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-white text-sm">{speed}ms</span>
        </div>
      </div>

      {/* Info Panel */}
      <div className="absolute top-4 right-4 z-10 bg-black/50 p-4 rounded-lg max-w-xs">
        <h3 className="text-white font-bold mb-2">Expand Around Center</h3>
        <div className="text-gray-300 text-sm space-y-1">
          <p>Step: {currentStep}/{palindromes.length}</p>
          {currentPalindrome && (
            <>
              <p>Current: "{currentPalindrome.text}"</p>
              <p>Length: {currentPalindrome.length}</p>
              <p>Range: [{currentPalindrome.start}, {currentPalindrome.end}]</p>
            </>
          )}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Character Spheres */}
        {characters.map((char, index) => (
          <CharacterSphere
            key={index}
            node={char}
            isActive={currentPalindrome ? (index >= currentPalindrome.start && index <= currentPalindrome.end) : false}
            onClick={() => {}}
          />
        ))}

        {/* Connection Lines for current palindrome */}
        {currentPalindrome && (
          <>
            {Array.from({ length: currentPalindrome.end - currentPalindrome.start }, (_, i) => {
              const startIdx = currentPalindrome.start + i;
              const endIdx = currentPalindrome.start + i + 1;
              if (endIdx <= currentPalindrome.end) {
                return (
                  <ConnectionLine
                    key={i}
                    start={characters[startIdx].position}
                    end={characters[endIdx].position}
                    color="#10B981"
                  />
                );
              }
              return null;
            })}
          </>
        )}

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
}

export default DSAVisualizer3D;

