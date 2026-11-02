import { RoundedBoxGeometry } from './thirdparty/three/addons/geometries/RoundedBoxGeometry.js';
import * as THREE from './thirdparty/three/three.module.js';

const FACE_ROTATIONS = {
  1: [0, 0, Math.PI / 2],
  2: [0, 0, 0],
  3: [-Math.PI / 2, 0, 0],
  4: [Math.PI / 2, 0, 0],
  5: [Math.PI, 0, 0],
  6: [0, 0, -Math.PI / 2],
};
const PIP_LAYOUTS = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
};

export function createDiceScene(canvas, initialValues = [1, 2, 3, 4, 5]) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  camera.position.set(0, 7.2, 12.5);
  camera.lookAt(0, 0.25, 0);

  scene.add(new THREE.HemisphereLight(0xfffbef, 0x777e70, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-4, 9, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -9;
  keyLight.shadow.camera.right = 9;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -8;
  scene.add(keyLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 20),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.8;
  ground.receiveShadow = true;
  scene.add(ground);

  const geometry = new RoundedBoxGeometry(1.48, 1.48, 1.48, 5, 0.16);
  const textures = Array.from({ length: 6 }, (_, index) => createPipTexture(index + 1));
  const materials = [1, 6, 2, 5, 3, 4].map(
    (value) =>
      new THREE.MeshStandardMaterial({
        map: textures[value - 1],
        roughness: 0.3,
        metalness: 0.015,
      }),
  );
  const dice = Array.from({ length: 5 }, (_, index) => {
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = 0.16;
    mesh.rotation.set(...FACE_ROTATIONS[initialValues[index]]);
    mesh.userData.index = index;
    scene.add(mesh);
    return mesh;
  });

  let animation = null;
  let frame = 0;
  let disposed = false;
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement);
  resize();

  function resize() {
    const { width, height } = canvas.parentElement.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const scale = Math.min(1, Math.max(0.7, camera.aspect / 1.35));
    const spacing = 1.8 * scale;
    dice.forEach((mesh, index) => {
      mesh.position.x = (index - 2) * spacing;
      mesh.scale.setScalar(scale);
    });
    canvas.dispatchEvent(new Event('dice-layout-change'));
  }

  function render(time) {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    if (animation) {
      const progress = Math.min(1, (time - animation.startedAt) / animation.duration);
      const eased = 1 - (1 - progress) ** 3;
      for (let index = 0; index < dice.length; index += 1) {
        if (animation.held[index]) continue;
        const mesh = dice[index];
        const start = animation.starts[index];
        const end = animation.ends[index];
        mesh.rotation.set(
          start.rotation.x + (end.rotation.x - start.rotation.x) * eased,
          start.rotation.y + (end.rotation.y - start.rotation.y) * eased,
          start.rotation.z + (end.rotation.z - start.rotation.z) * eased,
        );
        mesh.position.y = start.y + Math.sin(progress * Math.PI) * 0.72;
      }
      if (progress === 1) animation = null;
    }
    renderer.render(scene, camera);
  }

  frame = requestAnimationFrame(render);

  return {
    getDieLayout() {
      camera.updateMatrixWorld();
      const centers = dice.map((mesh) => {
        const projected = new THREE.Vector3(mesh.position.x, 0.16, 0).project(camera);
        return (projected.x + 1) / 2;
      });
      const width = centers[1] - centers[0];
      return centers.map((center) => ({ left: center - width / 2, width }));
    },
    roll(values, held = []) {
      dice.forEach((mesh, index) => {
        if (held[index] && animation) {
          mesh.rotation.copy(animation.ends[index].rotation);
          mesh.position.y = animation.ends[index].y;
        }
      });
      animation = {
        held: [...held],
        startedAt: performance.now(),
        duration: 720 + Math.random() * 420,
        starts: dice.map((mesh) => ({ rotation: mesh.rotation.clone(), y: mesh.position.y })),
        ends: dice.map((mesh, index) => ({
          rotation: held[index]
            ? mesh.rotation.clone()
            : rollingRotation(mesh.rotation, FACE_ROTATIONS[values[index]]),
          y: 0.16,
        })),
      };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      geometry.dispose();
      textures.forEach((texture) => {
        texture.dispose();
      });
      materials.forEach((material) => {
        material.dispose();
      });
      ground.geometry.dispose();
      ground.material.dispose();
      renderer.dispose();
    },
  };
}

function rollingRotation(current, target) {
  const turn = Math.PI * 2;
  const spin = () => 2 + Math.floor(Math.random() * 3);
  return new THREE.Euler(
    target[0] + (Math.floor((current.x - target[0]) / turn) + spin()) * turn,
    target[1] + (Math.floor((current.y - target[1]) / turn) + spin()) * turn,
    target[2] + (Math.floor((current.z - target[2]) / turn) + spin()) * turn,
    'XYZ',
  );
}

function createPipTexture(value) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#e9e7de';
  context.fillRect(0, 0, 256, 256);
  context.fillStyle = '#000000';
  for (const [column, row] of PIP_LAYOUTS[value]) {
    context.beginPath();
    context.arc(55 + column * 73, 55 + row * 73, 18, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
