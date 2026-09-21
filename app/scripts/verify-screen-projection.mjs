import {deskPose,deskAngles} from '../src/prototype/deskCamera.js';
// Pure geometry verification; this does not substitute for browser visual review.
import assert from "node:assert/strict";
import * as THREE from "three";
import { projectScreen } from "../src/prototype/screenProjection.js";
import { LAPTOP, PHONE } from "../src/prototype/deviceGeometry.js";
let checked = 0;
for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 800, height: 900 },
  { width: 800, height: 500 },
]) {
  const deskViews = [deskAngles(0), deskAngles(5), deskAngles(10), deskAngles(30), {yaw: -.48, pitch: -.16}, {yaw: .48, pitch: .22}].map(angles => { const p=deskPose(viewport, angles); return {eye:p.position.toArray(),target:p.look.toArray()}; });
  for (const pose of [
    ...deskViews,
    { eye: [5.7, 4.6, 12.8], target: [-0.25, -0.55, 0.3] },
    { eye: [0.1, 1.65, 3], target: [-0.5, 1.2, -0.8] },
    { eye: [1.15, 1.3, 3], target: [1.15, 1.3, 0.48] },
  ]) {
    const camera = new THREE.PerspectiveCamera(
      39,
      viewport.width / viewport.height,
      0.1,
      100,
    );
    camera.position.set(...pose.eye);
    camera.lookAt(...pose.target);
    camera.updateMatrixWorld();
    for (const device of [
      {
        size: [LAPTOP.width, LAPTOP.height],
        position: LAPTOP.position.map((v, i) => v + LAPTOP.screenPosition[i]),
        rotation: LAPTOP.screenRotation,
        pixels: { width: 860.8, height: 538 },
      },
      {
        size: [PHONE.width, PHONE.height],
        position: [1.15, 1.5, 0.534],
        rotation: [0, 0, 0],
        pixels: { width: 253.59, height: 535 },
      },
    ]) {
      const plane = new THREE.Object3D();
      plane.position.set(...device.position);
      plane.rotation.set(...device.rotation);
      plane.updateMatrixWorld();
      const element = { style: {} };
      projectScreen(
        element,
        plane,
        camera,
        viewport,
        device.size,
        device.pixels,
      );
      const values = element.style.transform
        .slice(9, -1)
        .split(",")
        .map(Number);
      const css = new THREE.Matrix4().fromArray(values);
      for (const [u, v] of [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]) {
        const actual = new THREE.Vector4(
          u * device.pixels.width,
          v * device.pixels.height,
          0,
          1,
        ).applyMatrix4(css);
        const expected = new THREE.Vector3(
          (u - 0.5) * device.size[0],
          (0.5 - v) * device.size[1],
          0,
        )
          .applyMatrix4(plane.matrixWorld)
          .project(camera);
        assert(
          Math.abs(
            actual.x / actual.w - ((expected.x + 1) * viewport.width) / 2,
          ) < 1e-7,
        );
        assert(
          Math.abs(
            actual.y / actual.w - ((1 - expected.y) * viewport.height) / 2,
          ) < 1e-7,
        );
        checked++;
      }
    }
  }
}
console.log(
  `PASS ${checked} screen-corner projections across camera poses and viewport sizes (non-browser math check)`,
);
