<template>
  <div class="locator-wrap">
    <header class="header">
      <div class="logo">Re<span>Route</span></div>
      <p class="tagline">Campus QR & Wayfinding Locator</p>
    </header>

    <div class="card result-card">
      <span class="eyebrow">{{ resultEyebrow }}</span>
      <h2 class="building-name">{{ displayBuilding || 'Select Location' }}</h2>
      <div class="floor-name">{{ displayFloor }}</div>

      <div v-if="sourceBadge" class="badge">{{ sourceBadge }}</div>
      <div v-if="errorMessage" class="error-box">{{ errorMessage }}</div>
    </div>

    <!-- Manual Building & Floor Dropdowns -->
    <div class="card selector-card">
      <h3>Manual Locator</h3>
      <div class="form-row">
        <label>Building</label>
        <select v-model="selectedBuildingId" @change="onBuildingChange">
          <option :value="null">-- Select a Building --</option>
          <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </div>

      <div class="form-row">
        <label>Floor</label>
        <select v-model="selectedFloorId" :disabled="!floors.length" @change="onFloorChange">
          <option :value="null">-- Select a Floor --</option>
          <option v-for="f in floors" :key="f.id" :value="f.id">{{ f.label }}</option>
        </select>
      </div>
    </div>

    <!-- 3D Slab Model View -->
    <div class="card view-card" v-show="selectedBuildingId">
      <div class="view-header">
        <h3>3D Floor View</h3>
        <span class="view-hint">Drag to rotate • Auto-rotating</span>
      </div>
      <div ref="canvasContainer" class="canvas-container"></div>
    </div>

    <footer class="footer">
      <router-link to="/admin/login" class="admin-link">Staff & Admin Login</router-link>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import * as THREE from 'three';
import api from '../../services/api';

const route = useRoute();

const buildings = ref([]);
const floors = ref([]);
const selectedBuildingId = ref(null);
const selectedFloorId = ref(null);

const displayBuilding = ref('');
const displayFloor = ref('Scan a QR code or choose your location below.');
const resultEyebrow = ref('Campus Location');
const sourceBadge = ref('');
const errorMessage = ref('');

const canvasContainer = ref(null);
let scene, camera, renderer, animationFrameId;
let slabGroup;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

async function loadBuildings() {
  try {
    const res = await api.get('/buildings');
    buildings.value = res.data;
  } catch (err) {
    console.error('Error fetching buildings:', err);
  }
}

async function loadFloorsForBuilding(buildingId) {
  try {
    const res = await api.get(`/floors?building=${buildingId}`);
    floors.value = res.data;
    build3DModel();
  } catch (err) {
    console.error('Error fetching floors:', err);
  }
}

async function resolveQrCode(slug) {
  try {
    const res = await api.get(`/locations/${slug}`);
    const data = res.data;
    if (data.found) {
      displayBuilding.value = data.building;
      displayFloor.value = data.floor;
      selectedBuildingId.value = data.buildingId;
      await loadFloorsForBuilding(data.buildingId);
      selectedFloorId.value = data.floorId;
      sourceBadge.value = 'Resolved from QR Code';
      resultEyebrow.value = 'You Are Here';
      highlightFloorIn3D(data.order);
    }
  } catch (err) {
    errorMessage.value = `Unmatched QR Code (${slug}). Please pick from the dropdowns below.`;
    resultEyebrow.value = 'Unrecognized QR';
  }
}

function onBuildingChange() {
  errorMessage.value = '';
  selectedFloorId.value = null;
  sourceBadge.value = 'Manual Selection';
  const b = buildings.value.find((x) => x.id === selectedBuildingId.value);
  if (b) {
    displayBuilding.value = b.name;
    displayFloor.value = 'Now pick a floor';
    loadFloorsForBuilding(b.id);
  } else {
    displayBuilding.value = '';
    displayFloor.value = 'Scan a QR code or choose your location below.';
    floors.value = [];
    clear3D();
  }
}

function onFloorChange() {
  errorMessage.value = '';
  const f = floors.value.find((x) => x.id === selectedFloorId.value);
  if (f) {
    displayFloor.value = f.label;
    highlightFloorIn3D(f.order);
  }
}

function initThree() {
  if (!canvasContainer.value) return;
  const width = canvasContainer.value.clientWidth || 360;
  const height = 240;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1f5f9);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(12, 14, 18);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  canvasContainer.value.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(10, 20, 15);
  scene.add(dirLight);

  slabGroup = new THREE.Group();
  scene.add(slabGroup);

  // Mouse interaction
  const dom = renderer.domElement;
  dom.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mouseup', () => (isDragging = false));
  dom.addEventListener('mousemove', (e) => {
    if (!isDragging || !slabGroup) return;
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;
    slabGroup.rotation.y += deltaX * 0.01;
    slabGroup.rotation.x += deltaY * 0.01;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);
    if (!isDragging && slabGroup) {
      slabGroup.rotation.y += 0.005;
    }
    renderer.render(scene, camera);
  };
  animate();
}

function build3DModel() {
  if (!slabGroup) return;
  while (slabGroup.children.length > 0) {
    slabGroup.remove(slabGroup.children[0]);
  }

  const slabGeo = new THREE.BoxGeometry(7, 1.2, 7);
  const gap = 0.5;

  floors.value.forEach((f, idx) => {
    const isSelected = selectedFloorId.value === f.id;
    const mat = new THREE.MeshStandardMaterial({
      color: isSelected ? 0x2563eb : 0x94a3b8,
      metalness: 0.1,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(slabGeo, mat);
    mesh.position.y = idx * (1.2 + gap) - (floors.value.length * 1.7) / 2;
    mesh.userData = { floorId: f.id, order: f.order };
    slabGroup.add(mesh);
  });
}

function highlightFloorIn3D(order) {
  if (!slabGroup) return;
  slabGroup.children.forEach((mesh) => {
    const isTarget = mesh.userData.order === order;
    mesh.material.color.setHex(isTarget ? 0x2563eb : 0x94a3b8);
  });
}

function clear3D() {
  if (slabGroup) {
    while (slabGroup.children.length > 0) {
      slabGroup.remove(slabGroup.children[0]);
    }
  }
}

onMounted(async () => {
  await loadBuildings();
  initThree();

  const locParam = route.query.loc;
  if (locParam) {
    await resolveQrCode(locParam);
  }
});

onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
.locator-wrap {
  max-width: 680px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.header {
  text-align: center;
}

.logo {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.logo span {
  color: #2563eb;
}

.tagline {
  color: #64748b;
  margin-top: 0.25rem;
  font-size: 0.95rem;
}

.card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.building-name {
  font-size: 1.75rem;
  margin: 0.25rem 0;
  color: #1e293b;
}

.floor-name {
  font-size: 1.2rem;
  color: #475569;
  font-weight: 500;
}

.badge {
  display: inline-block;
  margin-top: 0.75rem;
  background: #eff6ff;
  color: #2563eb;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.error-box {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  border-radius: 8px;
  font-size: 0.85rem;
}

.selector-card h3, .view-card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.form-row label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.form-row select {
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-size: 0.95rem;
}

.canvas-container {
  width: 100%;
  height: 240px;
  border-radius: 8px;
  overflow: hidden;
  cursor: grab;
}

.canvas-container:active {
  cursor: grabbing;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-hint {
  font-size: 0.75rem;
  color: #94a3b8;
}

.footer {
  text-align: center;
  margin-top: 1rem;
}

.admin-link {
  color: #64748b;
  text-decoration: none;
  font-size: 0.85rem;
}

.admin-link:hover {
  text-decoration: underline;
  color: #2563eb;
}
</style>
