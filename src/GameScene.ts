import * as THREE from "three";

import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import Bullet from "./Bullet";

export default class GameScene extends THREE.Scene {
  private readonly mtlLoader = new MTLLoader();
  private readonly objLoader = new OBJLoader();

  private readonly camera: THREE.PerspectiveCamera;
  private bulletMtl?: MTLLoader.MaterialCreator;

  private readonly keyDown = new Set<string>();

  private player?: THREE.Group;

  private directionVector = new THREE.Vector3();

  private walls: THREE.Group[] = [];
  private targets: THREE.Group[] = [];
  private bullets: Bullet[] = [];
  private flag = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    super();

    this.camera = camera;
  }

  async initialize() {
    this.player = await this.createPlayer();
    this.add(this.player);

    this.bulletMtl = await this.mtlLoader.loadAsync("assets/foamBulletB.mtl");
    this.bulletMtl.preload();

    await this.createMaze();
    await this.loadDoor();
    this.player.add(this.camera);
    this.player.position.x = 0;
    this.player.position.z = 10;

    this.camera.position.z = 1;
    this.camera.position.y = 0.5;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.add(ambientLight);

    const light = new THREE.PointLight(0xffffff, 0.8, 18);
    light.position.set(0, 2, 0);
    light.castShadow = true;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 25;
    this.add(light);

    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
    var textloader = new THREE.TextureLoader();
    var textureFloor = textloader.load("/assets/Textures/MetalFloor.jpg");
    var textureRoof = textloader.load("/assets/Textures/MetalRoof.png");

    var meshFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22, 1, 1),
      new THREE.MeshPhongMaterial({
        color: 0x808080,
        map: textureFloor,
      })
    );
    meshFloor.rotation.x = -Math.PI / 2;
    this.add(meshFloor);

    var roofFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22, 1, 1),
      new THREE.MeshPhongMaterial({
        color: 0x808080,
        map: textureRoof,
        wireframe: false,
      })
    );
    roofFloor.rotation.x = (Math.PI * 1) / 2;
    roofFloor.position.y = 1;
    this.add(roofFloor);

    //var grid = new THREE.GridHelper(20, 10);
    //this.add(grid);
  }
  private handleKeyDown = (event: KeyboardEvent) => {
    this.keyDown.add(event.key.toLowerCase());
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keyDown.delete(event.key.toLowerCase());

    if (event.key === " ") {
      this.createBullet();
    }
  };

  async generateTargets() {
    const targetMtl = await this.mtlLoader.loadAsync("assets/targetA.mtl");
    targetMtl.preload();
    let possibleCords = [
      [0, 0],
      [9, 4],
      [-2, -2],
      [-2, -8],
      [-9, -7],
      [-1, 4],
      [7, 9],
      [3, 3],
      [9, -4],
      [-1, -1],
    ];
    let randomcords1 =
      possibleCords[Math.floor(Math.random() * possibleCords.length)];
    let randomcords2 =
      possibleCords[Math.floor(Math.random() * possibleCords.length)];
    if (randomcords2 == randomcords1) {
      randomcords2 =
        possibleCords[Math.floor(Math.random() * possibleCords.length)];
    }
    const t1 = await this.createTarget(targetMtl);
    const t2 = await this.createTarget(targetMtl);
    t1.position.x = randomcords1[0];
    t1.position.z = randomcords1[1];
    t1.position.y = 0.2;
    t2.position.x = randomcords2[0];
    t2.position.z = randomcords2[1];
    t2.position.y = 0.2;
    this.add(t1, t2);
    this.targets.push(t1, t2);
  }

  private getDistance(a: THREE.Vector3, b: THREE.Vector3) {
    let dx = a.x - b.x;
    let dz = a.z - b.z;
    const x = Math.sqrt(Math.pow(dx, 2) + Math.pow(dz, 2));
    if (this.player != undefined) {
      if (x < 0.75) {
        a;
        if (Math.pow(dx, 2) > Math.pow(dz, 2)) {
          if (a.x >= b.x) {
            this.player.position.x += 0.2;
          } else {
            this.player.position.x -= 0.2;
          }
        } else {
          if (a.z >= b.z) {
            this.player.position.z += 0.2;
          } else {
            this.player.position.z -= 0.2;
          }
        }
      }
    }
  }

  private checkWalls() {
    for (let i = 0; i < this.walls.length; i++) {
      if (this.player != undefined) {
        this.getDistance(this.player.position, this.walls[i].position);
      }
    }
  }

  private updateInput() {
    if (!this.player) {
      return;
    }

    const shiftKey = this.keyDown.has("shift");

    if (!shiftKey) {
      if (this.keyDown.has("a") || this.keyDown.has("arrowleft")) {
        this.player.rotateY(0.02);
      } else if (this.keyDown.has("d") || this.keyDown.has("arrowright")) {
        this.player.rotateY(-0.02);
      }
    }

    const dir = this.directionVector;

    this.camera.getWorldDirection(dir);

    const speed = 0.05;

    if (this.keyDown.has("w") || this.keyDown.has("arrowup")) {
      this.player.position.add(dir.clone().multiplyScalar(speed));
    } else if (this.keyDown.has("s") || this.keyDown.has("arrowdown")) {
      this.player.position.add(dir.clone().multiplyScalar(-speed));
    }

    if (shiftKey) {
      const strafeDir = dir.clone();
      const upVector = new THREE.Vector3(0, 1, 0);

      if (this.keyDown.has("a") || this.keyDown.has("arrowleft")) {
        this.player.position.add(
          strafeDir
            .applyAxisAngle(upVector, Math.PI * 0.5)
            .multiplyScalar(speed)
        );
      } else if (this.keyDown.has("d") || this.keyDown.has("arrowright")) {
        this.player.position.add(
          strafeDir
            .applyAxisAngle(upVector, Math.PI * -0.5)
            .multiplyScalar(speed)
        );
      }
    }
  }

  private async createWall(mtl: MTLLoader.MaterialCreator) {
    this.objLoader.setMaterials(mtl);
    const modelRoot = await this.objLoader.loadAsync(
      "assets/wallFortified.obj"
    );
    modelRoot.rotateY(Math.PI * 0.5);
    return modelRoot;
  }

  private async createDoor(mtl: MTLLoader.MaterialCreator) {
    this.objLoader.setMaterials(mtl);
    const modelRoot = await this.objLoader.loadAsync("assets/door_typeA.obj");
    return modelRoot;
  }
  private async createDoorWall(mtl: MTLLoader.MaterialCreator) {
    this.objLoader.setMaterials(mtl);
    const modelRoot = await this.objLoader.loadAsync("assets/wallB_door.obj");
    return modelRoot;
  }

  private async createPlayer() {
    const mtl = await this.mtlLoader.loadAsync("assets/blasterG.mtl");
    mtl.preload();

    this.objLoader.setMaterials(mtl);

    const modelRoot = await this.objLoader.loadAsync("assets/blasterG.obj");

    return modelRoot;
  }

  private async createTarget(mtl: MTLLoader.MaterialCreator) {
    this.objLoader.setMaterials(mtl);

    const modelRoot = await this.objLoader.loadAsync("assets/targetA.obj");

    modelRoot.rotateY(Math.PI * 0.5);

    return modelRoot;
  }
  private async createBullet() {
    if (!this.player) {
      return;
    }

    if (this.bulletMtl) {
      this.objLoader.setMaterials(this.bulletMtl);
    }

    const bulletModel = await this.objLoader.loadAsync(
      "assets/foamBulletB.obj"
    );

    this.camera.getWorldDirection(this.directionVector);

    const aabb = new THREE.Box3().setFromObject(this.player);
    const size = aabb.getSize(new THREE.Vector3());

    const vec = this.player.position.clone();
    vec.y += 0.06;

    bulletModel.position.add(
      vec.add(this.directionVector.clone().multiplyScalar(size.z * 0.5))
    );
    bulletModel.children.forEach((child) => child.rotateX(Math.PI * -0.5));
    bulletModel.rotation.copy(this.player.rotation);

    this.add(bulletModel);

    const b = new Bullet(bulletModel);
    b.setVelocity(
      this.directionVector.x * 0.2,
      this.directionVector.y * 0.2,
      this.directionVector.z * 0.2
    );

    this.bullets.push(b);
  }

  private updateBullets() {
    for (let i = 0; i < this.bullets.length; ++i) {
      const b = this.bullets[i];
      b.update();
      if (b.shouldRemove) {
        this.remove(b.group);
        this.bullets.splice(i, 1);
        i--;
      } else {
        for (let j = 0; j < this.targets.length; ++j) {
          const target = this.targets[j];
          if (target.position.distanceToSquared(b.group.position) < 0.05) {
            this.remove(b.group);
            this.bullets.splice(i, 1);
            i--;
            target.visible = false;
            this.flag++;
          }
        }
      }
    }
  }

  private async createMaze() {
    const targetMtl = await this.mtlLoader.loadAsync(
      "assets/wallFortified.mtl"
    );
    targetMtl.preload();

    var cordsv1 = [
      [0, 11],
      [0, 6],
      [-1, 10],
      [1, 10],
      [-1, 9],
      [1, 9],
      [-2, 10],
      [-3, 10],
      [-4, 10],
      [-5, 9],
      [-5, 8],
      [-5, 7],
      [-3, 8],
      [-3, 7],
      [-2, 7],
      [-1, 7],
      [-4, 5],
      [-3, 5],
      [-1, 6],
      [-1, 5],
      [-6, 10],
      [-7, 10],
      [-8, 10],
      [-9, 9],
      [-10, 8],
      [-10, 7],
      [-10, 6],
      [-9, 5],
      [-7, 8],
      [-7, 7],
      [-8, 7],
      [-7, 6],
      [-7, 5],
      [-7, 4],
      [-7, 3],
      [-8, 3],
      [-10, 4],
      [-10, 3],
      [-10, 2],
      [-6, 5],
      [-1, 3],
      [-2, 3],
      [-3, 3],
      [-5, 3],
      [-5, 2],
      [-2, 2],
      [1, 10],
      [1, 9],
      [1, 6],
      [1, 5],
      [1, 8],
      [2, 8],
      [3, 10],
      [2, 9],
      [4, 10],
      [5, 10],
      [6, 10],
      [7, 10],
      [8, 9],
      [8, 8],
      [6, 8],
      [4, 8],
      [4, 7],
      [4, 6],
      [3, 6],
      [5, 6],
      [6, 6],
      [6, 7],
      [9, 8],
      [10, 7],
      [10, 6],
      [10, 5],
      [10, 4],
      [10, 3],
      [10, 2],
      [8, 6],
      [8, 5],
      [8, 5],
      [8, 3],
      [7, 4],
      [6, 4],
      [4, 4],
      [3, 4],
      [1, 3],
      [2, 3],
      [2, 1],
      [4, 3],
      [2, 6],
      [1, 1],
      [1, 2],
      [9, 1],
      [7, 1],
      [6, 1],
      [5, 1],
      [4, 1],
      [1, -1],
      [2, -1],
      [4, -1],
      [4, -2],
      [4, -1],
      [5, -1],
      [6, -1],
      [7, -1],
      [9, -1],
      [9, -2],
      [9, -3],
      [10, -4],
      [9, -5],
      [9, -6],
      [8, -6],
      [7, -6],
      [6, -6],
      [6, -3],
      [7, -3],
      [5, -4],
      [4, -4],
      [6, -4],
      [7, -4],
      [1, -3],
      [2, -3],
      [2, -6],
      [2, -5],
      [4, -6],
      [4, -7],
      [5, -7],
      [6, -7],
      [7, -7],
      [10, -7],
      [9, -9],
      [10, -9],
      [9, -8],
      [7, -9],
      [7, -10],
      [6, -9],
      [4, -9],
      [2, -8],
      [2, -9],
      [1, -8],
      [10, 0],
      [-2, -1],
      [-3, -1],
      [-1, -3],
      [-1, -4],
      [-1, -5],
      [-1, -7],
      [-1, -8],
      [-1, -10],
      [-4, -2],
      [-4, -3],
      [-4, -5],
      [-4, -6],
      [-4, -7],
      [-3, -5],
      [-3, -9],
      [-2, -3],
      [-2, -4],
      [-2, -5],
      [-2, -7],
      [-2, -10],
      [-5, -1],
      [-5, -5],
      [-5, -6],
      [-5, -7],
      [-5, -8],
      [-6, -1],
      [-6, -3],
      [-6, -10],
      [-7, -1],
      [-7, -3],
      [-7, -4],
      [-7, -5],
      [-7, -6],
      [-7, -8],
      [-7, -10],
      [-8, -10],
      [-9, -1],
      [-9, -2],
      [-9, -3],
      [-9, -5],
      [-9, -6],
      [-9, -8],
      [-9, -9],
      [-10, -7],
      [-11, -4],
      [3, -10],
      [5, -10],
      [-10, -7],
      [-10, -3],
      [-10, -5],
      [-1, 10],
      [0, 6],
      [0, -10],
      [-11, -4],
      [-10, 1],
      [-10, 0],
      [-5, -10],
      [-4, -10],
      [1, -10],
      [8, -10],
    ];
    cordsv1.forEach(async (element) => {
      let t1 = await this.createWall(targetMtl);
      t1.castShadow = true;
      t1.position.x = element[0];
      t1.position.z = element[1];
      this.walls.push(t1);
      this.add(t1);
    });
  }

  private async loadDoor() {
    const doorMtl = await this.mtlLoader.loadAsync("assets/door_typeA.mtl");
    const doorWallMtl = await this.mtlLoader.loadAsync("assets/wallB_door.mtl");
    let doorWall = await this.createDoorWall(doorWallMtl);
    let door = await this.createDoor(doorMtl);
    door.position.x = 8;
    door.position.z = -9.5;
    door.rotation.y = Math.PI;
    doorWall.position.x = 8;
    doorWall.position.z = -10;
    doorWall.rotation.y = Math.PI;
    this.add(doorWall);
    this.add(door);
    doorMtl.preload();
  }

  private rotateTarget() {
    this.targets[0].rotation.y += 0.01;
    this.targets[1].rotation.y += 0.01;
  }

  private CheckCondition(a: THREE.Vector3, b: THREE.Vector3, flag: number) {
    let dx = a.x - b.x;
    let dz = a.z - b.z;
    const x = Math.sqrt(Math.pow(dx, 2) + Math.pow(dz, 2));
    if (x < 1 && flag >= 3) {
      alert("Gratuluje!");
      window.location.reload();
    }
  }

  update() {
    if (this.player === undefined || this.walls === undefined) {
      this.updateInput();
    } else {
      if (this.flag == 0 && this.walls.length > 0) {
        this.generateTargets();
        this.flag++;
      }
      if (this.targets.length != 0) {
        this.rotateTarget();
      }
      this.CheckCondition(
        this.player.position,
        new THREE.Vector3(8, 0, -9.5),
        this.flag
      );
      this.updateInput();
      this.checkWalls();
      this.updateBullets();
    }
  }
}
