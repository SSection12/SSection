/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useScroll, useTransform, useSpring, useMotionTemplate } from 'framer-motion';
import { Suspense, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, PresentationControls, ContactShadows, useProgress, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import BismuthModel from './components/BismuthModel';
import { Disc as Discord, Github, Twitter, Mail } from 'lucide-react';

// Anti-debugging loop (encourages standard browsing behavior)
const useAntiDebug = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      // This will pause execution IF the browser developer tools are open.
      (function() {
        debugger;
      }());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
};

function Loader() {
  const { progress } = useProgress();
  return <Html center><div className="text-white font-mono text-xl">{progress.toFixed(0)}%</div></Html>;
}

function AnimatedModel({ modelX, modelY, modelScale, modelRotationX, modelRotationY }: { modelX: any, modelY: any, modelScale: any, modelRotationX: any, modelRotationY: any }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = modelX.get();
      groupRef.current.position.y = modelY.get();
      const s = modelScale.get();
      groupRef.current.scale.set(s, s, s);
      groupRef.current.rotation.x = modelRotationX.get();
      groupRef.current.rotation.y = modelRotationY.get();
    }
  });

  return (
    <group ref={groupRef}>
      <PresentationControls
        global
        snap={false}
        rotation={[0, 0, 0]}
        polar={[-Math.PI / 2, Math.PI / 2]}
        azimuth={[-Infinity, Infinity]}
      >
        <Float speed={3} rotationIntensity={0.5} floatIntensity={0.8}>
          <BismuthModel />
        </Float>
      </PresentationControls>
    </group>
  );
}

export default function App() {
  useAntiDebug();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Animations definitions based on scroll progress
  // Hero is 120vh, Section 2 is 100vh, Section 3 is 120vh, Footer is ~50vh
  // Total Scrollable: (120+100+120+50) - 100 = 290vh approx.
  // Hero end: ~0.4
  // Section 2 center: ~0.55
  // Section 3 center: ~0.85

  const modelY = useTransform(
    smoothProgress, 
    [0, 0.15, 0.85, 1], 
    [0.8, 0, 0, 0]
  );
  
  const modelX = useTransform(
    smoothProgress, 
    [0, 0.2, 0.5, 0.85, 1], 
    [0, 0, 3.0, -3.0, 0]
  );

  const modelScale = useTransform(
    smoothProgress, 
    [0, 0.15, 0.85, 1], 
    [0.75, 1.05, 1.05, 0.9]
  );
  const modelRotationX = useTransform(smoothProgress, [0, 1], [0, Math.PI * 2]);
  const modelRotationY = useTransform(smoothProgress, [0, 1], [0, Math.PI * 6]);

  // Text animations - Section 2 (Perspective 01)
  const intro1Opacity = useTransform(smoothProgress, [0.25, 0.45, 0.65, 0.75], [0, 1, 1, 0]);
  const intro1Blur = useTransform(smoothProgress, [0.25, 0.45, 0.65, 0.75], [15, 0, 0, 15]);
  const intro1Filter = useMotionTemplate`blur(${intro1Blur}px)`;
  const intro1X = useTransform(smoothProgress, [0.25, 0.45], [-50, 0]);
  
  // Section 3 (Perspective 02)
  const intro2Opacity = useTransform(smoothProgress, [0.65, 0.8, 0.95, 1.0], [0, 1, 1, 0]);
  const intro2Blur = useTransform(smoothProgress, [0.65, 0.8, 0.95, 1.0], [15, 0, 0, 15]);
  const intro2Filter = useMotionTemplate`blur(${intro2Blur}px)`;
  const intro2X = useTransform(smoothProgress, [0.65, 0.8], [50, 0]);

  const heroOpacity = useTransform(smoothProgress, [0, 0.25], [1, 0]);
  const heroScale = useTransform(smoothProgress, [0, 0.25], [1, 0.8]);

  return (
    <div ref={containerRef} className="relative bg-[#050505] text-[#f2f2f2] select-none overflow-x-hidden font-sans">
      {/* Background Texture Overlay */}
      <div className="fixed inset-0 dot-grid z-0" />

      {/* 3D Canvas - Fixed Position */}
      <div className="fixed inset-0 z-0 h-screen w-full pointer-events-auto">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 12], fov: 35 }}>
          <color attach="background" args={['#050505']} />
          <ambientLight intensity={0.8} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={4} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={3.5} color="#ff00cc" />
          <pointLight position={[10, -10, 10]} intensity={3.5} color="#00ffff" />
          
          <Suspense fallback={<Loader />}>
            <AnimatedModel 
              modelX={modelX} 
              modelY={modelY} 
              modelScale={modelScale} 
              modelRotationX={modelRotationX}
              modelRotationY={modelRotationY} 
            />
            
            <Environment preset="city" />
            <ContactShadows position={[0, -4.5, 0]} opacity={0.3} scale={30} blur={2.5} far={10} />
            
            <EffectComposer>
              <Bloom 
                intensity={0.8}
                luminanceThreshold={0.2}
                luminanceSmoothing={0.9}
                height={500}
              />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 w-full pointer-events-none">
        {/* Navigation Bar */}
        <nav className="fixed top-0 left-0 w-full p-10 flex justify-between items-center z-50 pointer-events-auto">
          <div className="text-[10px] font-bold uppercase tracking-[0.6em] border-l-2 border-white pl-4">Hello I'm SSection</div>
          <div className="hidden md:flex space-x-16 text-[9px] font-medium uppercase tracking-[0.3em] opacity-80">
            <button 
              onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} 
              className="hover:opacity-100 transition-opacity cursor-pointer"
            >
              Home
            </button>
            <button 
              onClick={() => document.getElementById('content')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} 
              className="hover:opacity-100 transition-opacity cursor-pointer"
            >
              Content
            </button>
            <button 
              onClick={() => document.getElementById('socials')?.scrollIntoView({ behavior: 'smooth', block: 'end' })} 
              className="hover:opacity-100 transition-opacity cursor-pointer"
            >
              Socials
            </button>
          </div>
        </nav>

        {/* Section 1: Hero */}
        <section id="hero" className="h-[120vh] flex flex-col items-center justify-center pointer-events-none">
          <motion.div 
            style={{ opacity: heroOpacity, scale: heroScale }}
            className="flex flex-col items-center relative"
          >
            <h1 className="text-8xl md:text-[140px] font-serif italic text-white leading-none tracking-tight">
              SSection
            </h1>
            
            <div className="absolute bottom-[-10rem] flex flex-col items-center space-y-6 opacity-30 mt-20">
              <span className="text-[9px] uppercase tracking-[0.4em] font-light">Drag to Inspect Bismuth</span>
              <div className="w-[1px] h-20 bg-gradient-to-b from-white to-transparent"></div>
            </div>
          </motion.div>
        </section>

        {/* Section 2: Intro Left */}
        <section id="content" className="h-[100vh] flex items-center justify-start px-8 md:px-32">
          <motion.div 
            style={{ 
              opacity: intro1Opacity, 
              filter: intro1Filter,
              x: intro1X 
            }}
            className="max-w-xl pointer-events-auto"
          >
            <div className="w-8 h-[1px] bg-white opacity-40 mb-4"></div>
            <span className="text-xs uppercase tracking-widest font-semibold block mb-2">Description 01</span>
            <h2 className="text-5xl md:text-7xl font-serif italic leading-tight mb-8">
              Hello, I'm <br/> SSection
            </h2>
            <p className="text-sm md:text-base italic leading-relaxed text-zinc-400 max-w-md">
              I'm a Student from Indonesia. I like to experiment around random stuffs. 
              You might see me tinkering with cloudflare, codes, ESP32's. bla bla bla, all that stuffs
            </p>
          </motion.div>
        </section>

        {/* Section 3: Tech Right */}
        <section className="h-[120vh] flex items-center justify-end px-8 md:px-32">
          <motion.div 
            style={{ 
              opacity: intro2Opacity, 
              filter: intro2Filter,
              x: intro2X
            }}
            className="max-w-xl text-right flex flex-col items-end pointer-events-auto"
          >
            <div className="w-8 h-[1px] bg-white opacity-40 mb-4"></div>
            <span className="text-xs uppercase tracking-widest font-semibold block mb-2">Description 02</span>
            <h2 className="text-5xl md:text-7xl font-serif italic leading-tight mb-8">
              Project / <br/> / Status:
            </h2>
            <p className="text-sm md:text-base italic leading-relaxed text-zinc-400 max-w-md">
              1. Lead Developer at Mangako Productions. <br/>
              2. Wakagashira-Hosa at Kanagawa-Ikka <br/> <br/>
              I'm currently doing a few projects such as *Project: Kivotos* and require some help. DM my discord.
            </p>
          </motion.div>
        </section>

        {/* Footer */}
        <footer id="socials" className="w-full p-10 flex flex-col md:flex-row justify-between items-center md:items-end z-50 bg-gradient-to-t from-black to-transparent gap-10 md:gap-0">
          <div className="flex flex-col md:flex-row gap-12 md:gap-24">
            <div className="flex flex-col space-y-3 items-center md:items-start text-center md:text-left">
              <span className="text-[8px] uppercase tracking-[0.3em] opacity-40 font-bold">Connection Points</span>
              <div className="flex flex-wrap justify-center md:justify-start gap-8 text-[11px] font-light tracking-wide text-zinc-300">
                <a href="https://discord.com/users/738683175709966376" className="hover:text-cyan-400 transition-colors flex items-center pointer-events-auto">
                  <Discord size={12} className="mr-2" /> Discord
                </a>
              </div>
            </div>

            <div className="flex flex-col space-y-3 items-center md:items-start text-center md:text-left">
              <span className="text-[8px] uppercase tracking-[0.3em] opacity-40 font-bold">Random Words:</span>
              <div className="flex flex-wrap justify-center md:justify-start gap-8 text-[11px] font-light tracking-wide text-zinc-300">
                <span>Build the life you want instead of trying to escape from the life you already have.</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-end text-center md:text-right opacity-60">
            <div className="text-[9px] uppercase tracking-[0.2em] font-medium mb-1 tracking-[0.4em]">A8-FUYUKAWA-TECHNOLOGIES</div>
            <div className="text-[10px] text-white/40 font-mono tracking-tighter uppercase whitespace-nowrap">
              40.6767 N, 74.0067 W
            </div>
          </div>
        </footer>
      </div>

      {/* Scroll indicator dots on the right */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 flex flex-col space-y-4 px-4 opacity-20 z-50 pointer-events-none">
        <div className="w-1 h-1 bg-white rounded-full"></div>
        <div className="w-1 h-1 bg-white rounded-full opacity-50"></div>
        <div className="w-1 h-1 bg-white rounded-full opacity-50"></div>
        <div className="w-1 h-1 bg-white rounded-full opacity-50"></div>
      </div>
    </div>
  );
}
