import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

/**
 * 3D 蝴蝶光标 — 侧面飞行姿态
 * 蝴蝶身体水平、正面朝下、翅膀上下扑腾，跟随鼠标移动
 */
export default function ButterflyCursor() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene setup ---
    const scene = new THREE.Scene();
    const fov = 45;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Camera distance so that 1 world unit ≈ 1 pixel
    const camDistance = height / (2 * Math.tan((fov * Math.PI) / 360));
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 5000);
    camera.position.set(0, 0, camDistance);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(0.5, 1, 1);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9b7fff, 0.4);
    fillLight.position.set(-0.5, -0.5, 0.8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff6bd6, 0.5);
    rimLight.position.set(0, 0.5, -1);
    scene.add(rimLight);

    // --- Butterfly group hierarchy ---
    // butterflyGroup: handles position + movement tilt
    // orientationGroup: fixed rotation to side-flying posture
    //   - Left wing close to viewer (+Z screen), right wing far from viewer (-Z screen)
    //   - Body horizontal (head pointing right, +X screen)
    //   - Front/belly facing down (-Y screen, natural flight attitude)
    const objLoader = new OBJLoader();
    const butterflyGroup = new THREE.Group();
    scene.add(butterflyGroup);

    const orientationGroup = new THREE.Group();
    // Euler XYZ: rx=+90°, ry=0, rz=-90°
    // Derived rotation matrix maps model axes to screen axes:
    //   localX (wing span)  → -Z screen  (left wing -X → +Z toward viewer; right wing +X → -Z away)
    //   localY (body)       → +X screen  (head points right)
    //   localZ (front/belly)→ -Y screen  (belly faces down)
    orientationGroup.rotation.set(Math.PI / 2, 0, -Math.PI / 2, "XYZ");
    butterflyGroup.add(orientationGroup);

    // Model bounding box center (from analysis)
    const modelCenter = new THREE.Vector3(0, 40, 6);
    const modelWidth = 93; // X: -46 to 46 (wingspan, now goes into screen)
    const targetPixelSize = 70; // target body length in pixels
    const scaleFactor = targetPixelSize / modelWidth;

    // Wing pivot groups (for flapping animation)
    const leftWingPivot = new THREE.Group();
    const rightWingPivot = new THREE.Group();
    const bodyGroup = new THREE.Group();
    orientationGroup.add(leftWingPivot);
    orientationGroup.add(rightWingPivot);
    orientationGroup.add(bodyGroup);

    // Material with vertex colors
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.55,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });

    let loadedCount = 0;
    const totalModels = 3;

    function checkAllLoaded() {
      loadedCount++;
      if (loadedCount === totalModels) {
        butterflyGroup.scale.setScalar(scaleFactor);
        butterflyGroup.position.set(0, 0, 0);
      }
    }

    // Load body
    objLoader.load(
      "/models/butterfly_body.obj",
      (obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
            child.position.sub(modelCenter);
          }
        });
        bodyGroup.add(obj);
        checkAllLoaded();
      },
      undefined,
      (err) => console.error("Failed to load body:", err)
    );

    // Load left wing
    objLoader.load(
      "/models/butterfly_left_wing.obj",
      (obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
            child.position.sub(modelCenter);
          }
        });
        leftWingPivot.add(obj);
        checkAllLoaded();
      },
      undefined,
      (err) => console.error("Failed to load left wing:", err)
    );

    // Load right wing
    objLoader.load(
      "/models/butterfly_right_wing.obj",
      (obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
            child.position.sub(modelCenter);
          }
        });
        rightWingPivot.add(obj);
        checkAllLoaded();
      },
      undefined,
      (err) => console.error("Failed to load right wing:", err)
    );

    // --- Mouse tracking ---
    const mouseWorld = new THREE.Vector3(0, 0, 0);
    const targetPos = new THREE.Vector3(0, 0, 0);
    const currentPos = new THREE.Vector3(0, 0, 0);

    function onMouseMove(event: MouseEvent) {
      const worldX = event.clientX - width / 2;
      const worldY = -(event.clientY - height / 2);
      mouseWorld.set(worldX, worldY, 0);
    }

    window.addEventListener("mousemove", onMouseMove);

    // --- Resize handler ---
    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      const newDist = height / (2 * Math.tan((fov * Math.PI) / 360));
      camera.position.z = newDist;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener("resize", onResize);

    // --- Animation loop ---
    let frameId = 0;
    const clock = new THREE.Clock();

    function animate() {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth follow with delay (lerp)
      targetPos.copy(mouseWorld);
      // Add floating effect (sine wave)
      const floatY = Math.sin(elapsed * 2.5) * 4;
      const floatX = Math.cos(elapsed * 1.8) * 2;
      targetPos.x += floatX;
      targetPos.y += floatY;

      currentPos.lerp(targetPos, 0.12);
      butterflyGroup.position.copy(currentPos);

      // Wing flapping — both wings flap up and down symmetrically
      // Side-view orientation: left wing close to viewer, right wing far.
      // Around the body axis (local Y → screen X): left tip goes up when θ<0,
      // right tip goes up when θ>0, so they flap in sync.
      const flapSpeed = 8;
      const flapAngle = 0.6; // oscillation amplitude (~34°)
      const baseAngle = 0.45; // rest tilt so wings are visible from the side
      const flapPhase = Math.sin(elapsed * flapSpeed);

      leftWingPivot.rotation.y = -(baseAngle + flapPhase * flapAngle);
      rightWingPivot.rotation.y = baseAngle + flapPhase * flapAngle;

      // Body pitch based on vertical movement
      // Head points right (+X screen); ascending (velY>0) → nose up → positive Z rotation
      const velY = targetPos.y - currentPos.y;
      butterflyGroup.rotation.z = THREE.MathUtils.clamp(velY * 0.004, -0.35, 0.35);

      renderer.render(scene, camera);
    }
    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      // Dispose geometries and materials
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-[80] hidden md:block"
      style={{ mixBlendMode: "normal" }}
    />
  );
}
