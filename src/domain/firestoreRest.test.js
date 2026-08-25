import test from 'node:test';
import assert from 'node:assert/strict';

import { decodeFirestoreDocument, decodeFirestoreValue } from './firestoreRest.js';

test('decodes Firestore REST maps, arrays, booleans, strings, and numeric values', () => {
  const document = {
    fields: {
      careerPhase: { stringValue: 'Player' },
      player: {
        mapValue: {
          fields: {
            number: { stringValue: '6' },
            visualProfile: {
              mapValue: {
                fields: {
                  throwingHand: { stringValue: 'left' },
                  referenceAssetIds: {
                    arrayValue: { values: [{ stringValue: 'identity-1' }, { stringValue: 'uniform-1' }] },
                  },
                },
              },
            },
          },
        },
      },
      factLedger: {
        arrayValue: {
          values: [{
            mapValue: {
              fields: {
                key: { stringValue: 'game.passYds' },
                value: { integerValue: '268' },
                verified: { booleanValue: true },
              },
            },
          }],
        },
      },
    },
  };

  const decoded = decodeFirestoreDocument(document);
  assert.equal(decoded.careerPhase, 'Player');
  assert.equal(decoded.player.number, '6');
  assert.equal(decoded.player.visualProfile.throwingHand, 'left');
  assert.deepEqual(decoded.player.visualProfile.referenceAssetIds, ['identity-1', 'uniform-1']);
  assert.equal(decoded.factLedger[0].value, 268);
  assert.equal(decoded.factLedger[0].verified, true);
});

test('unknown Firestore REST value shapes remain undefined instead of being invented', () => {
  assert.equal(decodeFirestoreValue({}), undefined);
});
