import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NEWSROOM_REFERENCE_ROLES,
  NEWSROOM_REFERENCE_ROLE_OPTIONS,
  getNewsroomReferenceRole,
  newsroomReferenceRoleInstruction,
  newsroomReferenceRoleLabel,
  normalizeNewsroomReferenceRole,
  setNewsroomReferenceRole,
} from './newsroomReferenceRoles.js';

test('legacy approved references safely resolve to a neutral general role', () => {
  assert.equal(getNewsroomReferenceRole({ isReference: true }), NEWSROOM_REFERENCE_ROLES.GENERAL);
  assert.equal(normalizeNewsroomReferenceRole('unknown-role'), NEWSROOM_REFERENCE_ROLES.GENERAL);
  assert.equal(newsroomReferenceRoleLabel(''), 'General reference');
});

test('supports every requested typed reference role', () => {
  const values = NEWSROOM_REFERENCE_ROLE_OPTIONS.map((option) => option.value);
  assert.deepEqual(values, [
    NEWSROOM_REFERENCE_ROLES.GENERAL,
    NEWSROOM_REFERENCE_ROLES.IDENTITY,
    NEWSROOM_REFERENCE_ROLES.FULL_BODY,
    NEWSROOM_REFERENCE_ROLES.UNIFORM,
    NEWSROOM_REFERENCE_ROLES.HELMET,
    NEWSROOM_REFERENCE_ROLES.EQUIPMENT,
    NEWSROOM_REFERENCE_ROLES.TEAM_STYLE,
  ]);
});

test('typed reference instructions preserve intended details without copying pose or background', () => {
  for (const role of Object.values(NEWSROOM_REFERENCE_ROLES)) {
    const instruction = newsroomReferenceRoleInstruction(role);
    assert.ok(instruction.length > 20);
    assert.match(instruction, /reference|preserve|visual/i);
    assert.match(instruction, /pose|background|scene/i);
  }
});

test('reference roles can only be assigned to photos already approved as references', () => {
  const library = [
    { id: 'approved', isReference: true, referenceLabel: 'Face' },
    { id: 'ordinary', isReference: false },
  ];

  const approved = setNewsroomReferenceRole(library, 'approved', NEWSROOM_REFERENCE_ROLES.IDENTITY);
  assert.equal(approved[0].referenceRole, NEWSROOM_REFERENCE_ROLES.IDENTITY);

  const ordinary = setNewsroomReferenceRole(approved, 'ordinary', NEWSROOM_REFERENCE_ROLES.UNIFORM);
  assert.equal(ordinary[1].referenceRole, undefined);
  assert.equal(ordinary[1].isReference, false);
});
