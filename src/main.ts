import * as THREE from "three";
import GameScene from "./GameScene";

const width = window.innerWidth;
const height = window.innerHeight;

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("app") as HTMLCanvasElement,
});
renderer.setClearColor(0xffffff, 0);
renderer.setSize(width, height);
renderer.shadowMap.type = THREE.BasicShadowMap;

const mainCamera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);

const scene = new GameScene(mainCamera);
scene.initialize();

function tick() {
  scene.update();
  renderer.render(scene, mainCamera);
  requestAnimationFrame(tick);
}

tick();

var onWindowResize = function () {
  mainCamera.aspect = window.innerWidth / window.innerHeight;
  mainCamera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
};

window.addEventListener("resize", onWindowResize, false);
