import { escapeHtml as e } from './domain';
import { icon } from './icons';
import type { RenderJob } from './remote';
import { clamp, constrainView, pinchScale } from './preview-state';

export function previewPage(job: RenderJob) {
  return `<section class="preview-page"><div class="preview-heading"><a class="inline-button" href="#history">${icon('back', 18)} My looks</a><span class="eyebrow">THE FITTING ROOM</span></div><div class="preview-title"><div><h1>Your look, <em>up close.</em></h1><p>${e(job.name)}</p></div><span class="preview-type">${icon('layers', 15)} Single-view preview</span></div><div class="fitting-layout"><div class="fitting-viewer"><div class="preview-tabs" role="group" aria-label="Preview image"><button data-viewer-image="result" aria-pressed="true">Your look</button><button data-viewer-image="original" aria-pressed="false">Original photo</button></div><div class="viewer-toolbar"><div class="viewer-mode" role="group" aria-label="Viewing mode"><button data-viewer-mode="detail" aria-pressed="true">Detail</button><button data-viewer-mode="perspective" aria-pressed="false">Perspective</button></div><div class="zoom-controls"><button data-viewer-action="out" aria-label="Zoom out">${icon('minus', 18)}</button><output class="zoom-value" aria-live="polite">100%</output><button data-viewer-action="in" aria-label="Zoom in">${icon('plus', 18)}</button><button data-viewer-action="reset" aria-label="Reset preview" title="Reset preview">${icon('rotate', 18)}</button></div></div><div class="preview-stage" tabindex="0" role="region" aria-label="Interactive outfit image" aria-describedby="viewer-help"><img class="preview-image" src="${e(job.resultUrl!)}" alt="Generated outfit preview for ${e(job.name)}" draggable="false"/><span class="preview-load" role="status">Loading your look…</span><span class="preview-corner">PRESEW / FITTING ROOM</span></div><p class="viewer-help" id="viewer-help">Drag to explore when zoomed. Pinch or use + / − to zoom. Arrow keys move the view.</p><p class="viewer-error" role="alert" hidden>We couldn’t load this image. Reconnect or sign in again, then reopen your look.</p></div><aside class="fitting-details"><span class="eyebrow">YOUR OUTFIT, CONSIDERED</span><h2>The details<br>make <em>the difference.</em></h2><p>Take a closer look at your fabric, the silhouette, and the finishing touches.</p><div class="fitting-references"><figure><img src="${e(job.fabricUrl)}" alt="Fabric used for this look"/><figcaption>Your fabric</figcaption></figure><figure><img src="${e(job.styleUrl)}" alt="Style reference for this look"/><figcaption>Your style</figcaption></figure></div><button class="button primary full-width" data-action="download-render" data-id="${e(job.id)}">${icon('download', 18)} Download your look</button><a class="button secondary full-width" href="#create/0">Create another look ${icon('arrow', 18)}</a><button class="button danger full-width" data-action="delete-remote-job" data-id="${e(job.id)}">${icon('trash', 17)} Delete this try-on</button><div class="preview-note"><strong>A closer look, from the front.</strong><p>Perspective gently tilts this image. Side and back views aren’t available for this preview.</p></div><p class="small-copy">AI preview. Compare it with your original photo and confirm fit and construction with your tailor.</p></aside></div></section>`;
}

export function mountPreview(root: HTMLElement, job: RenderJob) {
  const stage = root.querySelector<HTMLElement>('.preview-stage')!;
  const image = root.querySelector<HTMLImageElement>('.preview-image')!;
  const output = root.querySelector<HTMLOutputElement>('.zoom-value')!;
  const help = root.querySelector<HTMLElement>('#viewer-help')!;
  const loader = root.querySelector<HTMLElement>('.preview-load')!;
  const error = root.querySelector<HTMLElement>('.viewer-error')!;
  const events = new AbortController();
  const pointers = new Map<number, { x: number; y: number }>();
  let scale = 1, x = 0, y = 0, rotateX = 0, rotateY = 0;
  let perspective = false, baseDistance = 0, baseScale = 1;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const draw = () => {
    const state = constrainView(scale, x, y, image.offsetWidth, image.offsetHeight, stage.clientWidth, stage.clientHeight);
    ({ scale, x, y } = state);
    image.style.transform = `perspective(1400px) translate3d(${x}px,${y}px,0) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
    output.value = `${Math.round(scale * 100)}%`;
    stage.classList.toggle('is-zoomed', scale > 1);
    root.querySelector<HTMLButtonElement>('[data-viewer-action="out"]')!.disabled = scale <= 1;
    root.querySelector<HTMLButtonElement>('[data-viewer-action="in"]')!.disabled = scale >= 4;
  };
  const reset = () => { scale = 1; x = y = rotateX = rotateY = 0; draw(); };
  const distance = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const on = (target: EventTarget, name: string, fn: EventListener, options: AddEventListenerOptions = {}) => target.addEventListener(name, fn, { ...options, signal: events.signal });
  on(stage, 'pointerdown', ((event: PointerEvent) => {
    if (event.button !== 0) return;
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) { baseDistance = distance(); baseScale = scale; }
    stage.classList.add('is-dragging');
  }) as EventListener);
  on(stage, 'pointermove', ((event: PointerEvent) => {
    const previous = pointers.get(event.pointerId);
    if (previous) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) scale = pinchScale(baseScale, baseDistance, distance());
      else if (scale > 1) { x += event.clientX - previous.x; y += event.clientY - previous.y; }
      else if (perspective) { rotateY = clamp(rotateY + (event.clientX - previous.x) * .12, -14, 14); rotateX = clamp(rotateX - (event.clientY - previous.y) * .12, -10, 10); }
    } else if (perspective && event.pointerType === 'mouse' && !reducedMotion.matches) {
      const rect = stage.getBoundingClientRect();
      rotateY = clamp(((event.clientX - rect.left) / rect.width - .5) * 24, -12, 12);
      rotateX = clamp(-((event.clientY - rect.top) / rect.height - .5) * 16, -8, 8);
    } else return;
    draw();
  }) as EventListener);
  const release = ((event: PointerEvent) => { pointers.delete(event.pointerId); if (!pointers.size) stage.classList.remove('is-dragging'); }) as EventListener;
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) on(stage, name, release);
  on(stage, 'pointerleave', () => { if (!pointers.size && perspective) { rotateX = rotateY = 0; draw(); } });
  on(stage, 'dblclick', () => { scale = scale > 1 ? 1 : 2; draw(); });
  on(stage, 'wheel', ((event: WheelEvent) => {
    // Ordinary scrolling continues down the page; Ctrl/trackpad pinch zooms the image.
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault(); scale *= Math.exp(-event.deltaY * .01); draw();
  }) as EventListener, { passive: false });
  on(stage, 'keydown', ((event: KeyboardEvent) => {
    if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
    if (event.key === '+' || event.key === '=') scale += .25;
    else if (event.key === '-') scale -= .25;
    else if (event.key === '0') return reset();
    else if (scale > 1) { x += event.key === 'ArrowLeft' ? 35 : event.key === 'ArrowRight' ? -35 : 0; y += event.key === 'ArrowUp' ? 35 : event.key === 'ArrowDown' ? -35 : 0; }
    else if (perspective) { rotateY = clamp(rotateY + (event.key === 'ArrowLeft' ? -3 : event.key === 'ArrowRight' ? 3 : 0), -14, 14); rotateX = clamp(rotateX + (event.key === 'ArrowUp' ? 3 : event.key === 'ArrowDown' ? -3 : 0), -10, 10); }
    draw();
  }) as EventListener);
  on(root, 'click', ((event: MouseEvent) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button'); if (!button) return;
    const action = button.dataset.viewerAction;
    if (action === 'in') scale += .25;
    if (action === 'out') scale -= .25;
    if (action === 'reset') reset();
    if (button.dataset.viewerMode) {
      perspective = button.dataset.viewerMode === 'perspective'; rotateX = rotateY = 0;
      root.querySelectorAll<HTMLButtonElement>('[data-viewer-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      help.textContent = perspective ? 'Move your cursor or swipe to tilt. Pinch or use + / − to zoom. This is a single image.' : 'Drag to explore when zoomed. Pinch or use + / − to zoom. Arrow keys move the view.';
    }
    if (button.dataset.viewerImage) {
      const original = button.dataset.viewerImage === 'original';
      loader.hidden = false; error.hidden = true;
      image.src = original ? job.originalUrl : job.resultUrl!;
      image.alt = original ? 'Your original unchanged photo' : `Generated outfit preview for ${job.name}`;
      root.querySelectorAll<HTMLButtonElement>('[data-viewer-image]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      reset();
    }
    if (action || button.dataset.viewerMode) draw();
  }) as EventListener);
  on(image, 'load', () => { loader.hidden = true; error.hidden = true; draw(); });
  on(image, 'error', () => { loader.hidden = true; error.hidden = false; });
  on(reducedMotion, 'change', () => { rotateX = rotateY = 0; draw(); });
  const observer = new ResizeObserver(draw); observer.observe(stage);
  if (image.complete) { loader.hidden = true; error.hidden = image.naturalWidth > 0; }
  draw();
  return () => { events.abort(); observer.disconnect(); pointers.clear(); };
}
