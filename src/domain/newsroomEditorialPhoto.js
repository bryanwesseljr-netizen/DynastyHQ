import { NEWSROOM_IMAGE_SCENE_OVERRIDES } from './newsroomImageDirector.js';

export const NEWSROOM_EDITORIAL_SCENE_OPTIONS = Object.freeze([
  { value: NEWSROOM_IMAGE_SCENE_OVERRIDES.AUTO, label: 'Auto' },
  { value: NEWSROOM_IMAGE_SCENE_OVERRIDES.POCKET_ACTION, label: 'Pocket Action' },
  { value: NEWSROOM_IMAGE_SCENE_OVERRIDES.SCRAMBLE, label: 'Scramble' },
  { value: NEWSROOM_IMAGE_SCENE_OVERRIDES.CELEBRATION, label: 'Celebration' },
  { value: NEWSROOM_IMAGE_SCENE_OVERRIDES.SIDELINE, label: 'Sideline' },
  { value: NEWSROOM_IMAGE_SCENE_OVERRIDES.PORTRAIT, label: 'Portrait' },
  { value: NEWSROOM_IMAGE_SCENE_OVERRIDES.TUNNEL, label: 'Tunnel' },
  { value: NEWSROOM_IMAGE_SCENE_OVERRIDES.PRACTICE, label: 'Practice' },
  { value: NEWSROOM_IMAGE_SCENE_OVERRIDES.TOUGH_LOSS, label: 'Tough Loss' },
]);

const VALID_SCENES = new Set(NEWSROOM_EDITORIAL_SCENE_OPTIONS.map((option) => option.value));
const clean = (value, max = 5000) => String(value ?? '').trim().slice(0, max);

export const normalizeNewsroomEditorialScene = (value) => {
  const normalized = clean(value, 40).toLowerCase();
  return VALID_SCENES.has(normalized) ? normalized : NEWSROOM_IMAGE_SCENE_OVERRIDES.AUTO;
};

export const newsroomEditorialSceneLabel = (value) => (
  NEWSROOM_EDITORIAL_SCENE_OPTIONS.find((option) => option.value === normalizeNewsroomEditorialScene(value))?.label || 'Auto'
);

export const buildChatGptNewsroomPhotoPrompt = ({
  groundedPrompt = '',
  director = {},
  references = [],
} = {}) => {
  const prompt = clean(groundedPrompt, 12000);
  if (!prompt) throw new Error('A grounded DynastyHQ image prompt is required.');
  const roleLabels = [...new Set((Array.isArray(references) ? references : [])
    .map((entry) => clean(entry?.roleLabel || entry?.role, 80))
    .filter(Boolean))];

  const lines = [
    'Generate 4 distinct photorealistic 3:2 editorial college-football photo variations from the grounded DynastyHQ brief below.',
    'Keep the verified story context, identity constraints, equipment constraints, and football mechanics identical across all four variations. Vary only the professional sports-photo composition, camera angle, crop, moment within the same generalized scene, and natural background activity.',
    'Do not add statistics as visible text, invent a specific play, invent an injury, invent a venue or weather condition, or add any story fact that is not explicitly supported by the brief.',
    director?.presetLabel ? `DynastyHQ Photo Director selection: ${clean(director.presetLabel, 160)}.` : '',
    director?.subject ? `Primary editorial subject: ${clean(director.subject, 60)}${director?.position ? ` (${clean(director.position, 40)})` : ''}.` : '',
    director?.reason ? `Why this scene was selected: ${clean(director.reason, 600)}` : '',
    roleLabels.length
      ? `If I upload reference images, use them only for these intended roles: ${roleLabels.join(', ')}. Do not copy their original pose, crop, camera angle, or background.`
      : 'No reference image is required. Create fictional athletes and background subjects consistent with the verified team/story context unless the brief supplies permanent player identity details.',
    '',
    'GROUNDED DYNASTYHQ PHOTO BRIEF:',
    prompt,
    '',
    'VARIATION REQUIREMENT: Return four visually distinct professional sports-photo options while preserving the same verified facts and all hard constraints. Each should look like a real wire-service or major sports-publication photograph rather than AI artwork.',
  ];

  return lines.filter((line) => line !== '').join('\n');
};
