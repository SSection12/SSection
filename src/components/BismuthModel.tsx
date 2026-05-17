import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three-stdlib';

const BISMUTH_SHADER = {
  uniforms: {
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color("#00ff66") }, // Brighter Green
    uColor2: { value: new THREE.Color("#0066ff") }, // Brighter Blue
    uColor3: { value: new THREE.Color("#ff2222") }, // Brighter Red
    uColor4: { value: new THREE.Color("#ffcc00") }, // Brighter Yellow
    uNormalMap: { value: null },
    uDisplacementMap: { value: null },
    uRoughnessMap: { value: null },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDir;
    varying vec2 vUv;
    
    uniform sampler2D uDisplacementMap;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      // Basic displacement
      float disp = texture2D(uDisplacementMap, uv).r;
      vec3 newPosition = position + normal * disp * 0.2;
      
      vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
      vWorldPosition = worldPosition.xyz;
      vViewDir = normalize(cameraPosition - vWorldPosition);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDir;
    varying vec2 vUv;
    
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;
    
    uniform sampler2D uNormalMap;
    uniform sampler2D uRoughnessMap;

    vec3 desaturate(vec3 color, float amount) {
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      return mix(color, vec3(gray), amount);
    }

    vec3 palette(float t) {
      vec3 a = vec3(0.15, 0.15, 0.15); 
      vec3 b = vec3(1.1, 1.1, 1.1);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = vec3(0.0, 0.33, 0.67); 
      
      vec3 targetColor;
      float stage = mod(t * 1.8, 4.0);
      if (stage < 1.0) targetColor = mix(uColor1, uColor2, stage);
      else if (stage < 2.0) targetColor = mix(uColor2, uColor3, stage - 1.0);
      else if (stage < 3.0) targetColor = mix(uColor3, uColor4, stage - 2.0);
      else targetColor = mix(uColor4, uColor1, stage - 3.0);
      
      targetColor = pow(targetColor, vec3(0.8)); // Increase contrast slightly by lowering gamma

      vec3 col = a + targetColor * (b + b * cos(6.28318 * (c * t + d)));
      return desaturate(col, 0.15); // Much less desaturation
    }

    void main() {
      // Use normal map for extra detail
      vec3 textNormal = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
      vec3 normal = normalize(vNormal + textNormal * 0.5);
      
      vec3 viewDir = normalize(vViewDir);
      float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 2.5);
      
      // Complex iridescent pattern
      float noise = sin(vWorldPosition.x * 1.5 + uTime) * cos(vWorldPosition.y * 1.5 - uTime);
      float t = dot(normal, vec3(1.0)) * 0.3 + fresnel * 1.2 + noise * 0.15;
      
      vec3 color = palette(t);
      
      // Metallic shine with roughness map influence
      float roughness = texture2D(uRoughnessMap, vUv).r;
      vec3 lightDir = normalize(vec3(5.0, 5.0, 5.0));
      vec3 halfDir = normalize(viewDir + lightDir);
      float specPower = 128.0 * (1.0 - roughness * 0.8);
      float spec = pow(max(0.0, dot(normal, halfDir)), specPower);
      
      color += spec * 1.0;
      
      // Edge highlights
      float rim = pow(1.0 - max(0.0, dot(normal, viewDir)), 4.0);
      color += rim * vec3(1.0) * 0.4;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

function ProceduralBismuth({ shaderMaterial }: { shaderMaterial: THREE.ShaderMaterial }) {
  // Re-use geometries for massive performance gain vs creating them inside loops
  const mainBoxGeo = useMemo(() => new THREE.BoxGeometry(4, 4, 4, 20, 20, 20), []);
  const flatBoxGeo = useMemo(() => new THREE.BoxGeometry(4.01, 4.01, 1.01, 20, 20, 4), []);
  const smallBoxGeo = useMemo(() => new THREE.BoxGeometry(3, 3, 3, 12, 12, 12), []);

  return (
    <group scale={0.2}>
      <group position={[-0.4, -0.4, -0.4]}>
        {Array.from({ length: 14 }).map((_, i) => (
          <group key={i} scale={1 - i * 0.065} position={[i * 0.081, i * 0.081, i * 0.081]}>
            <mesh material={shaderMaterial} geometry={mainBoxGeo} />
            {Array.from({ length: 4 }).map((_, j) => (
              <mesh key={j} position={[0, 0, (j - 1.5) * 0.51]} scale={[1, 1, 0.1]} material={shaderMaterial} geometry={flatBoxGeo} />
            ))}
          </group>
        ))}
      </group>
      
      <group rotation={[Math.PI / 2, 0.4, 0.2]} position={[2.5, 0.5, 1.5]}>
         {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={i} scale={0.6 - i * 0.06} position={[i * 0.12, i * 0.12, i * 0.12]} material={shaderMaterial} geometry={smallBoxGeo} />
          ))}
      </group>
      <group rotation={[-0.2, Math.PI / 2, 0.5]} position={[-2.5, 1.5, -1]}>
         {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={i} scale={0.5 - i * 0.05} position={[i * 0.1, i * 0.1, i * 0.1]} material={shaderMaterial} geometry={smallBoxGeo} />
          ))}
      </group>
    </group>
  )
}

function LoadedModel({ url, shaderMaterial }: { url: string, shaderMaterial: THREE.ShaderMaterial }) {
  const object = useLoader(OBJLoader, url);
  const groupRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (object && groupRef.current) {
      while(groupRef.current.children.length > 0) {
        groupRef.current.remove(groupRef.current.children[0]);
      }

      const clone = object.clone();
      const box = new THREE.Box3().setFromObject(clone);
      const center = box.getCenter(new THREE.Vector3());
      clone.position.sub(center);

      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = shaderMaterial;
        }
      });
      
      groupRef.current.add(clone);
    }
  }, [object, shaderMaterial]);

  return <group ref={groupRef} scale={0.225} />;
}

export default function BismuthModel() {
  const [modelExists, setModelExists] = useState<boolean | null>(null);

  // Load textures
  const [dispMap, normMap, roughMap] = useLoader(THREE.TextureLoader, [
    'textures/ChristmasTreeOrnament021_1K-JPG_Displacement.jpg',
    'textures/ChristmasTreeOrnament021_1K-JPG_NormalGL.jpg',
    'textures/ChristmasTreeOrnament021_1K-JPG_Roughness.jpg'
  ]);

  useEffect(() => {
    if (normMap) normMap.wrapS = normMap.wrapT = THREE.RepeatWrapping;
    if (dispMap) dispMap.wrapS = dispMap.wrapT = THREE.RepeatWrapping;
    if (roughMap) roughMap.wrapS = roughMap.wrapT = THREE.RepeatWrapping;
  }, [normMap, dispMap, roughMap]);

  useEffect(() => {
    fetch('models/bismuth.obj')
      .then(async res => {
        if (!res.ok) {
          setModelExists(false);
          return;
        }
        const text = await res.text();
        setModelExists(text.trim().length > 10);
      })
      .catch(() => setModelExists(false));
  }, []);

  const shaderMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      ...BISMUTH_SHADER,
      side: THREE.DoubleSide,
    });
    mat.uniforms.uNormalMap.value = normMap;
    mat.uniforms.uDisplacementMap.value = dispMap;
    mat.uniforms.uRoughnessMap.value = roughMap;
    return mat;
  }, [normMap, dispMap, roughMap]);

  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <group>
      {modelExists ? (
        <LoadedModel url="models/bismuth.obj" shaderMaterial={shaderMaterial} />
      ) : (
        <ProceduralBismuth shaderMaterial={shaderMaterial} />
      )}
    </group>
  );
}
