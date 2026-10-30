import test from 'node:test';
import assert from 'node:assert/strict';
import { isCameraDenied } from '../../src/cameraError.js';

test('permission and security errors count as camera denied', () => {
  for (const name of ['NotAllowedError', 'PermissionDeniedError', 'SecurityError']) {
    assert.equal(isCameraDenied({ name }), true, name);
  }
});

test('other errors do not count as camera denied', () => {
  for (const name of ['NotFoundError', 'NotReadableError', 'OverconstrainedError', 'Error']) {
    assert.equal(isCameraDenied({ name }), false, name);
  }
});

test('missing or empty errors are not camera denied', () => {
  assert.equal(isCameraDenied(undefined), false);
  assert.equal(isCameraDenied(null), false);
  assert.equal(isCameraDenied({}), false);
});
