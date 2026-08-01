# DynastyHQ

DynastyHQ is a private EA SPORTS College Football career universe that follows one journey from high-school Road to Glory through an offensive-coordinator and head-coach career.

## Current workflow

1. Upload one or more weekly screenshots.
2. A protected Vercel function classifies each screen and extracts supported facts.
3. Review the source image, visible evidence, and confidence for every extracted value.
4. Correct, confirm, or ignore uncertain game, RTG, recruiting, roster, and Dynasty Points/NIL facts inside the draft.
5. Choose Game Week, Team Game / No Appearance, or Bye Week and review the stage-aware completeness checklist.
6. Publish the verified week to the game log, Fact Ledger, Career Chronicle, recruiting board, and grounded newsroom.

Screenshot analysis is deliberately reversible. A scan never changes the saved career by itself.
Missing recommended screenshots do not block an intentional partial update, and missing values are never silently converted to zero.
An unfinished review is saved locally for the signed-in owner and restored after a refresh. Published updates use a stable season/week key, so repeat clicks or recovered stale drafts cannot duplicate a week.

## The Gridiron Grind podcast

Each verified game-week newsroom issue can become a grounded 5–6 minute episode. DynastyHQ first creates a permanent two-host transcript with chapter markers and exact Fact Ledger citations, then renders Marcus Grant and Tyler Brooks as separate speech segments. A failed audio request leaves the saved transcript intact. Completed audio is cached on the device, archived in the owner's Firebase space, and copied to the public viewer archive when a share link is published. The player clearly labels the voices as AI-generated.

## Newsroom Media Manager

Every published article has its own photo assignment. Owners can upload a PNG, JPEG, or WebP image, reuse an existing Media Library asset, replace or remove an assignment, and maintain an approved Reference Locker. Uploaded image files live in the owner's Firebase Storage path; only lightweight metadata is stored with the career save. Public sharing includes assigned article images but excludes unassigned Reference Locker assets and private storage metadata.

Verified articles can also request one labeled AI-generated editorial image. The server builds the prompt from the article's grounded headline and summary, accepts up to four approved Firebase reference images, and never accepts unrestricted client prompt text. Automatic generation is opt-in and limited to The Bolt's lead story for each new edition.

## Personnel and NIL/CFO office

The coaching workspace is role-aware. An offensive coordinator sees offensive and assigned targets plus advisory budget information; a head coach sees the full personnel board and holds final program authority. Coach recruiting screenshots can add visible prospects without manual board entry, and verified budget screens reconcile Recruiting NIL, Roster NIL/retention, staff, and facilities against the available Dynasty Points total. Missing categories remain unknown rather than being treated as zero.

## Career Chronicle

The dedicated Career Chronicle joins every published weekly update to its timeline event, verified facts, game line, and newsroom edition. It includes season, career-stage, week-type, and text filters; career summary totals; direct links back to a historical newsroom issue; and fallback display support for older saves created before the Chronicle fields existed.

## Local setup

```bash
npm install
npm test
npm run dev
```

The Vite development server does not run the `/api` function by itself. To test live screenshot analysis locally, use Vercel's local development command after linking the project:

```bash
npx vercel dev
```

## Vercel environment variables

Copy `.env.example` for the variable names, then add the real values to the Vercel project settings.

- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID` are required for the browser app. Vite embeds these values in the client bundle, so Firebase Security Rules must protect all data.
- `OPENAI_API_KEY` is required for screenshot analysis and podcast generation. It is read only inside Vercel server functions and must never use a `VITE_` prefix.
- `OPENAI_VISION_MODEL` is optional. It defaults to `gpt-5.6`.
- `OPENAI_PODCAST_MODEL` is optional. It defaults to `gpt-5.6-terra` for grounded episode scripts.
- `OPENAI_TTS_MODEL` is optional. It defaults to `gpt-4o-mini-tts` for the two host voices.
- `OPENAI_NEWSROOM_IMAGE_MODEL` is optional. It defaults to `gpt-image-2` for verified editorial images.
- `FIREBASE_WEB_API_KEY` is required by the authenticated server functions and normally matches `VITE_FIREBASE_API_KEY`. It must not use a `VITE_` prefix.

The screenshot, podcast, and newsroom-image endpoints require a current Firebase ID token. Newsroom uploads also require Firebase Storage rules that let an authenticated owner write only beneath `artifacts/dynasty-hq/users/{uid}/newsroom_media/` while allowing assigned download URLs to render in the public viewer.

## Verification

```bash
npm test
npm run build
npx eslint api src/domain src/services src/components
```
