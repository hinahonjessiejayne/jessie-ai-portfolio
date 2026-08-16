# Jessie Hinahon — AI Portfolio

An AI-native portfolio. There are no static sections: the bio, projects, skills and
booking flow are all revealed through conversation with an AI avatar, in the spirit of
[toukoum.fr](https://www.toukoum.fr/), built on the gold-on-black identity from the
existing GHL portfolio.

## Setup

```bash
npm install
cp .env.example .env.local     # then paste your Groq key into .env.local
npm run dev                    # http://localhost:3000
```

Get a free key at [console.groq.com/keys](https://console.groq.com/keys). Without a
valid `GROQ_API_KEY` the UI loads fine but every message returns a clear error.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` — run before every deploy |
| `npm run lint` | ESLint via `next lint` |

## Deploying to Vercel

```bash
npx vercel            # preview
npx vercel --prod     # production
```

Add `GROQ_API_KEY` under **Project → Settings → Environment Variables**. It is read
server-side only and is never exposed to the browser. `vercel.json` pins the region to
`sin1` (Singapore) — the closest edge to Manila, which is where most traffic will come
from. Change it if that stops being true.

## How it works

```
app/page.tsx            Landing → chat transition, composer, state wiring
app/api/chat/route.ts   Groq streaming endpoint (edge runtime)
lib/prompt.ts           The avatar's entire knowledge base  ← edit this
lib/projects.ts         Featured cards + full workflow catalogue ← edit this
components/             Avatar, HoneycombField, MessageList, PointerFX, chips, toggle
```

**Editing what the AI knows:** everything lives in `lib/prompt.ts`. Change that one
file and redeploy — no other file needs to be touched.

**Inline rich content.** The model emits markers, and `MessageList` swaps them for real
React components mid-stream:

| Marker | Renders |
| --- | --- |
| `[[PROJECTS]]` | The three headline builds as full cards |
| `[[N8N]]` | All 2 N8N workflows, compact rows |
| `[[ZAPIER]]` | All 5 Zapier workflows |
| `[[GHL]]` | All 5 GHL workflows |
| `[[BOOKING]]` | The GHL calendar embed, loaded on click |

So "show me your projects" gives the headline three, "what n8n have you built" gives
every N8N workflow, and "show me everything" renders all three platform groups. Asking
about **Make.com** deliberately returns an honest "none in the portfolio yet" rather
than a marker — there is no Make.com project to show.

**The honeycomb** in `components/HoneycombField.tsx` is the same lattice as the existing
site (`R=25`, `MAXD=350`, squared falloff), extended so it reacts to the conversation: a
gold ring pulses outward from the avatar while the AI thinks, and the whole field lifts
its floor brightness while a reply streams. It runs entirely on canvas and refs, so the
60fps loop never re-renders React.

## Theming

Dark by default, with a toggle top-right. Both palettes are lifted verbatim from
`ghl-portfolio.html`, defined as CSS custom properties in `app/globals.css`. Gold shifts
from `#D4AF37` to `#967B27` in light mode — the bright gold fails contrast on near-white,
so it is not the same value in both themes.

An inline script in `layout.tsx` applies the stored theme before first paint, which is
what prevents a dark flash for light-mode visitors.

## The avatar

`public/avatar/turn-00.png … turn-10.png` are 11 head-turn frames at 336px, cut from a
real iOS Memoji recording. The cursor's horizontal position picks a frame, so the head
genuinely turns — these are true rendered angles, not a warped still.

**Yaw is owned by exactly one mechanism at a time.** In frame mode the frames do the
turning and the CSS transform carries only the *residual* — the fraction of a step
between the frame on screen and the true cursor angle. That is what makes 11 discrete
frames feel continuous. Applying a full `rotateY` on top would double the rotation and
shear the face; with no frames at all, that same transform takes over as the whole
effect. Do not let both run together.

Frame selection rides the spring rather than the raw pointer, so the head keeps turning
through the settle instead of snapping ahead of it.

**Volumetric lighting is what makes it read as a head rather than a rotating picture.**
Three gradient layers are masked by the current frame's own alpha, so they paint on the
Memoji's exact silhouette instead of a box around it:

| Layer | Blend | Role |
| --- | --- | --- |
| Occlusion wash | `multiply` | Cool shadow on the side away from the cursor |
| Key light | `soft-light` | Warm highlight tracking the cursor |
| Rim | `screen` | Gold specular rolling around the leading edge |

As the cursor crosses, the terminator between key and shadow sweeps over the face. The
head also pushes back in Z as it turns, so it leans rather than pivoting flatly.

The mask is `mask-image: url(<current frame>)` — it follows the frame automatically, so
adding or regenerating frames needs no lighting changes.

Only the centre frame is in the initial HTML. The other ten warm 600ms after mount, which
keeps ~1MB of turn frames off the critical path for an animation nobody has triggered yet.

### Regenerating the frames

The frames are cut from an iOS Memoji recording (`.MOV`, HEVC with alpha). Two Swift
scripts do it with AVFoundation — no ffmpeg, no Python imaging libraries:

```bash
# 1. Survey the take: a labelled grid of frame numbers
swift scripts/ContactSheet.swift recording.MOV sheet.png 6 4
swift scripts/ContactSheet.swift recording.MOV zoom.png 6 4 100 300   # frame range

# 2. Build the strip from hand-picked frames, leftmost gaze first
swift scripts/BuildStrip.swift recording.MOV public/avatar 336 \
  "268,258,248,238,227,214,203,197,192,187,182"
```

Two things matter when picking frames:

- **Order them by pose, not by time.** The strip is a spatial sweep. A recording usually
  turns one way, returns, then turns the other, so the left half and right half come from
  different moments in the take.
- **Check the sweep is monotonic.** It is easy to pick a frame past the peak where the
  head has already started coming back — the contact sheet makes that obvious.

`BuildStrip` crops each frame around its own alpha bounding box and re-centres it on a
common box, because a live recording drifts around the canvas and the head would
otherwise jump as the cursor swaps frames. `AVAssetReader` decodes to 32BGRA rather than
going through `AVAssetImageGenerator`, which flattens HEVC alpha onto an opaque
background.

The avatar falls back to the photo portrait if a frame fails to load, then to initials —
it is never an empty box. The contact shadow and floating (unframed) treatment apply only
to the cut-out Memoji; the photo fallback keeps the circular frame and status dot.

## Still to add

- [ ] **Avatar video (optional)** → drop a Firefly clip at `public/avatar.mp4` and pass
      `videoSrc="/avatar.mp4"` to `<Avatar>`. It then plays while the avatar replies.
- [ ] **Two `TODO(jessie)` slots** in `lib/prompt.ts` — education detail and your rate
      card. Until filled, the avatar honestly says it will check rather than inventing
      an answer.
- [ ] **Testimonials** are not wired in. The three on the existing site use placeholder
      names and stock avatars; real quotes with real attribution would be worth adding
      to `lib/prompt.ts`.

## Notes on the build

- **Fonts:** Playfair Display (display, italic — the brand signature), Outfit (body),
  Fira Code (mono), all self-hosted through `next/font` so there is no third-party
  request and no flash of unstyled text. Outfit replaces Inter deliberately — see
  `CLAUDE.md` for why.
- **Portrait** is hot-linked from Google Drive. That works, but Drive is not a CDN and
  can rate-limit. Downloading it to `public/` would be more robust.
- **Pinned versions.** `ai@4` and `@ai-sdk/groq@1` are pinned intentionally — AI SDK v5
  moved `useChat` to `@ai-sdk/react` and changed the streaming response API. Upgrading
  means editing both `app/page.tsx` and `app/api/chat/route.ts`.
- **Model:** `llama-3.3-70b-versatile`. The brief asked for `llama-3.1-70b`, which Groq
  has retired; 3.3-70b is its replacement.
