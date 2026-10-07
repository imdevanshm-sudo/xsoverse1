# Sound audit

Every sound in the five keepsakes and the wizard is a named event in `SOUND_EVENTS`
(`src/lib/sound.ts`). Components only ever call `playSound(event)`, `useTexture(event)` or hand a
media element to `attachMedia`; there are no direct audio calls anywhere else.

## How it behaves

- **Silent until opted in.** Nothing plays on load, on the landing page, or on hover. The Sound
  toggle (top-left on the first screen of every format, including the full-screen prompt) or a
  Play / Unwrap / Break Seal / Open press turns sound on. An explicit "off" on the toggle is stored
  on the device (`localStorage` key `xso:sound`) and wins over later opt-ins.
- **Only inside a keepsake or the wizard.** Sound needs a mounted surface (`useSoundSurface`).
- **Mute is total.** The toggle drives one master gain that effects, beds, music and voice all
  pass through.
- **No double triggers.** The same event within 45 ms is dropped; rapid repeats keep at most two
  overlapping voices (the oldest fades out) with ±3% random pitch.
- **Stops on leave.** Tab hidden (resumes music/voice on return), `pagehide`, and closing the
  viewer (last surface unmounts) all stop everything.
- **Missing files never break anything.** Each event has a synthesized stand-in in
  `src/lib/foley.ts`. A recorded file is only fetched when its event has `recorded: true`; if the
  fetch or decode fails it falls back to the stand-in. So no placeholder files are needed in
  `public/audio/sfx/`.

## Levels

Effects are levelled automatically: each buffer is measured once (BS.1770 K-weighted, loudest
400 ms window for one-shots, gated integrated loudness for loops) and gained to its target, with
peaks capped at −1.5 dBFS and a limiter on the master.

| Level                             | Offset                                      | Target   |
| --------------------------------- | ------------------------------------------- | -------- |
| UI ticks / swipes                 | −6 dB                                       | −26 LUFS |
| Paper / textures                  | −2 dB                                       | −22 LUFS |
| Impacts (stamp, seal crack, thud) | 0 dB                                        | −20 LUFS |
| Reveal chimes                     | 0 dB                                        | −20 LUFS |
| Beds (tape hiss, room tone)       | −20 dB                                      | −40 LUFS |
| Music                             | +2 dB, ducked −8 dB under effects and voice | −18 LUFS |
| Voice notes                       | +4 dB, never ducked                         | −16 LUFS |

Measured output for every event is on `/dev/sound-test` ("Measure all"); all events land on
target with the synthesized stand-ins.

## Events

Lengths are the designed length; "loop length" is the length of one seamless cycle. Target LUFS
includes any per-event trim. To ship a recorded file: put it at `public/audio/sfx/<file>`, set
`recorded: true` on the event, and check it on `/dev/sound-test`.

Style for every file: soft, warm, analog, tactile (paper, tape, wax, film). Under 1 s for
one-shots, no harsh highs, nothing cartoonish. Format: MP3 or M4A, 44.1/48 kHz, mono is fine,
peaks below −1 dBFS, no leading silence (loops must loop cleanly).

### Shared

| Event             | File                  | Length                | Sound                           | Level  | Target LUFS | Notes                                          |
| ----------------- | --------------------- | --------------------- | ------------------------------- | ------ | ----------- | ---------------------------------------------- |
| `unwrap.twine`    | `unwrap-twine.mp3`    | 500 ms                | Twine slipping off a parcel     | paper  | -22         |                                                |
| `unwrap.rip`      | `unwrap-rip.mp3`      | 600 ms                | Kraft paper tearing open        | paper  | -22         |                                                |
| `unwrap.thud`     | `unwrap-thud.mp3`     | 250 ms                | Soft thud as the gift settles   | impact | -20         |                                                |
| `photo.pop`       | `photo-pop.mp3`       | 250 ms                | Polaroid sliding out, soft pop  | impact | -22         |                                                |
| `photo.close`     | `photo-close.mp3`     | 300 ms                | Soft whoosh back to the pile    | paper  | -24         |                                                |
| `scratch.texture` | `scratch-texture.mp3` | 1500 ms (loop length) | Coin on scratch-off foil (loop) | paper  | -22         | loop, fades 120 ms after the pointer stops     |
| `scratch.reveal`  | `scratch-reveal.mp3`  | 700 ms                | Warm three-note reveal chime    | chime  | -20         | at 60% scratched                               |
| `audit.stamp`     | `audit-stamp.mp3`     | 250 ms                | Rubber stamp thud               | impact | -20         |                                                |
| `audit.tick`      | `audit-tick.mp3`      | 60 ms                 | Soft radar tick                 | tick   | -28         | max 5 per chart                                |
| `letter.pen`      | `letter-pen.mp3`      | 2000 ms (loop length) | Pen scratching paper (loop)     | paper  | -26         | loop, first lines only, off for reduced motion |
| `letter.type`     | `letter-type.mp3`     | 2000 ms (loop length) | Typewriter keys (loop)          | paper  | -26         | loop, first lines only, off for reduced motion |

### The Loop

| Event          | File               | Length | Sound                             | Level | Target LUFS | Notes                         |
| -------------- | ------------------ | ------ | --------------------------------- | ----- | ----------- | ----------------------------- |
| `loop.slide`   | `loop-slide.mp3`   | 250 ms | Card sliding off the pile         | paper | -22         | reverse plays at a lower rate |
| `loop.round`   | `loop-round.mp3`   | 400 ms | Tape blip as the loop comes round | tick  | -26         | once per loop                 |
| `loop.restart` | `loop-restart.mp3` | 500 ms | Tape rewind sweep                 | paper | -22         |                               |

### The Rewind

| Event          | File               | Length                | Sound                                | Level  | Target LUFS | Notes                                          |
| -------------- | ------------------ | --------------------- | ------------------------------------ | ------ | ----------- | ---------------------------------------------- |
| `rewind.play`  | `rewind-play.mp3`  | 300 ms                | Cassette deck thunk                  | impact | -20         |                                                |
| `rewind.hiss`  | `rewind-hiss.mp3`  | 2000 ms (loop length) | Tape hiss bed under the track (loop) | bed    | -40         | loop, no duck, only while music or voice plays |
| `rewind.track` | `rewind-track.mp3` | 300 ms                | Tape stop-start tick                 | tick   | -26         |                                                |
| `rewind.liner` | `rewind-liner.mp3` | 350 ms                | Page turn of the J-card              | paper  | -22         |                                                |

### The Scrapbook

| Event                | File                     | Length                | Sound                                  | Level  | Target LUFS | Notes                              |
| -------------------- | ------------------------ | --------------------- | -------------------------------------- | ------ | ----------- | ---------------------------------- |
| `scrap.lift.receipt` | `scrap-lift-receipt.mp3` | 300 ms                | Thin receipt lifted, crinkle           | paper  | -22         |                                    |
| `scrap.lift.photo`   | `scrap-lift-photo.mp3`   | 300 ms                | Glossy print lifted                    | paper  | -22         |                                    |
| `scrap.lift.note`    | `scrap-lift-note.mp3`    | 300 ms                | Card or note lifted, rustle            | paper  | -22         |                                    |
| `scrap.settle`       | `scrap-settle.mp3`       | 250 ms                | Piece set back on the desk             | paper  | -22         |                                    |
| `scrap.first`        | `scrap-first.mp3`        | 70 ms                 | Soft tick, first time a piece opens    | tick   | -26         | not on reopen                      |
| `scrap.seal`         | `scrap-seal.mp3`         | 300 ms                | Wax seal cracking                      | impact | -20         |                                    |
| `scrap.unfold`       | `scrap-unfold.mp3`       | 600 ms                | Letter unfolding                       | paper  | -22         |                                    |
| `scrap.tidy`         | `scrap-tidy.mp3`         | 600 ms                | Pieces swept into a neat pile          | paper  | -22         |                                    |
| `scrap.scatter`      | `scrap-scatter.mp3`      | 400 ms                | Pieces spread back out, lighter        | paper  | -25         |                                    |
| `scrap.peel`         | `scrap-peel.mp3`         | 200 ms                | Sticky note corner peeling             | paper  | -22         |                                    |
| `scrap.tear`         | `scrap-tear.mp3`         | 350 ms                | Ticket torn along the dots             | paper  | -22         |                                    |
| `scrap.pick`         | `scrap-pick.mp3`         | 60 ms                 | Fingertip picking a piece up           | tick   | -29         |                                    |
| `scrap.room`         | `scrap-room.mp3`         | 2000 ms (loop length) | Quiet room tone (loop, off by default) | bed    | -40         | loop, no duck, `ROOM_TONE = false` |

### The Accordion

| Event           | File                | Length | Sound                           | Level | Target LUFS | Notes                  |
| --------------- | ------------------- | ------ | ------------------------------- | ----- | ----------- | ---------------------- |
| `fold.open`     | `fold-creak.mp3`    | 350 ms | Paper fold creaking open        | paper | -22         | rate 1.06              |
| `fold.close`    | `fold-creak.mp3`    | 350 ms | Same creak, lower, folding shut | paper | -22         | rate 0.86              |
| `fold.shut`     | `fold-shut.mp3`     | 250 ms | Folded bundle settling shut     | paper | -22         |                        |
| `accordion.end` | `accordion-end.mp3` | 800 ms | Closing chime after the letter  | chime | -20         | before "Make one back" |

### The Movie Box

| Event               | File                    | Length                | Sound                                 | Level | Target LUFS | Notes                         |
| ------------------- | ----------------------- | --------------------- | ------------------------------------- | ----- | ----------- | ----------------------------- |
| `movie.start`       | `movie-start.mp3`       | 600 ms                | Projector flutter and leader tick     | paper | -22         | soundtrack fades in after it  |
| `movie.splice`      | `movie-splice.mp3`      | 300 ms                | Splice tick between scenes            | tick  | -26         | ±5% pitch                     |
| `movie.shutter`     | `movie-shutter.mp3`     | 120 ms                | Soft shutter click per slide          | tick  | -28         | max one per slide             |
| `movie.bar`         | `movie-bar.mp3`         | 60 ms                 | Tick as an audit bar fills            | tick  | -28         |                               |
| `movie.star`        | `movie-star.mp3`        | 800 ms                | Chime on the final star count         | chime | -20         |                               |
| `movie.fin`         | `movie-fin.mp3`         | 900 ms                | Closing note at "Fin"                 | chime | -20         | soundtrack fades out over 2 s |
| `projector.step`    | `projector-step.mp3`    | 80 ms                 | Claw pulling a frame through the gate | tick  | -26         |                               |
| `projector.ratchet` | `projector-ratchet.mp3` | 40 ms                 | Crank ratchet tooth                   | tick  | -32         |                               |
| `projector.hum`     | `projector-hum.mp3`     | 2000 ms (loop length) | Projector motor hum (loop)            | bed   | -32         | loop, no duck                 |
| `projector.note`    | `projector-note.mp3`    | 180 ms                | Director's note slid out              | paper | -25         |                               |

### Wizard

Silent by default; never on input or errors. The live preview follows the viewer rules above.

| Event            | File                 | Length | Sound                            | Level | Target LUFS | Notes                           |
| ---------------- | -------------------- | ------ | -------------------------------- | ----- | ----------- | ------------------------------- |
| `wizard.step`    | `wizard-step.mp3`    | 220 ms | Soft two-note step confirm       | tick  | -26         |                                 |
| `wizard.success` | `wizard-success.mp3` | 900 ms | Warm success chord after payment | chime | -20         | only after payment is confirmed |

## Music

Bundled tracks live in `public/audio/soundtracks/` and are fetched only after Play. Each entry in
`src/lib/soundtracks.ts` stores its measured integrated loudness (`lufs`) so the mixer can level
it to −18 LUFS; re-measure on `/dev/sound-test` when replacing a file. Uploads and voice notes are
measured in the browser the first time they play.

All eight current files are **generated placeholder loops (40 s)** and must be replaced with
licensed, royalty-free MP3s (128 kbps, 60–120 s, ideally loopable, ≈1–2 MB), with the licence
recorded in `soundtracks.ts`.

| Format    | File                   | Mood                         |
| --------- | ---------------------- | ---------------------------- |
| Movie Box | `golden-hour.mp3`      | Warm solo piano              |
| Movie Box | `slow-dance.mp3`       | Soft strings                 |
| Movie Box | `late-night-drive.mp3` | Mellow lo-fi                 |
| Movie Box | `home-movies.mp3`      | Fingerpicked acoustic guitar |
| Rewind    | `cassette-summer.mp3`  | Sunny synth-pop              |
| Rewind    | `bedroom-tapes.mp3`    | Lo-fi hip hop                |
| Rewind    | `arcade-crush.mp3`     | Chiptune                     |
| Rewind    | `slow-jam.mp3`         | Late-night R&B keys          |

## Verifying

- `/dev/sound-test` (dev only): one section per format with a Play button per event and the
  measured loudness, plus `?viewer=<format>` to open each keepsake with sample content
  (`&voice=1` for a Rewind voice note).
- `npm run sound:check` (or `PW_CHANNEL=chrome npm run sound:check` to use installed Chrome),
  with the dev server running. Per format: no sound on load, toggle visible and off on the first
  screen, Unwrap opts in, music/voice plays after Play, mute silences everything, no double
  triggers, at most two overlapping voices, and everything stops on tab hide and on closing the
  viewer.
