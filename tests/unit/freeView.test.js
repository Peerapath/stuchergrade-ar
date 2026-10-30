// FreeView holds the user's yaw/pitch/zoom for the floating and tracked box views.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FreeView, PITCH_DEFAULT, PITCH_MIN, PITCH_MAX, ZOOM_MIN, ZOOM_MAX, YAW_PER_PX, PITCH_PER_PX,
} from '../../src/freeView.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('constants match the spec', () => {
  near(PITCH_DEFAULT, Math.PI / 4);
  near(PITCH_MIN, Math.PI / 18);
  near(PITCH_MAX, Math.PI / 2);
  assert.equal(ZOOM_MIN, 0.5);
  assert.equal(ZOOM_MAX, 3);
  assert.equal(YAW_PER_PX, 0.01);
  assert.equal(PITCH_PER_PX, 0.005);
});

test('defaults: yaw 0, pitch 45 degrees, zoom 1', () => {
  const v = new FreeView();
  assert.equal(v.yaw, 0);
  assert.equal(v.pitch, PITCH_DEFAULT);
  assert.equal(v.zoom, 1);
});

test('rotate maps horizontal drag to yaw and vertical drag to pitch', () => {
  const v = new FreeView();
  v.rotate(100, 0, { allowPitch: true });
  near(v.yaw, 1.0);
  assert.equal(v.pitch, PITCH_DEFAULT);
  v.rotate(0, 20, { allowPitch: true });
  near(v.yaw, 1.0);
  near(v.pitch, PITCH_DEFAULT + 0.1);
});

test('yaw is unbounded', () => {
  const v = new FreeView();
  v.rotate(100000, 0, { allowPitch: true });
  near(v.yaw, 1000);
  v.rotate(-300000, 0, { allowPitch: true });
  near(v.yaw, -2000);
});

test('pitch clamps at 90 degrees and 10 degrees', () => {
  const v = new FreeView();
  v.rotate(0, 100000, { allowPitch: true });
  assert.equal(v.pitch, PITCH_MAX);
  v.rotate(0, -100000, { allowPitch: true });
  assert.equal(v.pitch, PITCH_MIN);
});

test('allowPitch false leaves pitch unchanged but still turns yaw', () => {
  const v = new FreeView();
  v.rotate(50, 400, { allowPitch: false });
  assert.equal(v.pitch, PITCH_DEFAULT);
  near(v.yaw, 0.5);
});

test('zoomBy multiplies and clamps to the zoom range', () => {
  const v = new FreeView();
  v.zoomBy(2);
  near(v.zoom, 2);
  v.zoomBy(1.25);
  near(v.zoom, 2.5);
  v.zoomBy(10);
  assert.equal(v.zoom, ZOOM_MAX);
  v.zoomBy(0.001);
  assert.equal(v.zoom, ZOOM_MIN);
});
