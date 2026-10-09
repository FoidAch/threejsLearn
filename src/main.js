import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);
scene.fog = new THREE.FogExp2(0x0a0a12, 0.1);

// Camera
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.5, 3);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
container.appendChild(renderer.domElement);

// Environment (biar metal kinclong)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;
controls.minDistance = 1;
controls.maxDistance = 8;
controls.target.set(0, 0.5, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x4488ff, 1.5);
rimLight.position.set(-5, 2, -5);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xff2244, 2.0, 10);
fillLight.position.set(2, 0, 2);
scene.add(fillLight);

// Particles (bara api)
const particleCount = 200;
const particleGeo = new THREE.BufferGeometry();
const posArray = new Float32Array(particleCount * 3);
const speedArray = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  posArray[i * 3] = (Math.random() - 0.5) * 5;
  posArray[i * 3 + 1] = (Math.random() - 0.5) * 5;
  posArray[i * 3 + 2] = (Math.random() - 0.5) * 5;
  speedArray[i] = Math.random() * 0.015 + 0.005;
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particleMat = new THREE.PointsMaterial({
  size: 0.025,
  color: 0xff4444,
  transparent: true,
  opacity: 0.7,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// Load Model
const loader = new GLTFLoader();
let model = null;
let isWireframe = false;

loader.load(
  '/models/free_-_crimson_fiend_greatsword_gameready.glb',
  (gltf) => {
    model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const scale = 2.5 / Math.max(size.x, size.y, size.z);

    model.position.sub(center);
    model.scale.multiplyScalar(scale);
    model.position.y += (size.y * scale) / 2;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(model);
    console.log('✅ Model loaded!');
  },
  (progress) => {
    console.log(`Loading: ${(progress.loaded / progress.total * 100).toFixed(0)}%`);
  },
  (error) => {
    console.error('❌ Error loading model:', error);
  }
);

// Animation
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // Floating
  if (model) {
    model.position.y += Math.sin(elapsed * 1.5) * 0.001;
  }

  // Particles
  const positions = particles.geometry.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3 + 1] += speedArray[i];
    if (positions[i * 3 + 1] > 2.5) {
      positions[i * 3 + 1] = -2.5;
    }
  }
  particles.geometry.attributes.position.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Buttons
document.getElementById('btn-rotate').addEventListener('click', function () {
  controls.autoRotate = !controls.autoRotate;
  this.classList.toggle('active');
});

document.getElementById('btn-wireframe').addEventListener('click', function () {
  isWireframe = !isWireframe;
  if (model) {
    model.traverse((child) => {
      if (child.isMesh) child.material.wireframe = isWireframe;
    });
  }
  this.classList.toggle('active');
});