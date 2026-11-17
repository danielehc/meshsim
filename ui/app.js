'use strict';

// ── Injected by Go handler (see index.html) ───────────────────────────────────
var REFRESH_SECS = (CONFIG && CONFIG.refresh_secs) ? CONFIG.refresh_secs : 5;

// ── SVG icon map ──────────────────────────────────────────────────────────────
// Path data from Font Awesome 6 Free (Icons: CC BY 4.0).  Every entry is a
// single <path>; data-w holds the viewBox width (height is always 512).
var SVG_ICONS = {
  'fa-gear': '<path data-w="512" fill="currentColor" d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/>',
  'fa-server': '<path data-w="512" fill="currentColor" d="M64 32C28.7 32 0 60.7 0 96l0 64c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-64c0-35.3-28.7-64-64-64L64 32zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm48 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zM64 288c-35.3 0-64 28.7-64 64l0 64c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-64c0-35.3-28.7-64-64-64L64 288zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm56 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z"/>',
  'fa-database': '<path data-w="448" fill="currentColor" d="M448 80l0 48c0 44.2-100.3 80-224 80S0 172.2 0 128L0 80C0 35.8 100.3 0 224 0S448 35.8 448 80zM393.2 214.7c20.8-7.4 39.9-16.9 54.8-28.6L448 288c0 44.2-100.3 80-224 80S0 332.2 0 288L0 186.1c14.9 11.8 34 21.2 54.8 28.6C99.7 230.7 159.5 240 224 240s124.3-9.3 169.2-25.3zM0 346.1c14.9 11.8 34 21.2 54.8 28.6C99.7 390.7 159.5 400 224 400s124.3-9.3 169.2-25.3c20.8-7.4 39.9-16.9 54.8-28.6l0 85.9c0 44.2-100.3 80-224 80S0 476.2 0 432l0-85.9z"/>',
  'fa-globe': '<path data-w="512" fill="currentColor" d="M352 256c0 22.2-1.2 43.6-3.3 64l-185.3 0c-2.2-20.4-3.3-41.8-3.3-64s1.2-43.6 3.3-64l185.3 0c2.2 20.4 3.3 41.8 3.3 64zm28.8-64l123.1 0c5.3 20.5 8.1 41.9 8.1 64s-2.8 43.5-8.1 64l-123.1 0c2.1-20.6 3.2-42 3.2-64s-1.1-43.4-3.2-64zm112.6-32l-116.7 0c-10-63.9-29.8-117.4-55.3-151.6c78.3 20.7 142 77.5 171.9 151.6zm-149.1 0l-176.6 0c6.1-36.4 15.5-68.6 27-94.7c10.5-23.6 22.2-40.7 33.5-51.5C239.4 3.2 248.7 0 256 0s16.6 3.2 27.8 13.8c11.3 10.8 23 27.9 33.5 51.5c11.6 26 20.9 58.2 27 94.7zm-209 0L18.6 160C48.6 85.9 112.2 29.1 190.6 8.4C165.1 42.6 145.3 96.1 135.3 160zM8.1 192l123.1 0c-2.1 20.6-3.2 42-3.2 64s1.1 43.4 3.2 64L8.1 320C2.8 299.5 0 278.1 0 256s2.8-43.5 8.1-64zM194.7 446.6c-11.6-26-20.9-58.2-27-94.6l176.6 0c-6.1 36.4-15.5 68.6-27 94.6c-10.5 23.6-22.2 40.7-33.5 51.5C272.6 508.8 263.3 512 256 512s-16.6-3.2-27.8-13.8c-11.3-10.8-23-27.9-33.5-51.5zM135.3 352c10 63.9 29.8 117.4 55.3 151.6C112.2 482.9 48.6 426.1 18.6 352l116.7 0zm358.1 0c-30 74.1-93.6 130.9-171.9 151.6c25.5-34.2 45.2-87.7 55.3-151.6l116.7 0z"/>',
  'fa-box': '<path data-w="448" fill="currentColor" d="M50.7 58.5L0 160l208 0 0-128L93.7 32C75.5 32 58.9 42.3 50.7 58.5zM240 160l208 0L397.3 58.5C389.1 42.3 372.5 32 354.3 32L240 32l0 128zm208 32L0 192 0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-224z"/>',
  'fa-box-open': '<path data-w="640" fill="currentColor" d="M58.9 42.1c3-6.1 9.6-9.6 16.3-8.7L320 64 564.8 33.4c6.7-.8 13.3 2.7 16.3 8.7l41.7 83.4c9 17.9-.6 39.6-19.8 45.1L439.6 217.3c-13.9 4-28.8-1.9-36.2-14.3L320 64 236.6 203c-7.4 12.4-22.3 18.3-36.2 14.3L37.1 170.6c-19.3-5.5-28.8-27.2-19.8-45.1L58.9 42.1zM321.1 128l54.9 91.4c14.9 24.8 44.6 36.6 72.5 28.6L576 211.6l0 167c0 22-15 41.2-36.4 46.6l-204.1 51c-10.2 2.6-20.9 2.6-31 0l-204.1-51C79 419.7 64 400.5 64 378.5l0-167L191.6 248c27.8 8 57.6-3.8 72.5-28.6L318.9 128l2.2 0z"/>',
  'fa-shuffle': '<path data-w="512" fill="currentColor" d="M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6l0-32-32 0c-10.1 0-19.6 4.7-25.6 12.8L284 229.3 244 176l31.2-41.6C293.3 110.2 321.8 96 352 96l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6zM164 282.7L204 336l-31.2 41.6C154.7 401.8 126.2 416 96 416l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c10.1 0 19.6-4.7 25.6-12.8L164 282.7zm274.6 188c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6l0-32-32 0c-30.2 0-58.7-14.2-76.8-38.4L121.6 172.8c-6-8.1-15.5-12.8-25.6-12.8l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c30.2 0 58.7 14.2 76.8 38.4L326.4 339.2c6 8.1 15.5 12.8 25.6 12.8l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64z"/>',
  'fa-cloud': '<path data-w="640" fill="currentColor" d="M0 336c0 79.5 64.5 144 144 144l368 0c70.7 0 128-57.3 128-128c0-61.9-44-113.6-102.4-125.4c4.1-10.7 6.4-22.4 6.4-34.6c0-53-43-96-96-96c-19.7 0-38.1 6-53.3 16.2C367 64.2 315.3 32 256 32C167.6 32 96 103.6 96 192c0 2.7 .1 5.4 .2 8.1C40.2 219.8 0 273.2 0 336z"/>',
  'fa-plug': '<path data-w="384" fill="currentColor" d="M96 0C78.3 0 64 14.3 64 32l0 96 64 0 0-96c0-17.7-14.3-32-32-32zM288 0c-17.7 0-32 14.3-32 32l0 96 64 0 0-96c0-17.7-14.3-32-32-32zM32 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l0 32c0 77.4 55 142 128 156.8l0 67.2c0 17.7 14.3 32 32 32s32-14.3 32-32l0-67.2C297 398 352 333.4 352 256l0-32c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 160z"/>',
  'fa-lock': '<path data-w="448" fill="currentColor" d="M144 144l0 48 160 0 0-48c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192l0-48C80 64.5 144.5 0 224 0s144 64.5 144 144l0 48 16 0c35.3 0 64 28.7 64 64l0 192c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 256c0-35.3 28.7-64 64-64l16 0z"/>',
  'fa-bolt': '<path data-w="448" fill="currentColor" d="M349.4 44.6c5.9-13.7 1.5-29.7-10.6-38.5s-28.6-8-39.9 1.8l-256 224c-10 8.8-13.6 22.9-8.9 35.3S50.7 288 64 288l111.5 0L98.6 467.4c-5.9 13.7-1.5 29.7 10.6 38.5s28.6 8 39.9-1.8l256-224c10-8.8 13.6-22.9 8.9-35.3s-16.6-20.7-30-20.7l-111.5 0L349.4 44.6z"/>',
  'fa-key': '<path data-w="512" fill="currentColor" d="M336 352c97.2 0 176-78.8 176-176S433.2 0 336 0S160 78.8 160 176c0 18.7 2.9 36.8 8.3 53.7L7 391c-4.5 4.5-7 10.6-7 17l0 80c0 13.3 10.7 24 24 24l80 0c13.3 0 24-10.7 24-24l0-40 40 0c13.3 0 24-10.7 24-24l0-40 40 0c6.4 0 12.5-2.5 17-7l33.3-33.3c16.9 5.4 35 8.3 53.7 8.3zM376 96a40 40 0 1 1 0 80 40 40 0 1 1 0-80z"/>',
  'fa-layer-group': '<path data-w="576" fill="currentColor" d="M264.5 5.2c14.9-6.9 32.1-6.9 47 0l218.6 101c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 149.8C37.4 145.8 32 137.3 32 128s5.4-17.9 13.9-21.8L264.5 5.2zM476.9 209.6l53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 277.8C37.4 273.8 32 265.3 32 256s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0l152-70.2zm-152 198.2l152-70.2 53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 405.8C37.4 401.8 32 393.3 32 384s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0z"/>',
  'fa-hard-drive': '<path data-w="512" fill="currentColor" d="M0 96C0 60.7 28.7 32 64 32l384 0c35.3 0 64 28.7 64 64l0 184.4c-17-15.2-39.4-24.4-64-24.4L64 256c-24.6 0-47 9.2-64 24.4L0 96zM64 288l384 0c35.3 0 64 28.7 64 64l0 64c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64zM320 416a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm128-32a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/>',
  'fa-chart-line': '<path data-w="512" fill="currentColor" d="M64 64c0-17.7-14.3-32-32-32S0 46.3 0 64L0 400c0 44.2 35.8 80 80 80l400 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 416c-8.8 0-16-7.2-16-16L64 64zm406.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L320 210.7l-57.4-57.4c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L240 221.3l57.4 57.4c12.5 12.5 32.8 12.5 45.3 0l128-128z"/>',
  'fa-network-wired': '<path data-w="640" fill="currentColor" d="M256 64l128 0 0 64-128 0 0-64zM240 0c-26.5 0-48 21.5-48 48l0 96c0 26.5 21.5 48 48 48l48 0 0 32L32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l96 0 0 32-48 0c-26.5 0-48 21.5-48 48l0 96c0 26.5 21.5 48 48 48l160 0c26.5 0 48-21.5 48-48l0-96c0-26.5-21.5-48-48-48l-48 0 0-32 256 0 0 32-48 0c-26.5 0-48 21.5-48 48l0 96c0 26.5 21.5 48 48 48l160 0c26.5 0 48-21.5 48-48l0-96c0-26.5-21.5-48-48-48l-48 0 0-32 96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-256 0 0-32 48 0c26.5 0 48-21.5 48-48l0-96c0-26.5-21.5-48-48-48L240 0zM96 448l0-64 128 0 0 64L96 448zm320-64l128 0 0 64-128 0 0-64z"/>',
  'fa-spider': '<path data-w="512" fill="currentColor" d="M158.4 32.6c4.8-12.4-1.4-26.3-13.8-31s-26.3 1.4-31 13.8L81.1 100c-7.9 20.7-3 44.1 12.7 59.7l57.4 57.4L70.8 190.3c-2.4-.8-4.3-2.7-5.1-5.1L46.8 128.4C42.6 115.8 29 109 16.4 113.2S-3 131 1.2 143.6l18.9 56.8c5.6 16.7 18.7 29.8 35.4 35.4L116.1 256 55.6 276.2c-16.7 5.6-29.8 18.7-35.4 35.4L1.2 368.4C-3 381 3.8 394.6 16.4 398.8s26.2-2.6 30.4-15.2l18.9-56.8c.8-2.4 2.7-4.3 5.1-5.1l80.4-26.8L93.7 352.3C78.1 368 73.1 391.4 81.1 412l32.5 84.6c4.8 12.4 18.6 18.5 31 13.8s18.5-18.6 13.8-31l-32.5-84.6c-1.1-3-.4-6.3 1.8-8.5L160 353.9c1 52.1 43.6 94.1 96 94.1s95-41.9 96-94.1l32.3 32.3c2.2 2.2 2.9 5.6 1.8 8.5l-32.5 84.6c-4.8 12.4 1.4 26.3 13.8 31s26.3-1.4 31-13.8L430.9 412c7.9-20.7 3-44.1-12.7-59.7l-57.4-57.4 80.4 26.8c2.4 .8 4.3 2.7 5.1 5.1l18.9 56.8c4.2 12.6 17.8 19.4 30.4 15.2s19.4-17.8 15.2-30.4l-18.9-56.8c-5.6-16.7-18.7-29.8-35.4-35.4L395.9 256l60.5-20.2c16.7-5.6 29.8-18.7 35.4-35.4l18.9-56.8c4.2-12.6-2.6-26.2-15.2-30.4s-26.2 2.6-30.4 15.2l-18.9 56.8c-.8 2.4-2.7 4.3-5.1 5.1l-80.4 26.8 57.4-57.4c15.6-15.6 20.6-39 12.7-59.7L398.4 15.4C393.6 3 379.8-3.2 367.4 1.6s-18.5 18.6-13.8 31l32.5 84.6c1.1 3 .4 6.3-1.8 8.5L336 174.1l0-14.1c0-31.8-18.6-59.3-45.5-72.2c-9.1-4.4-18.5 3.3-18.5 13.4l0 10.8c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-10.8c0-10.1-9.4-17.7-18.5-13.4C194.6 100.7 176 128.2 176 160l0 14.1-48.3-48.3c-2.2-2.2-2.9-5.6-1.8-8.5l32.5-84.6z"/>',
  'fa-puzzle-piece': '<path data-w="512" fill="currentColor" d="M192 104.8c0-9.2-5.8-17.3-13.2-22.8C167.2 73.3 160 61.3 160 48c0-26.5 28.7-48 64-48s64 21.5 64 48c0 13.3-7.2 25.3-18.8 34c-7.4 5.5-13.2 13.6-13.2 22.8c0 12.8 10.4 23.2 23.2 23.2l56.8 0c26.5 0 48 21.5 48 48l0 56.8c0 12.8 10.4 23.2 23.2 23.2c9.2 0 17.3-5.8 22.8-13.2c8.7-11.6 20.7-18.8 34-18.8c26.5 0 48 28.7 48 64s-21.5 64-48 64c-13.3 0-25.3-7.2-34-18.8c-5.5-7.4-13.6-13.2-22.8-13.2c-12.8 0-23.2 10.4-23.2 23.2L384 464c0 26.5-21.5 48-48 48l-56.8 0c-12.8 0-23.2-10.4-23.2-23.2c0-9.2 5.8-17.3 13.2-22.8c11.6-8.7 18.8-20.7 18.8-34c0-26.5-28.7-48-64-48s-64 21.5-64 48c0 13.3 7.2 25.3 18.8 34c7.4 5.5 13.2 13.6 13.2 22.8c0 12.8-10.4 23.2-23.2 23.2L48 512c-26.5 0-48-21.5-48-48L0 343.2C0 330.4 10.4 320 23.2 320c9.2 0 17.3 5.8 22.8 13.2C54.7 344.8 66.7 352 80 352c26.5 0 48-28.7 48-64s-21.5-64-48-64c-13.3 0-25.3 7.2-34 18.8C40.5 250.2 32.4 256 23.2 256C10.4 256 0 245.6 0 232.8L0 176c0-26.5 21.5-48 48-48l120.8 0c12.8 0 23.2-10.4 23.2-23.2z"/>',
  'fa-satellite-dish': '<path data-w="512" fill="currentColor" d="M192 32c0-17.7 14.3-32 32-32C383.1 0 512 128.9 512 288c0 17.7-14.3 32-32 32s-32-14.3-32-32C448 164.3 347.7 64 224 64c-17.7 0-32-14.3-32-32zM60.6 220.6L164.7 324.7l28.4-28.4c-.7-2.6-1.1-5.4-1.1-8.3c0-17.7 14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32c-2.9 0-5.6-.4-8.3-1.1l-28.4 28.4L291.4 451.4c14.5 14.5 11.8 38.8-7.3 46.3C260.5 506.9 234.9 512 208 512C93.1 512 0 418.9 0 304c0-26.9 5.1-52.5 14.4-76.1c7.5-19 31.8-21.8 46.3-7.3zM224 96c106 0 192 86 192 192c0 17.7-14.3 32-32 32s-32-14.3-32-32c0-70.7-57.3-128-128-128c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/>',
  'fa-envelope': '<path data-w="512" fill="currentColor" d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/>',
  'fa-dharmachakra': '<path data-w="512" fill="currentColor" d="M337.8 205.7l48.6-42.5c13.8 19.3 23.4 41.9 27.4 66.2l-64.4 4.3c-2.4-10.1-6.4-19.5-11.6-28zm140.1 19.5c-5.3-38.8-20.6-74.5-43.2-104.3l.8-.7C449 108.4 449.7 87.6 437 75s-33.4-12-45.2 1.5l-.7 .8c-29.8-22.6-65.5-37.9-104.3-43.2l.1-1.1c1.2-17.9-13-33-30.9-33s-32.1 15.2-30.9 33l.1 1.1c-38.8 5.3-74.5 20.6-104.3 43.2l-.7-.8C108.4 63 87.6 62.3 75 75s-12 33.4 1.5 45.2l.8 .7c-22.6 29.8-37.9 65.5-43.2 104.3l-1.1-.1c-17.9-1.2-33 13-33 30.9s15.2 32.1 33 30.9l1.1-.1c5.3 38.8 20.6 74.5 43.2 104.3l-.8 .7C63 403.6 62.3 424.4 75 437s33.4 12 45.2-1.5l.7-.8c29.8 22.6 65.5 37.9 104.3 43.2l-.1 1.1c-1.2 17.9 13 33 30.9 33s32.1-15.2 30.9-33l-.1-1.1c38.8-5.3 74.5-20.6 104.3-43.2l.7 .8c11.8 13.5 32.5 14.2 45.2 1.5s12-33.4-1.5-45.2l-.8-.7c22.6-29.8 37.9-65.5 43.2-104.3l1.1 .1c17.9 1.2 33-13 33-30.9s-15.2-32.1-33-30.9l-1.1 .1zM163.2 125.6c19.3-13.8 41.9-23.4 66.2-27.5l4.3 64.4c-10 2.4-19.5 6.4-28 11.6l-42.5-48.6zm-65 103.8c4.1-24.4 13.7-46.9 27.5-66.2l48.6 42.5c-5.3 8.5-9.2 18-11.6 28l-64.4-4.3zm27.5 119.4c-13.8-19.3-23.4-41.9-27.5-66.2l64.4-4.3c2.4 10 6.4 19.5 11.6 28l-48.6 42.5zm103.8 65c-24.4-4.1-46.9-13.7-66.2-27.4l42.5-48.6c8.5 5.3 18 9.2 28 11.6l-4.3 64.4zm119.4-27.4c-19.3 13.8-41.9 23.4-66.2 27.4l-4.3-64.4c10-2.4 19.5-6.4 28-11.6l42.5 48.6zm65-103.8c-4.1 24.4-13.7 46.9-27.4 66.2l-48.6-42.5c5.3-8.5 9.2-18 11.6-28l64.4 4.3zm-65-156.9l-42.5 48.6c-8.5-5.3-18-9.2-28-11.6l4.3-64.4c24.4 4.1 46.9 13.7 66.2 27.5zM256 224a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/>',
  'fa-terminal': '<path data-w="576" fill="currentColor" d="M9.4 86.6C-3.1 74.1-3.1 53.9 9.4 41.4s32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L178.7 256 9.4 86.6zM256 416l288 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-288 0c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/>',
  'fa-copy': '<path data-w="448" fill="currentColor" d="M208 0L332.1 0c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9L448 336c0 26.5-21.5 48-48 48l-192 0c-26.5 0-48-21.5-48-48l0-288c0-26.5 21.5-48 48-48zM48 128l80 0 0 64-64 0 0 256 192 0 0-32 64 0 0 48c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 176c0-26.5 21.5-48 48-48z"/>',
  'fa-circle': '<path data-w="512" fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z"/>',
  'fa-bookmark': '<path data-w="384" fill="currentColor" d="M0 48V487.7C0 501.1 10.9 512 24.3 512c5 0 9.9-1.5 14-4.4L192 400 345.7 507.6c4.1 2.9 9 4.4 14 4.4c13.4 0 24.3-10.9 24.3-24.3V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48z"/>',
  'fa-tag': '<path data-w="448" fill="currentColor" d="M0 80L0 229.5c0 17 6.7 33.3 18.7 45.3l176 176c25 25 65.5 25 90.5 0L418.7 317.3c25-25 25-65.5 0-90.5l-176-176c-12-12-28.3-18.7-45.3-18.7L48 32C21.5 32 0 53.5 0 80zm112 32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/>',
  'fa-dollar-sign': '<path data-w="320" fill="currentColor" d="M160 0c17.7 0 32 14.3 32 32l0 35.7c1.6 .2 3.1 .4 4.7 .7c.4 .1 .7 .1 1.1 .2l48 8.8c17.4 3.2 28.9 19.9 25.7 37.2s-19.9 28.9-37.2 25.7l-47.5-8.7c-31.3-4.6-58.9-1.5-78.3 6.2s-27.2 18.3-29 28.1c-2 10.7-.5 16.7 1.2 20.4c1.8 3.9 5.5 8.3 12.8 13.2c16.3 10.7 41.3 17.7 73.7 26.3l2.9 .8c28.6 7.6 63.6 16.8 89.6 33.8c14.2 9.3 27.6 21.9 35.9 39.5c8.5 17.9 10.3 37.9 6.4 59.2c-6.9 38-33.1 63.4-65.6 76.7c-13.7 5.6-28.6 9.2-44.4 11l0 33.4c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-34.9c-.4-.1-.9-.1-1.3-.2l-.2 0s0 0 0 0c-24.4-3.8-64.5-14.3-91.5-26.3c-16.1-7.2-23.4-26.1-16.2-42.2s26.1-23.4 42.2-16.2c20.9 9.3 55.3 18.5 75.2 21.6c31.9 4.7 58.2 2 76-5.3c16.9-6.9 24.6-16.9 26.8-28.9c1.9-10.6 .4-16.7-1.3-20.4c-1.9-4-5.6-8.4-13-13.3c-16.4-10.7-41.5-17.7-74-26.3l-2.8-.7s0 0 0 0C119.4 279.3 84.4 270 58.4 253c-14.2-9.3-27.5-22-35.8-39.6c-8.4-17.9-10.1-37.9-6.1-59.2C23.7 116 52.3 91.2 84.8 78.3c13.3-5.3 27.9-8.9 43.2-11L128 32c0-17.7 14.3-32 32-32z"/>',
  'fa-linux': '<path data-w="448" fill="currentColor" d="M220.8 123.3c1 .5 1.8 1.7 3 1.7 1.1 0 2.8-.4 2.9-1.5.2-1.4-1.9-2.3-3.2-2.9-1.7-.7-3.9-1-5.5-.1-.4.2-.8.7-.6 1.1.3 1.3 2.3 1.1 3.4 1.7zm-21.9 1.7c1.2 0 2-1.2 3-1.7 1.1-.6 3.1-.4 3.5-1.6.2-.4-.2-.9-.6-1.1-1.6-.9-3.8-.6-5.5.1-1.3.6-3.4 1.5-3.2 2.9.1 1 1.8 1.5 2.8 1.4zM420 403.8c-3.6-4-5.3-11.6-7.2-19.7-1.8-8.1-3.9-16.8-10.5-22.4-1.3-1.1-2.6-2.1-4-2.9-1.3-.8-2.7-1.5-4.1-2 9.2-27.3 5.6-54.5-3.7-79.1-11.4-30.1-31.3-56.4-46.5-74.4-17.1-21.5-33.7-41.9-33.4-72C311.1 85.4 315.7.1 234.8 0 132.4-.2 158 103.4 156.9 135.2c-1.7 23.4-6.4 41.8-22.5 64.7-18.9 22.5-45.5 58.8-58.1 96.7-6 17.9-8.8 36.1-6.2 53.3-6.5 5.8-11.4 14.7-16.6 20.2-4.2 4.3-10.3 5.9-17 8.3s-14 6-18.5 14.5c-2.1 3.9-2.8 8.1-2.8 12.4 0 3.9.6 7.9 1.2 11.8 1.2 8.1 2.5 15.7.8 20.8-5.2 14.4-5.9 24.4-2.2 31.7 3.8 7.3 11.4 10.5 20.1 12.3 17.3 3.6 40.8 2.7 59.3 12.5 19.8 10.4 39.9 14.1 55.9 10.4 11.6-2.6 21.1-9.6 25.9-20.2 12.5-.1 26.3-5.4 48.3-6.6 14.9-1.2 33.6 5.3 55.1 4.1.6 2.3 1.4 4.6 2.5 6.7v.1c8.3 16.7 23.8 24.3 40.3 23 16.6-1.3 34.1-11 48.3-27.9 13.6-16.4 36-23.2 50.9-32.2 7.4-4.5 13.4-10.1 13.9-18.3.4-8.2-4.4-17.3-15.5-29.7zM223.7 87.3c9.8-22.2 34.2-21.8 44-.4 6.5 14.2 3.6 30.9-4.3 40.4-1.6-.8-5.9-2.6-12.6-4.9 1.1-1.2 3.1-2.7 3.9-4.6 4.8-11.8-.2-27-9.1-27.3-7.3-.5-13.9 10.8-11.8 23-4.1-2-9.4-3.5-13-4.4-1-6.9-.3-14.6 2.9-21.8zM183 75.8c10.1 0 20.8 14.2 19.1 33.5-3.5 1-7.1 2.5-10.2 4.6 1.2-8.9-3.3-20.1-9.6-19.6-8.4.7-9.8 21.2-1.8 28.1 1 .8 1.9-.2-5.9 5.5-15.6-14.6-10.5-52.1 8.4-52.1zm-13.6 60.7c6.2-4.6 13.6-10 14.1-10.5 4.7-4.4 13.5-14.2 27.9-14.2 7.1 0 15.6 2.3 25.9 8.9 6.3 4.1 11.3 4.4 22.6 9.3 8.4 3.5 13.7 9.7 10.5 18.2-2.6 7.1-11 14.4-22.7 18.1-11.1 3.6-19.8 16-38.2 14.9-3.9-.2-7-1-9.6-2.1-8-3.5-12.2-10.4-20-15-8.6-4.8-13.2-10.4-14.7-15.3-1.4-4.9 0-9 4.2-12.3zm3.3 334c-2.7 35.1-43.9 34.4-75.3 18-29.9-15.8-68.6-6.5-76.5-21.9-2.4-4.7-2.4-12.7 2.6-26.4v-.2c2.4-7.6.6-16-.6-23.9-1.2-7.8-1.8-15 .9-20 3.5-6.7 8.5-9.1 14.8-11.3 10.3-3.7 11.8-3.4 19.6-9.9 5.5-5.7 9.5-12.9 14.3-18 5.1-5.5 10-8.1 17.7-6.9 8.1 1.2 15.1 6.8 21.9 16l19.6 35.6c9.5 19.9 43.1 48.4 41 68.9zm-1.4-25.9c-4.1-6.6-9.6-13.6-14.4-19.6 7.1 0 14.2-2.2 16.7-8.9 2.3-6.2 0-14.9-7.4-24.9-13.5-18.2-38.3-32.5-38.3-32.5-13.5-8.4-21.1-18.7-24.6-29.9s-3-23.3-.3-35.2c5.2-22.9 18.6-45.2 27.2-59.2 2.3-1.7.8 3.2-8.7 20.8-8.5 16.1-24.4 53.3-2.6 82.4.6-20.7 5.5-41.8 13.8-61.5 12-27.4 37.3-74.9 39.3-112.7 1.1.8 4.6 3.2 6.2 4.1 4.6 2.7 8.1 6.7 12.6 10.3 12.4 10 28.5 9.2 42.4 1.2 6.2-3.5 11.2-7.5 15.9-9 9.9-3.1 17.8-8.6 22.3-15 7.7 30.4 25.7 74.3 37.2 95.7 6.1 11.4 18.3 35.5 23.6 64.6 3.3-.1 7 .4 10.9 1.4 13.8-35.7-11.7-74.2-23.3-84.9-4.7-4.6-4.9-6.6-2.6-6.5 12.6 11.2 29.2 33.7 35.2 59 2.8 11.6 3.3 23.7.4 35.7 16.4 6.8 35.9 17.9 30.7 34.8-2.2-.1-3.2 0-4.2 0 3.2-10.1-3.9-17.6-22.8-26.1-19.6-8.6-36-8.6-38.3 12.5-12.1 4.2-18.3 14.7-21.4 27.3-2.8 11.2-3.6 24.7-4.4 39.9-.5 7.7-3.6 18-6.8 29-32.1 22.9-76.7 32.9-114.3 7.2zm257.4-11.5c-.9 16.8-41.2 19.9-63.2 46.5-13.2 15.7-29.4 24.4-43.6 25.5s-26.5-4.8-33.7-19.3c-4.7-11.1-2.4-23.1 1.1-36.3 3.7-14.2 9.2-28.8 9.9-40.6.8-15.2 1.7-28.5 4.2-38.7 2.6-10.3 6.6-17.2 13.7-21.1.3-.2.7-.3 1-.5.8 13.2 7.3 26.6 18.8 29.5 12.6 3.3 30.7-7.5 38.4-16.3 9-.3 15.7-.9 22.6 5.1 9.9 8.5 7.1 30.3 17.1 41.6 10.6 11.6 14 19.5 13.7 24.6zM173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"/>',
  'fa-windows': '<path data-w="448" fill="currentColor" d="M0 93.7l183.6-25.3v177.4H0V93.7zm0 324.6l183.6 25.3V268.4H0v149.9zm203.8 28L448 480V268.4H203.8v177.9zm0-380.6v180.1H448V32L203.8 65.7z"/>'
};

// Normalise an icon name: strip prefix junk, ensure fa- prefix, fall back to fa-gear.
function normIcon(raw) {
  var key = (raw || 'fa-gear').trim().split(/\s+/).pop();
  if (!key.startsWith('fa-')) key = 'fa-' + key;
  return SVG_ICONS[key] ? key : 'fa-gear';
}

// Extract the 'd' attribute value from an SVG path string like '<path d="M..." .../>'.
function extractPath(svgStr) {
  var m = svgStr.match(/\bd="([^"]+)"/);
  return m ? m[1] : '';
}

// Extract the viewBox width (data-w) of an icon; defaults to 512.
function extractWidth(svgStr) {
  var m = svgStr.match(/data-w="(\d+)"/);
  return m ? +m[1] : 512;
}

// Build an SVG <g> element containing the icon, scaled so its 512-unit height
// is `size` pixels, with its box top-left at (x, y).  Narrower/wider icons are
// centred horizontally within a `size`-wide box.
function iconGroup(iconName, x, y, size, fill) {
  var svgStr = SVG_ICONS[normIcon(iconName)];
  if (!svgStr) return null;
  var d = extractPath(svgStr);
  if (!d) return null;

  var scale = size / 512;
  var dx = (size - extractWidth(svgStr) * scale) / 2;
  var g = se('g');
  g.setAttribute('transform',
    'translate(' + (x + dx) + ',' + y + ') scale(' + scale + ')');

  var path = se('path');
  path.setAttribute('d', d);
  path.setAttribute('fill', fill || 'currentColor');
  g.appendChild(path);
  return g;
}

// Fill an HTML-embedded <svg> element with an icon (sets viewBox + path).
function setSvgIcon(svgEl, iconName, fill) {
  var svgStr = SVG_ICONS[normIcon(iconName)];
  var d = svgStr ? extractPath(svgStr) : '';
  if (!d) { svgEl.innerHTML = ''; return; }
  svgEl.setAttribute('viewBox', '0 0 ' + extractWidth(svgStr) + ' 512');
  svgEl.innerHTML = '<path d="' + d + '" fill="' + fill + '"/>';
}

// ── Theme ─────────────────────────────────────────────────────────────────────
var ROOT = document.documentElement;
var mq   = window.matchMedia('(prefers-color-scheme: light)');

function cv(name) {
  return getComputedStyle(ROOT).getPropertyValue(name).trim();
}

function applyTheme(light) {
  ROOT.setAttribute('data-theme', light ? 'light' : 'dark');
  if (lastData) render(lastData);
}

// ── Layout constants ──────────────────────────────────────────────────────────
var CARD_W    = 210;
var CARD_H    = 120;
var BANNER_H  = 30;
var H_GAP     = 40;   // horizontal gap between cards in same row
var V_GAP     = 80;   // vertical gap between rows
var PAD_X     = 60;
var PAD_Y     = 50;

// ── State ─────────────────────────────────────────────────────────────────────
var lastData    = null;
var dragging    = null;
var panStart    = null;
var xform       = { x: 0, y: 0, s: 1 };
// nodePos[id] = {x, y} — persists across fetches so drag positions are kept
var nodePos     = {};

var diagramSvg = document.getElementById('diagram');
var scene      = document.getElementById('scene');
var edgesL     = document.getElementById('edges-layer');
var nodesL     = document.getElementById('nodes-layer');
var errBanner  = document.getElementById('err');

applyTheme(mq.matches);
mq.addEventListener('change', function(e) {
  if (!ROOT.dataset.manual) applyTheme(e.matches);
});
document.getElementById('tog-track').addEventListener('click', function() {
  ROOT.dataset.manual = '1';
  applyTheme(ROOT.getAttribute('data-theme') === 'dark');
});
document.getElementById('refresh-btn').addEventListener('click', function() {
  manualRefresh();
});

// ── SVG namespace factory ─────────────────────────────────────────────────────
function se(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}
function attrs(el, map) {
  Object.keys(map).forEach(function(k) { el.setAttribute(k, map[k]); });
  return el;
}

// ── Clip text ─────────────────────────────────────────────────────────────────
function clip(s, max) {
  s = String(s || '');
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}
function pct(v) { return (+(v) * 100).toFixed(0); }

// ── Build node map from recursive JSON ───────────────────────────────────────
// Returns { nodes: {id: nodeObj}, edges: [{from,to}], ranks: [[id,…],…] }
function parseTopology(root) {
  var nodeMap = {};
  var edgeSet = {};
  var edges   = [];
  // rank = depth from root (BFS)
  var rankOf  = {};
  var queue   = [{ node: root, depth: 0 }];
  var visited = {};

  while (queue.length) {
    var item  = queue.shift();
    var node  = item.node;
    var depth = item.depth;
    var id    = nodeId(node);

    if (!nodeMap[id]) {
      nodeMap[id] = {
        id:       id,
        name:     node.name     || '?',
        color:    node.color    || '#3b82f6',
        icon:     node.icon     || 'fa-gear',
        tag:      node.tag      || '',
        tagColor: node.tag_color || '',
        tagIcon:  node.tag_icon  || '',
        address:  node.address  || '',
        qos:      node.qos      || null,
        status:   node.error    ? 'error' : 'ok',
        counter:  (node.counter !== undefined && node.counter !== null) ? node.counter : 0
      };
      rankOf[id] = depth;
    }

    if (!visited[id]) {
      visited[id] = true;
      (node.upstreams || []).forEach(function(u) {
        var uid  = nodeId(u);
        var ekey = id + '->' + uid;
        if (!edgeSet[ekey]) {
          edgeSet[ekey] = true;
          edges.push({ from: id, to: uid });
        }
        queue.push({ node: u, depth: depth + 1 });
      });
    }
  }

  // Build rank buckets
  var maxRank = 0;
  Object.keys(rankOf).forEach(function(id) {
    if (rankOf[id] > maxRank) maxRank = rankOf[id];
  });
  var ranks = [];
  for (var r = 0; r <= maxRank; r++) ranks.push([]);
  Object.keys(rankOf).forEach(function(id) { ranks[rankOf[id]].push(id); });

  return { nodes: nodeMap, edges: edges, ranks: ranks };
}

function nodeId(n) {
  return (n.name || '') + '|' + (n.address || '');
}

// ── Assign x,y positions via rank layout ─────────────────────────────────────
// Positions are stored in nodePos{} so drag offsets are preserved between refreshes.
function assignPositions(nodeMap, ranks) {
  var W = diagramSvg.clientWidth  || 900;
  ranks.forEach(function(row, depth) {
    var count = row.length;
    var totalW = count * CARD_W + (count - 1) * H_GAP;
    var startX = (W - totalW) / 2;
    row.forEach(function(id, i) {
      if (!nodePos[id]) {
        nodePos[id] = {
          x: startX + i * (CARD_W + H_GAP),
          y: PAD_Y  + depth * (CARD_H + V_GAP)
        };
      }
    });
  });
  // Clean up positions for nodes that no longer exist
  Object.keys(nodePos).forEach(function(id) {
    if (!nodeMap[id]) delete nodePos[id];
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(data) {
  var topo = parseTopology(data);
  assignPositions(topo.nodes, topo.ranks);

  var C = {
    edge:       cv('--edge'),
    nodeBg:     cv('--node-bg'),
    nodeBorder: cv('--node-border'),
    nodeAddr:   cv('--node-addr'),
    nodeDim:    cv('--node-dim'),
    nodeQos:    cv('--node-qos'),
    nodeQdiv:   cv('--node-qdiv')
  };

  // Update marker dot colour
  var md = document.getElementById('marker-dot');
  if (md) md.setAttribute('fill', C.edge);

  // Edges
  edgesL.innerHTML = '';
  topo.edges.forEach(function(e) {
    var fp = nodePos[e.from], tp = nodePos[e.to];
    if (!fp || !tp) return;
    var x1 = fp.x + CARD_W / 2, y1 = fp.y + CARD_H;
    var x2 = tp.x + CARD_W / 2, y2 = tp.y - 2;
    var cy  = (y2 - y1) * 0.45;
    var p   = se('path');
    attrs(p, {
      d:             'M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + (y1+cy) + ', ' + x2 + ' ' + (y2-cy) + ', ' + x2 + ' ' + y2,
      stroke:        C.edge,
      'stroke-width': '1.5',
      fill:          'none',
      'marker-end':  'url(#dot-end)'
    });
    edgesL.appendChild(p);
  });

  // Topology nodes — full rebuild every time
  nodesL.innerHTML = '';
  Object.keys(topo.nodes).forEach(function(id) {
    var node = topo.nodes[id];
    var pos  = nodePos[id];
    if (!pos) return;
    var g = buildCard(node, pos.x, pos.y, C, id);
    nodesL.appendChild(g);
  });
}

// ── Build a topology node card ────────────────────────────────────────────────
function buildCard(node, x, y, C, id) {
  var g = se('g');
  g.setAttribute('transform', 'translate(' + x + ',' + y + ')');
  g.setAttribute('data-nid', id);
  g.style.cursor = 'grab';

  // Body
  var body = se('rect');
  attrs(body, { x:0, y:0, width:CARD_W, height:CARD_H, rx:8, ry:8, fill:C.nodeBg });
  g.appendChild(body);

  // Banner (top rounded + square-off bottom corners)
  var ban = se('rect');
  attrs(ban, { x:0, y:0, width:CARD_W, height:BANNER_H, rx:8, ry:8, fill:node.color });
  g.appendChild(ban);

  var banSq = se('rect');
  attrs(banSq, { x:0, y:Math.floor(BANNER_H/2), width:CARD_W, height:Math.ceil(BANNER_H/2), fill:node.color });
  g.appendChild(banSq);

  // Border — red if error, normal otherwise
  var borderColor = node.status === 'error' ? '#f87171' : C.nodeBorder;
  var borderWidth = node.status === 'error' ? '2' : '1';
  var bord = se('rect');
  attrs(bord, {
    x: 0.5, y: 0.5,
    width: CARD_W - 1, height: CARD_H - 1,
    rx: 7.5, ry: 7.5,
    fill: 'none',
    stroke: borderColor,
    'stroke-width': borderWidth
  });
  g.appendChild(bord);

  // Icon in banner (top-left)
  var icoG = iconGroup(node.icon, 10, 8, 14, 'rgba(255,255,255,0.9)');
  if (icoG) g.appendChild(icoG);

  // Name
  var nm = se('text');
  attrs(nm, { x:30, y:BANNER_H-8,
    'font-family':'-apple-system,"Segoe UI",Arial,sans-serif',
    'font-size':'12', 'font-weight':'700',
    fill:'rgba(255,255,255,0.93)',
    'text-anchor':'start' });
  nm.textContent = clip(node.name, 22);
  g.appendChild(nm);

  // Address
  var adr = se('text');
  attrs(adr, { x:10, y:BANNER_H+16,
    'font-family':'"SFMono-Regular",Consolas,"Courier New",monospace',
    'font-size':'10', fill:C.nodeAddr, 'text-anchor':'start' });
  adr.textContent = clip(node.address, 30);
  g.appendChild(adr);

  // Status dot
  var ok  = node.status !== 'error';
  var dot = se('circle');
  attrs(dot, { cx:13, cy:BANNER_H+30, r:'3.5', fill: ok ? '#4ade80' : '#f87171' });
  g.appendChild(dot);

  // Status label
  var stl = se('text');
  attrs(stl, { x:22, y:BANNER_H+34,
    'font-family':'-apple-system,"Segoe UI",Arial,sans-serif',
    'font-size':'10', fill: ok ? C.nodeDim : '#f87171', 'text-anchor':'start' });
  stl.textContent = ok ? 'healthy' : '\u2715 unreachable';
  g.appendChild(stl);

  // QoS divider + lines
  if (node.qos) {
    var div = se('line');
    attrs(div, { x1:8, y1:BANNER_H+46, x2:CARD_W-8, y2:BANNER_H+46,
                 stroke:C.nodeQdiv, 'stroke-width':'0.5' });
    g.appendChild(div);

    var q1 = se('text');
    attrs(q1, { x:10, y:BANNER_H+60,
      'font-family':'"SFMono-Regular",Consolas,"Courier New",monospace',
      'font-size':'9', fill:C.nodeQos });
    q1.textContent = 'latency ' + node.qos.latency_ms + 'ms \u00b7 jitter ' + node.qos.jitter_ms + 'ms';
    g.appendChild(q1);

    var q2 = se('text');
    attrs(q2, { x:10, y:BANNER_H+74,
      'font-family':'"SFMono-Regular",Consolas,"Courier New",monospace',
      'font-size':'9', fill:C.nodeQos });
    q2.textContent = 'fail ' + pct(node.qos.failure_rate) + '% \u00b7 err ' + pct(node.qos.error_rate) + '%';
    g.appendChild(q2);
  }

  // Counter box — top-right, 8px margin from card edges, only when counter > 0.
  // Box: 50×50px square, light-grey fill, node-colour border, number centred.
  // Font size scales: 1-2 digits=28, 3 digits=20, 4+ digits=15.
  if (node.counter > 0) {
    var CBM  = 8;                    // margin from card edges
    var CBS  = 50;                   // box side length
    var CBX  = CARD_W - CBM - CBS;   // left edge of box
    var CBY  = CBM;                  // top edge of box
    var CCX  = CBX + CBS / 2;        // centre x
    var CCY  = CBY + CBS / 2;        // centre y

    var cbBg = se('rect');
    attrs(cbBg, { x: CBX, y: CBY, width: CBS, height: CBS, rx: 7, ry: 7,
                  fill: '#e5e7eb', stroke: node.color, 'stroke-width': '1.5' });
    g.appendChild(cbBg);

    var cStr  = String(node.counter);
    var cSize = cStr.length <= 2 ? 28 : cStr.length === 3 ? 20 : 15;
    var cbNum = se('text');
    attrs(cbNum, {
      x: CCX, y: CCY,
      'font-family': "-apple-system,'Segoe UI',system-ui,sans-serif",
      'font-size': String(cSize), 'font-weight': '900',
      fill: '#1f2937',
      'text-anchor': 'middle', 'dominant-baseline': 'central'
    });
    cbNum.textContent = cStr;
    g.appendChild(cbNum);
  }

  // Tag — bottom-right: icon + label, right-edge aligned, only when tag is set
  if (node.tag) {
    var tCol  = node.tagColor || node.color;
    var tIcon = node.tagIcon  || 'fa-circle';
    var tX    = CARD_W - 8;    // right edge with 8px inset
    var tY    = CARD_H - 10;   // bottom edge with 10px inset

    if (normIcon(tIcon) === 'fa-circle') {
      // Default: filled circle drawn as SVG <circle> so it scales cleanly
      var tDot = se('circle');
      attrs(tDot, { cx: tX - 26, cy: tY - 3, r: '4', fill: tCol });
      g.appendChild(tDot);
    } else {
      var tIcoG = iconGroup(tIcon, tX - 28, tY - 10, 10, tCol);
      if (tIcoG) g.appendChild(tIcoG);
    }

    var tLbl = se('text');
    attrs(tLbl, {
      x: tX, y: tY,
      'font-family': '"SFMono-Regular",Consolas,"Courier New",monospace',
      'font-size': '10', 'font-weight': '700',
      fill: tCol, 'text-anchor': 'end'
    });
    tLbl.textContent = node.tag;
    g.appendChild(tLbl);
  }

  // Drag
  g.addEventListener('mousedown', function(ev) {
    ev.stopPropagation();
    dragging = { id: id, sx: ev.clientX, sy: ev.clientY,
                 ox: nodePos[id].x, oy: nodePos[id].y };
  });

  return g;
}

// ── Collect quotes from topology tree ────────────────────────────────────────
function collectQuotes(node) {
  var out = [];
  function walk(n) {
    if (n.quote) out.push({ text: n.quote, src: n.name || '' });
    (n.upstreams || []).forEach(walk);
  }
  walk(node);
  return out;
}

// ── WebApp node ───────────────────────────────────────────────────────────────

// Collect all {name, icon} product entries from the topology tree.
function collectProducts(node) {
  var out = [];
  function walk(n) {
    if (n.product) out.push({ name: n.product, icon: n.product_icon || 'fa-gear' });
    (n.upstreams || []).forEach(walk);
  }
  walk(node);
  return out;
}

// Returns true if at least one node in the tree has a quote, product, or counter.
function shouldShowWebapp(node) {
  function walk(n) {
    if (n.quote)   return true;
    if (n.product) return true;
    if (n.counter !== undefined && n.counter !== null) return true;
    return (n.upstreams || []).some(walk);
  }
  return walk(node);
}

function hasCounterNode(node) {
  function walk(n) {
    if (n.counter !== undefined && n.counter !== null) return true;
    return (n.upstreams || []).some(walk);
  }
  return walk(node);
}

// Cached root address for the Buy button.
var waRootAddress = '';

// Update the webapp node content from the latest topology data and show/hide it.
function updateWebappNode(data) {
  var node = document.getElementById('webapp-node');
  var footer = document.getElementById('wa-footer');
  if (!node || !footer) return;

  if (!shouldShowWebapp(data)) {
    node.classList.remove('visible');
    return;
  }

  // ── Product ──────────────────────────────────────────────────────
  var products = collectProducts(data);
  var prod = products.length
    ? products[Math.floor(Math.random() * products.length)]
    : { name: 'Company Product', icon: 'fa-gear' };

  // Product icon — fill the <svg> element in the HTML overlay
  setSvgIcon(document.getElementById('wa-product-icon'), prod.icon, '#f59e0b');

  document.getElementById('wa-product-name').textContent = prod.name;
  document.getElementById('wa-title').textContent = data.name || 'Microservices App';

  var quotes = collectQuotes(data);
  var descText = 'No product description.';
  if (quotes.length) {
    var q = quotes[Math.floor(Math.random() * quotes.length)];
    descText = q.text;
  }
  document.getElementById('wa-desc-text').textContent = descText;

  // Buy button icon (dollar sign)
  setSvgIcon(document.getElementById('wa-btn-icon'), 'fa-dollar-sign', '#ffffff');

  // ── Buy button → POST /count/add on root node ────────────────────
  var canBuy = hasCounterNode(data);
  footer.style.display = canBuy ? 'flex' : 'none';
  waRootAddress = canBuy ? (data.address || '') : '';
  // (listener is wired once below; it reads waRootAddress at click time)

  node.classList.add('visible');
}

// Wire the Buy button once — reads waRootAddress at click time.
document.getElementById('wa-btn').addEventListener('click', function() {
  if (!waRootAddress) return;
  fetch('/count/add', { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function() {
      manualRefresh();
      var btnText = document.getElementById('wa-btn-text');
      var prev = btnText.textContent;
      btnText.textContent = 'Done!';
      setTimeout(function() { btnText.textContent = prev; }, 1000);
    })
    .catch(function() {/* silent — network errors don't break the UI */});
});

// ── Fetch & render cycle ──────────────────────────────────────────────────────
// Convert a #rrggbb hex colour to rgba(r,g,b,a) string.
function hexToRgba(hex, alpha) {
  var h = hex.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  var r = parseInt(h.slice(0,2), 16);
  var g = parseInt(h.slice(2,4), 16);
  var b = parseInt(h.slice(4,6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function fetchAndRender() {
  document.getElementById('ts').textContent = '\u2026';
  fetch('/')
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      lastData = data;
      render(data);
      updateWebappNode(data);
      // Tint the statusbar to match the root node's banner colour
      var rootColor = (data && data.color) ? data.color : '';
      document.getElementById('statusbar').style.background = rootColor || '#1a1d27';
      document.getElementById('ts').textContent = new Date().toLocaleTimeString();
      errBanner.style.display = 'none';
    })
    .catch(function(e) {
      errBanner.textContent   = 'Failed to fetch topology: ' + e.message;
      errBanner.style.display = 'block';
    })
    .finally(function() {
      scheduleRefresh();
    });
}

// ── Auto-refresh ──────────────────────────────────────────────────────────────
var refreshTimer = null;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(fetchAndRender, REFRESH_SECS * 1000);
}
function manualRefresh() {
  clearTimeout(refreshTimer);
  fetchAndRender();
}

// ── Drag / pan / zoom ─────────────────────────────────────────────────────────
diagramSvg.addEventListener('mousedown', function(e) {
  var nid = e.target && e.target.parentNode && e.target.parentNode.getAttribute('data-nid');
  if (!nid) {
    // Check deeper — click may land on a child of <g data-nid>
    var el = e.target;
    while (el && el !== diagramSvg) {
      nid = el.getAttribute && el.getAttribute('data-nid');
      if (nid) break;
      el = el.parentNode;
    }
  }
  if (nid) return; // let node's own mousedown fire
  panStart = { x: e.clientX, y: e.clientY, tx: xform.x, ty: xform.y };
});

diagramSvg.addEventListener('mousemove', function(e) {
  if (dragging) {
    var id = dragging.id;
    nodePos[id].x = dragging.ox + (e.clientX - dragging.sx) / xform.s;
    nodePos[id].y = dragging.oy + (e.clientY - dragging.sy) / xform.s;
    nodePos[id].dragged = true;
    if (lastData) render(lastData);
    return;
  }
  if (panStart) {
    xform.x = panStart.tx + (e.clientX - panStart.x);
    xform.y = panStart.ty + (e.clientY - panStart.y);
    applyXform();
  }
});

diagramSvg.addEventListener('mouseup',    function() { dragging = null; panStart = null; });
diagramSvg.addEventListener('mouseleave', function() { dragging = null; panStart = null; });

diagramSvg.addEventListener('wheel', function(e) {
  e.preventDefault();
  xform.s = Math.min(4, Math.max(0.15, xform.s * (e.deltaY > 0 ? 0.9 : 1.1)));
  applyXform();
}, { passive: false });

function applyXform() {
  scene.setAttribute('transform',
    'translate(' + xform.x + ',' + xform.y + ') scale(' + xform.s + ')');
}

// ── Resize — re-centre rows for nodes the user has not dragged ───────────────
var resizePending = false;
window.addEventListener('resize', function() {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(function() {
    resizePending = false;
    Object.keys(nodePos).forEach(function(id) {
      if (!nodePos[id].dragged) delete nodePos[id];
    });
    if (lastData) render(lastData);
  });
});

// ── Boot — defer until browser has painted the SVG so clientWidth > 0 ────────
setTimeout(fetchAndRender, 50);
