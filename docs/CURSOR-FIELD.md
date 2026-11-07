# Cursor field

`cursor-field.js` is a standalone, dependency-free WebGL 1 effect. Include it with `defer` **after** `scroll.js` on both language pages. It inserts one transparent, non-interactive canvas after `.bg`, below the foreground portfolio (`#scroll-site`, z-index 1).

The shader draws a short trail of six thin, softly distorted monochrome ripples. It does not copy or sample the video or HTML background; transparency blends the ripples into the existing background without distorting text. Dark mode uses pale ripples and light mode uses charcoal ripples.

## Cost and defaults

The `OPTIONS` object at the top of the file contains the tuning values:

| Option | Default | Purpose |
| --- | --- | --- |
| `fps` | 30 | Maximum GPU draw rate while the trail is alive |
| `lifetime` | 850 ms | Fade duration after each mouse sample |
| `sampleInterval` | 55 ms | Minimum spacing between trail samples |
| `radius` | 82 CSS px | Maximum shading margin around each sample |
| `maxPixels` | 480,000 | Drawing-buffer pixel budget |
| `maxDpr` | 1 | Prevents Retina displays multiplying GPU cost |
| `darkOpacity` | 0.065 | Maximum pale ripple opacity |
| `lightOpacity` | 0.045 | Maximum charcoal ripple opacity |

The drawing buffer is fullscreen but only the bounding rectangle around active trail samples is shaded. Each drawn frame has one draw call, six uniform trail points, no textures, no framebuffer feedback and no noise library. The frame loop ends when the last ripple fades. The WebGL context is created only after the first eligible mouse movement. GPU resources are disposed on `pagehide` and rebuilt lazily after `pageshow`, including browser back/forward cache restoration.

## Automatic opt-outs

The effect requires a mouse, a fine hover pointer, a viewport wider than 840 px and `data-experience="full"`. It stops and clears immediately for mobile, Performance or pending experience modes, paused motion, an open experience dialog, a hidden tab, or the operating system's reduced-motion preference. Reduced motion takes precedence even when the website is set to full motion. Unsupported WebGL, major performance caveats and shader initialization failures fall back to the existing page without an overlay or error UI. Context loss hides the canvas; restoration permits a lazy rebuild on the next eligible mouse movement.

The canvas is `aria-hidden`, inert, has no focus target, and uses `pointer-events: none`. It cannot intercept links, forms, scrolling or selection. It does not listen for keystrokes or store cursor data.
