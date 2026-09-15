import test from 'node:test';
import assert from 'node:assert/strict';
import { EDITORIAL_PACKET_ACTIVE } from './editorialPacketNoop.js';

test('editorial packet feature branch is active', () => assert.equal(EDITORIAL_PACKET_ACTIVE, true));
