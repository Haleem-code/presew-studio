import { initialData, refreshCatalog, heroImage } from './catalog';
import { api, getStudio, putStudio, signIn, jobLabels, type Account, type ServerStatus, type RenderJob } from './remote';
import { loadData, saveData } from './db';
import { icon } from './icons';
import { mountPreview, previewPage } from './preview';
import { deleteAsset, displayMeasurement, draftErrors, emptyDraft, escapeHtml as e, measurementFields, parseMeasurements, snapshotLook, toCm, validateImage, type Asset, type AssetKind, type Look, type Profile, type StudioData, type Unit } from './domain';

let data = initialData();
let ready = false;
let storageError = '';
let search = '';
let filter = 'All';
let toastTimer: ReturnType<typeof setTimeout>;
let pendingImage = '';
let uploadKind: AssetKind = 'fabric';
let modalProfile: Profile | undefined;
let modalUnit: Unit = 'cm';
let measurementEdits = new Set<string>();
let mutationQueue = Promise.resolve();
let installPrompt: any;
let waitingWorker: ServiceWorker | null = null;
let applyingUpdate = false;
let installedThisSession = false;
const standaloneDisplay = window.matchMedia('(display-mode: standalone)');
const isInstalled = () => installedThisSession || standaloneDisplay.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
let account: Account | null = null;
let serverStatus: ServerStatus | null = null;
let cloudRevision = 0;
let remoteJobs: RenderJob[] = [];
let processingConsent = false;
let submittingRender = false;
let shownRemoteJob = '';
let sessionReady = false;
let sessionRefreshInFlight = false;
let pendingSignInMessage = '';
let disposePreview: (() => void) | undefined;
const app = document.querySelector<HTMLDivElement>('#app')!;
const sheet = document.querySelector<HTMLDialogElement>('#sheet')!;
const steps = ['Your photo', 'Your fabric', 'Your style', 'Review'];
const routes = [ ['studio', 'Studio', 'studio'], ['fabrics', 'Fabrics', 'fabric'], ['styles', 'Styles', 'style'], ['history', 'My looks', 'history'] ];
const route = () => location.hash.slice(1) || 'studio';
const isCreate = () => route().startsWith('create');
const isPreview = () => route().startsWith('preview/');
const step = () => Math.min(3, Math.max(0, Number(route().split('/')[1] || 0)));
const asset = (id: string) => data.assets.find(a => a.id === id);
const selected = (kind: AssetKind) => asset(data.draft[`${kind}Id`]);
const button = (label: string, action: string, glyph = '', cls = 'button primary') => `<button class="${cls}" data-action="${action}">${glyph ? icon(glyph, 18) : ''}<span>${label}</span></button>`;
function toast(message: string) {
  const el = document.querySelector<HTMLDivElement>('#toast')!;
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 4200);
}
function go(path: string) {
  if (route() === path) render();
  else location.hash = path;
}
async function update(change: (next: StudioData) => void) {
  const operation = mutationQueue.then(async () => {
    const next = structuredClone(data);
    change(next);
    if (account) {
      const saved = await putStudio(next, cloudRevision);
      data = saved.data; cloudRevision = saved.revision;
    } else { await saveData(next); data = next; }
  });
  mutationQueue = operation.catch(() => {});
  await operation;
}
function image(a: Asset, cls = '') {
  return `<img class="${cls}" src="${e(a.image)}" alt="${e(a.name)}" loading="lazy" referrerpolicy="no-referrer" />`;
}
function tag(text: string, cls = '') { return `<span class="tag ${cls}">${text}</span>`; }
function accountAvatar(large = false) {
  const initials = (account?.name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('') || 'P').toUpperCase();
  let photo = '';
  try { const url = new URL(account?.image || ''); if (url.protocol === 'https:') photo = url.href; } catch { /* Initials work without a profile photo. */ }
  return `<span class="account-avatar ${large ? 'account-avatar-large' : ''}"><span aria-hidden="true">${e(initials)}</span>${photo ? `<img src="${e(photo)}" alt="" referrerpolicy="no-referrer" data-account-photo />` : ''}</span>`;
}
function installCard() {
  return isInstalled() ? '' : `<section class="install-card"><span class="install-symbol">${icon('download', 24)}</span><div><h3>Your studio, one tap away.</h3><p>Keep PreSew on your home screen. No app store needed.</p></div>${button(installPrompt ? 'Install PreSew' : 'Add to home screen', 'install', 'plus', 'button secondary')}</section>`;
}
function showUpdateNotice() {
  if (!waitingWorker || document.querySelector('.update-card')) return;
  document.querySelector('#main')?.insertAdjacentHTML('afterbegin', `<div class="update-card" role="status"><div><strong>A fresh stitch for your studio.</strong><p>An update is ready. Finish your edits, then refresh.</p></div>${button('Refresh app', 'update-app', 'history', 'button secondary')}</div>`);
}
function installHelp() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  openSheet(`<span class="eyebrow">ALWAYS CLOSE TO HAND</span><h2 id="dialog-title">Your pocket studio.</h2><p class="dialog-description">Add PreSew to your home screen to open it like an app.</p><ol class="install-instructions">${ios ? '<li>Open PreSew in Safari.</li><li>Tap the Share button, then <strong>Add to Home Screen</strong> (you may need to scroll).</li><li>Keep <strong>Open as Web App</strong> enabled if shown, then tap <strong>Add</strong>.</li>' : '<li>Open your browser’s menu.</li><li>Choose <strong>Install PreSew</strong>, <strong>Install app</strong>, or <strong>Add to home screen</strong>, if available.</li><li>Confirm to keep your studio close.</li>'}</ol><p class="small-copy">Saved device drafts are available offline. Sign-in, cloud images and AI try-ons need an internet connection.</p>`);
}
function sectionTitle(title: string, label: string, target: string) {
  return `<div class="section-heading"><h2>${title}</h2><a href="#${target}">${label} ${icon('arrow', 16)}</a></div>`;
}
function empty(title: string, text: string, glyph = 'studio', action = '') {
  return `<div class="empty-state"><span class="empty-icon">${icon(glyph, 30)}</span><h3>${title}</h3><p>${text}</p>${action}</div>`;
}
function card(a: Asset, choose = false) {
  const chosen = selected(a.kind)?.id === a.id;
  return `<article class="asset-card ${a.kind} ${chosen && choose ? 'selected' : ''}">
    <button class="asset-image" data-action="${choose ? 'select' : 'detail'}" data-id="${a.id}" aria-label="${choose ? 'Select' : 'View'} ${e(a.name)}" ${choose ? `aria-pressed="${chosen}"` : ''}>${image(a)}${choose && chosen ? `<span class="selected-check">${icon('check', 16)}</span>` : ''}</button>
    <button class="heart ${a.favorite ? 'hearted' : ''}" data-action="favorite" data-id="${a.id}" aria-label="${a.favorite ? 'Unfavorite' : 'Favorite'} ${e(a.name)}" aria-pressed="${a.favorite}">${icon('heart', 18)}</button>
    <div class="asset-caption"><div><h3>${e(a.name)}</h3><p>${e(a.category)} ${a.source === 'upload' ? '· Yours' : '· Studio collection'}</p></div>${a.source === 'upload' ? '<span class="tiny-dot" title="Your upload"></span>' : ''}</div>
  </article>`;
}
function lookCard(look: Look) {
  return `<article class="look-card"><button class="look-collage" data-action="look" data-id="${look.id}">${image(look.style)}<span class="look-swatch">${image(look.fabric)}</span><span class="draft-label">Saved draft</span></button><div class="asset-caption"><div><h3>${e(look.name)}</h3><p>${new Date(look.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · Not generated yet</p></div><button class="icon-button ${look.favorite ? 'hearted' : ''}" data-action="look-favorite" data-id="${look.id}" aria-label="${look.favorite ? 'Unfavorite' : 'Favorite'} look" aria-pressed="${look.favorite}">${icon('heart', 18)}</button></div></article>`;
}
function shell(content: string) {
  const current = route();
  app.innerHTML = `<div class="workspace"><header class="topbar"><a class="wordmark" href="#studio" aria-label="PreSew home">presew<span class="brand-period">.</span></a><nav class="header-nav" aria-label="Main navigation">${routes.map(([key, label]) => `<a href="#${key}" ${current === key || key === 'history' && isPreview() ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav><div class="top-actions"><span class="local-indicator"><i></i> Saved on this device</span><button class="avatar" data-action="profiles" aria-label="Open measurement profiles">${icon('ruler', 20)}</button></div></header>
    <main id="main" tabindex="-1">${storageError ? `<div class="notice error" role="alert">${e(storageError)}</div>` : ''}${!navigator.onLine ? '<div class="notice">You’re offline. Your libraries and saved drafts are still here.</div>' : ''}${content}</main>
    <footer class="desktop-footer"><span>PreSew · See it before you sew it.</span><div><button data-action="privacy">Privacy</button><button data-action="about">About the studio</button></div></footer></div>
    <nav class="bottom-nav" aria-label="Mobile navigation">${routes.map(([key, label, glyph]) => `<a href="#${key}" class="${current === key || key === 'history' && isPreview() ? 'active' : ''}" ${current === key || key === 'history' && isPreview() ? 'aria-current="page"' : ''}>${icon(glyph, 22)}<span>${label}</span></a>`).join('')}</nav>`;
}
function studio() {
  const hasDraft = !!(data.draft.photoId || data.draft.fabricId || data.draft.styleId);
  return `<div class="welcome-line"><span>THE PERSONAL FASHION STUDIO</span><span>Imagined by you. Made for you.</span></div>
    <section class="editorial-hero"><div class="editorial-copy"><span class="eyebrow">BEFORE THE FIRST STITCH</span><h1>A little vision.<br><em>A look of<br>your own.</em></h1><p>See your fabric and favourite style on you.<br>Then bring your idea to life.</p>${button(account ? (hasDraft ? 'Continue your look' : 'Create your look') : 'Try your look', 'create', 'arrow')}<span class="hero-footnote">Your photo. Your fabric. Your style.</span></div><div class="editorial-image"><img src="${e(heroImage)}" alt="Colour block gown photographed by cottonbro studio" referrerpolicy="no-referrer" fetchpriority="high"/><div class="editorial-image-caption"><span>THE ART OF MAKING IT YOURS</span><span>01 / THE STUDIO</span></div><a class="photo-credit" href="https://www.pexels.com/photo/a-woman-in-long-dress-posing-for-a-photoshoot-9541934/" target="_blank" rel="noopener noreferrer">Photography: cottonbro studio / Pexels</a></div></section>
    <section class="how-it-works" aria-label="How PreSew works">${[['01', 'Start with you', 'Add a clear photo.', 'camera'], ['02', 'Make it yours', 'Choose your fabric and style.', 'style'], ['03', 'See the possibility', 'Preview it before you sew.', 'layers']].map(([number, title, copy, glyph]) => `<div><span class="process-number">${number}</span>${icon(glyph, 22)}<div><h3>${title}</h3><p>${copy}</p></div></div>`).join('')}</section>
    <section class="quick-links"><a href="#fabrics"><span class="quick-icon">${icon('fabric')}</span><div><h3>The fabric collection</h3><p>A print. A texture. A starting point.</p></div>${icon('arrow', 18)}</a><a href="#styles"><span class="quick-icon">${icon('style')}</span><div><h3>Find your silhouette</h3><p>Explore the edit or bring your own.</p></div>${icon('arrow', 18)}</a></section>
    ${account && remoteJobs.length ? `<section>${sectionTitle('Back to your looks', 'View all looks', 'history')}<div class="history-grid">${remoteJobs.slice(0, 3).map(remoteCard).join('')}</div></section>` : ''}
    <section>${sectionTitle('An eye for fabric', 'The collection', 'fabrics')}<div class="fabric-strip">${data.assets.filter(a => a.kind === 'fabric').slice(0, 6).map(a => card(a)).join('')}</div></section>
    <section>${sectionTitle('The silhouette edit', 'Explore styles', 'styles')}<div class="style-preview">${data.assets.filter(a => a.kind === 'style').slice(0, 4).map(a => card(a)).join('')}</div></section>
    ${account && data.looks.length ? `<section>${sectionTitle('Your saved ideas', 'My looks', 'history')}<div class="history-grid">${data.looks.slice(0, 3).map(lookCard).join('')}</div></section>` : ''}
    ${installCard()}`;
}
function library(kind: 'fabric' | 'style') {
  const isFabric = kind === 'fabric';
  const categories = isFabric ? ['All', 'Yours', 'Favorites', 'Print', 'Satin', 'Woven', 'Texture', 'Ankara', 'Adire', 'Aso oke', 'Lace'] : ['All', 'Yours', 'Favorites', 'Dresses', 'Tops', 'Two-piece', 'Traditional', 'Skirts'];
  const all = data.assets.filter(a => a.kind === kind);
  const items = all.filter(a => (filter === 'All' || (filter === 'Yours' ? a.source === 'upload' : filter === 'Favorites' ? a.favorite : a.category === filter)) && `${a.name} ${a.category}`.toLowerCase().includes(search.toLowerCase()));
  return `<div class="page-heading"><div><span class="eyebrow">YOUR CREATIVE LIBRARY</span><h1>${isFabric ? 'The fabric shelf' : 'Your style book'}<span class="heading-dot">.</span></h1><p>${isFabric ? 'Prints, textures, and possibilities. Keep your favourites close.' : 'Find your next silhouette. Or bring a design of your own.'}</p></div>${button(isFabric ? 'Add fabric' : 'Add style', `upload-${kind}`, 'plus')}</div>
    <div class="library-intro"><span>${icon(isFabric ? 'fabric' : 'style', 20)}</span><p>${isFabric ? 'Upload once, use it in every new look. Your fabrics live here.' : 'Upload a clear outfit photo and reuse it whenever inspiration strikes.'}</p></div>
    <div class="library-toolbar"><div class="filter-chips" aria-label="Filter ${kind}s">${categories.map(c => `<button data-filter="${c}" class="chip ${filter === c ? 'active' : ''}" aria-pressed="${filter === c}">${c}</button>`).join('')}</div><label class="search-field">${icon('search', 18)}<input id="library-search" type="search" placeholder="Search ${kind}s" value="${e(search)}" aria-label="Search ${kind}s" /></label></div>
    <div class="collection-meta"><span>${items.length} ${kind}${items.length !== 1 ? 's' : ''}</span><span>Collected with a little imagination</span></div>
    <div class="library-grid ${kind}-grid"><button class="upload-tile" data-action="upload-${kind}"><span>${icon('plus', 26)}</span><h3>Your next ${kind}</h3><p>${isFabric ? 'Add a fabric you love' : 'Bring your own inspiration'}</p><small>JPG or PNG · Under 10 MB</small></button>${items.map(a => card(a)).join('')}</div>
    ${!items.length ? empty('Room for a little inspiration', search ? 'Try another name or clear the search.' : `Add a ${kind}, or explore another collection.`, isFabric ? 'fabric' : 'style') : ''}
    <p class="collection-footnote">${icon('info', 15)} Real reference photography from Pexels. Open an item for its photographer and source.</p>`;
}
function history() {
  const looks = account ? data.looks.filter(l => (filter !== 'Favorites' || l.favorite) && l.name.toLowerCase().includes(search.toLowerCase())) : [];
  const jobs = account ? remoteJobs.filter(job => job.name.toLowerCase().includes(search.toLowerCase())) : [];
  const showJobs = filter === 'All' || filter === 'Try-ons';
  const showPlans = filter !== 'Try-ons';
  const jobSection = showJobs ? `<section class="remote-history"><div class="section-heading"><h2>Your try-ons</h2>${account ? `<button class="inline-button" data-action="refresh-jobs">Refresh ${icon('rotate', 15)}</button>` : ''}</div>${account ? jobs.length ? `<div class="history-grid">${jobs.map(remoteCard).join('')}</div>` : `<p class="small-copy">${search ? 'No try-ons match your search.' : 'Your finished previews will appear here, ready to explore.'}</p>` : `<div class="cloud-prompt"><p>Sign in to create try-ons and keep your looks on every device.</p>${button('Continue with Google', 'google-signin', 'google', 'button secondary')}</div>`}</section>` : '';
  const planSection = showPlans && account && (looks.length || filter !== 'All' || !jobs.length) ? `<section><div class="section-heading"><h2>${filter === 'Favorites' ? 'Your favourites' : 'Outfit plans'}</h2></div>${looks.length ? `<div class="history-grid">${looks.map(lookCard).join('')}</div>` : empty(filter === 'All' && !search ? 'Your next look starts here.' : 'A little space for inspiration.', search ? 'Try a different name.' : filter === 'Favorites' ? 'Tap the heart on a saved outfit plan to keep it here.' : 'Choose your photo, fabric and style. Save an idea or create your try-on.', 'style', button('Create your look', 'create', 'arrow'))}</section>` : '';
  return `<div class="page-heading"><div><span class="eyebrow">MADE BY YOUR IMAGINATION</span><h1>Your looks,<br><em>all together.</em></h1><p>${account ? 'Revisit a preview. Pick up an idea. Find your next favourite.' : 'Sign in to see your generated try-ons and saved outfits.'}</p></div>${button(account ? 'Create a look' : 'Try your look', 'create', 'plus')}</div><div class="library-toolbar"><div class="filter-chips" aria-label="Filter your looks">${['All', 'Try-ons', 'Outfit plans', 'Favorites'].map(item => `<button class="chip ${filter === item ? 'active' : ''}" data-filter="${item}" aria-pressed="${filter === item}">${item}</button>`).join('')}</div><label class="search-field">${icon('search', 18)}<input id="library-search" type="search" placeholder="Find a look" aria-label="Search history" value="${e(search)}" /></label></div>${jobSection}${planSection}`;
}
function selectionPanel(kind: AssetKind) {
  const items = data.assets.filter(a => a.kind === kind);
  const a = selected(kind);
  if (kind === 'photo') return `<div class="photo-step"><div class="photo-preview">${a ? image(a) : `<span class="photo-frame">${icon('camera', 44)}<span>Your photo goes here</span></span>`}<button class="button ${a ? 'secondary' : 'primary'}" data-action="upload-photo">${icon(a ? 'edit' : 'upload', 18)} ${a ? 'Change photo' : 'Upload a photo'}</button></div><div class="photo-guidance"><span class="eyebrow">LET’S START WITH YOU</span><h2>A good photo.<br>A better starting point.</h2><ul><li>${icon('check', 17)} One person, facing forward</li><li>${icon('check', 17)} Full outfit area visible, face uncovered</li><li>${icon('check', 17)} Good light and a simple background</li></ul><div class="notice subtle">${icon('info', 19)}<p>Your original photo stays untouched. Every new look starts from this photo.</p></div><label class="checkbox-line"><input type="checkbox" id="photo-consent" ${data.draft.consent ? 'checked' : ''}/><span>This is my photo, or I have the person’s permission to use it.</span></label></div></div>`;
  return `<div class="step-library-bar"><p>${kind === 'fabric' ? 'Pick from your shelf, or add something new.' : 'Pick from your style book, or upload an outfit reference.'}</p>${button(`Upload ${kind}`, `upload-${kind}`, 'upload', 'button secondary')}</div><div class="library-grid ${kind}-grid">${items.map(a => card(a, true)).join('')}</div>`;
}
function review() {
  const p = selected('photo'), f = selected('fabric'), s = selected('style');
  return `<div class="review-layout"><div><div class="review-board">${[['photo', p, 'Your photo'], ['fabric', f, 'Your fabric'], ['style', s, 'Your style']].map(([kind, item, label], i) => `<div class="review-item"><div class="review-image">${item ? image(item as Asset) : `<span class="empty-icon">${icon(kind === 'photo' ? 'camera' : kind === 'fabric' ? 'fabric' : 'style')}</span>`}</div><div><span class="eyebrow">${label}</span><h3>${item ? e((item as Asset).name) : 'Choose one'}</h3><button class="inline-button" data-action="step" data-step="${i}">Change ${icon('edit', 13)}</button></div></div>`).join('')}</div><label class="field-label" for="look-notes">A note for this look <span>optional</span></label><textarea id="look-notes" maxlength="2000" placeholder="A little longer at the hem? Sleeves for dancing? Keep the details here.">${e(data.draft.notes)}</textarea></div><aside class="review-aside"><span class="eyebrow">THE FINISHING TOUCHES</span><h2>Make it<br><em>your own.</em></h2><label class="field-label" for="profile-select">Measurements <span>optional</span></label><select id="profile-select"><option value="">Add them later</option>${data.profiles.map(p => `<option value="${p.id}" ${data.draft.profileId === p.id ? 'selected' : ''}>${e(p.name)}</option>`).join('')}</select><button class="inline-button" data-action="profiles">${icon('plus', 15)} Manage measurement profiles</button><p class="small-copy">Measurements travel with your sewing plan. They don’t control the AI image or guarantee fit.</p>${button('Save outfit plan', 'save-look', 'check')}</aside></div>`;
}
function create() {
  const current = step();
  return `<div class="create-heading"><a class="inline-button" href="#studio">${icon('back', 18)} Back to studio</a><span class="eyebrow">A LOOK THAT STARTS WITH YOU</span></div><div class="create-title"><h1>${['First, your photo.', 'Fall for a fabric.', 'Find your silhouette.', 'Your idea, together.'][current]}</h1><span>${current + 1} <small>/ 4</small></span></div><nav class="stepper" aria-label="Create a look progress">${steps.map((s, i) => `<button data-action="step" data-step="${i}" class="${i === current ? 'current' : ''} ${i < current ? 'complete' : ''}" ${i === current ? 'aria-current="step"' : ''}><span>${i < current ? icon('check', 13) : `0${i + 1}`}</span><b>${s}</b></button>`).join('')}</nav>${current === 3 ? review() : selectionPanel((['photo', 'fabric', 'style'] as const)[current])}<div class="flow-footer">${button(current ? 'Back' : 'Save & close', current ? 'previous' : 'close-flow', 'back', 'button text-button')}<p>${current === 3 ? 'Your original photo is always kept.' : 'A little closer to your next look.'}</p>${current < 3 ? `<button class="button primary" data-action="next" ${!selected((['photo', 'fabric', 'style'] as const)[current]) || (current === 0 && !data.draft.consent) ? 'disabled' : ''}>${current === 2 ? 'Review your look' : `Next: ${steps[current + 1].toLowerCase()}`} ${icon('arrow', 18)}</button>` : ''}</div>`;
}
function render() {
  if (!ready) return;
  disposePreview?.(); disposePreview = undefined;
  const current = route();

  if (!account && (isCreate() || isPreview())) {
    pendingSignInMessage = 'Please sign in first to try your look in the studio.';
    if (current !== 'studio') {
      go('studio');
      return;
    }
  }

  const previewJob = isPreview() ? remoteJobs.find(job => job.id === current.slice('preview/'.length) && job.resultUrl) : undefined;
  shell(isPreview() ? previewJob ? previewPage(previewJob) : empty('Your look is waiting.', account ? 'Open a completed try-on from My looks.' : 'Sign in to open your saved try-ons.', 'history', button(account ? 'Go to my looks' : 'Sign in', account ? 'open-history' : 'account', 'arrow')) : isCreate() ? create() : current === 'fabrics' ? library('fabric') : current === 'styles' ? library('style') : current === 'history' ? history() : studio());
  if (previewJob) disposePreview = mountPreview(app, previewJob);
  const indicator = document.querySelector('.local-indicator');
  if (indicator) indicator.innerHTML = `<i></i> ${account ? 'Account library' : 'Sign in to start'}`;
  document.querySelector('.top-actions')?.insertAdjacentHTML('beforeend', account ? `<button class="account-trigger" data-action="account" aria-label="Open account for ${e(account.name)}" aria-haspopup="dialog" title="Your account">${accountAvatar()}</button>` : `<button class="account-button" data-action="account" aria-haspopup="dialog">${icon('user', 17)} Sign in</button>`);
  document.querySelector('.avatar')?.setAttribute('title', 'Measurement profiles');
  if (!navigator.onLine) {
    const notice = document.querySelector('#main>.notice:not(.error)');
    if (notice) { notice.setAttribute('role', 'status'); notice.innerHTML = `${icon('offline', 20)}<p>${account ? 'You’re offline. Reconnect to save account changes, load cloud images, or create a try-on.' : 'You’re offline. Reconnect for catalog photos, sign-in and try-ons.'}</p>`; }
  }
  showUpdateNotice();
  const credits = document.querySelector('.collection-footnote'); if (credits) credits.innerHTML = `${icon('info', 15)} Real reference photography from Pexels. Open an item for its photographer and source.`;
  if (isCreate() && step() === 3) {
    const aside = document.querySelector('.review-aside')!;
    aside.querySelector('.notice')?.remove();
    aside.querySelector('[data-action="generation-info"]')?.remove();
    aside.querySelector('[data-action="save-look"]')?.classList.replace('primary', 'secondary');
    aside.insertAdjacentHTML('beforeend', `<div class="render-consent"><label class="checkbox-line"><input type="checkbox" id="render-consent" ${processingConsent ? 'checked' : ''}/><span>I agree to send these images to YouCam to create this preview. Its standard file retention is 30 days.</span></label></div><button class="button primary full-width" data-action="generate" ${submittingRender ? 'disabled' : ''}>${icon('layers', 18)} ${submittingRender ? 'Starting your try-on…' : 'Try it on'}</button><p class="small-copy">${account ? 'A new try-on uses AI credits. Your original photo is the starting image.' : 'Sign in with Google to create a real try-on and keep it in your history.'} AI previews may change details; compare with your original.</p>`);
  }
  if (isCreate() && step() === 0) {
    const photos = data.assets.filter(a => a.kind === 'photo');
    if (photos.length) document.querySelector('.photo-guidance')?.insertAdjacentHTML('beforeend', `<h3 class="saved-photos-title">Your saved photos</h3><div class="photo-choices">${photos.map(a => `<div><button data-action="select" data-id="${a.id}" aria-label="Choose ${e(a.name)}" aria-pressed="${selected('photo')?.id === a.id}">${image(a)}</button><button class="photo-manage" data-action="detail" data-id="${a.id}" aria-label="Manage ${e(a.name)}">Manage</button></div>`).join('')}</div>`);
  }
  document.title = `${isPreview() ? 'Your fitting room' : isCreate() ? 'Create a look' : current === 'history' ? 'My looks' : current.charAt(0).toUpperCase() + current.slice(1)} · PreSew`;

  if (pendingSignInMessage) {
    const msg = pendingSignInMessage;
    pendingSignInMessage = '';
    requireSignInDialog(msg);
  }
}
function openSheet(html: string) {
  shownRemoteJob = '';
  sheet.innerHTML = `<button class="dialog-close icon-button" data-action="close-sheet" aria-label="Close dialog">${icon('close')}</button>${html}`;
  if (!sheet.open) sheet.showModal();
}
function requireSignInDialog(message = 'Please sign in first to try your look and access the studio.') {
  openSheet(`
    <span class="eyebrow">SIGN IN REQUIRED</span>
    <h2 id="dialog-title">Please sign in first<span class="heading-dot">.</span></h2>
    <p class="dialog-description">${e(message)}</p>
    <div class="auth-gate-perks">
      <div class="perk-row">
        <span class="perk-icon">${icon('layers', 20)}</span>
        <div>
          <strong>Virtual fitting room</strong>
          <p>See your fabric and favourite style on your photo before sewing.</p>
        </div>
      </div>
      <div class="perk-row">
        <span class="perk-icon">${icon('camera', 20)}</span>
        <div>
          <strong>Private studio library</strong>
          <p>Keep your uploaded photos, fabrics, and silhouettes safely stored.</p>
        </div>
      </div>
      <div class="perk-row">
        <span class="perk-icon">${icon('ruler', 20)}</span>
        <div>
          <strong>Tailor-ready measurements</strong>
          <p>Save custom fit profiles to share with your dressmaker.</p>
        </div>
      </div>
    </div>
    ${button('Continue with Google', 'google-signin', 'google', 'button primary full-width')}
    ${!serverStatus?.googleSignIn ? '<p class="small-copy">Google sign-in is not configured on this server yet. Add Google credentials to sign in.</p>' : '<p class="small-copy">Sign in securely with Google. Your photos and measurements remain private to your account.</p>'}
  `);
}
function showUpload(kind: AssetKind) {
  uploadKind = kind;
  pendingImage = '';
  const categories = kind === 'fabric' ? ['Ankara', 'Adire', 'Aso oke', 'Lace', 'Satin', 'Other'] : kind === 'style' ? ['Dresses', 'Tops', 'Two-piece', 'Traditional', 'Skirts', 'Other'] : ['My photo', 'Client photo'];
  openSheet(`<span class="eyebrow">A NEW POSSIBILITY</span><h2 id="dialog-title">Add your ${kind}<span class="heading-dot">.</span></h2><p class="dialog-description">${kind === 'photo' ? 'A clear photo, with the person and outfit area visible.' : kind === 'fabric' ? 'Choose a flat, well-lit photo that shows the pattern clearly.' : 'Choose a clear photo of a finished outfit. Sketches are not supported yet.'}</p><form id="upload-form"><label class="upload-zone" id="upload-zone"><input type="file" id="image-file" accept="image/jpeg,image/png" required/><span id="upload-preview">${icon('upload', 28)}<strong>Choose a photo</strong><small>JPG or PNG · Under 10 MB</small></span></label><label class="field-label" for="asset-name">${kind === 'photo' ? 'Photo' : kind.charAt(0).toUpperCase() + kind.slice(1)} name</label><input id="asset-name" name="name" maxlength="80" placeholder="${kind === 'fabric' ? 'e.g. Mum’s golden Ankara' : kind === 'style' ? 'e.g. The birthday dress' : 'e.g. My front-facing photo'}" required/><label class="field-label" for="asset-category">${kind === 'photo' ? 'Whose photo?' : 'Category'}</label><select id="asset-category" name="category">${categories.map(c => `<option>${c}</option>`).join('')}</select><p class="form-error" id="upload-error" role="alert"></p><p class="small-copy">${account ? 'Saved privately in your account. Images are sent to YouCam only when you choose Try it on.' : 'Saved in this browser on this device. Sign in when you are ready to create a try-on.'}</p><button class="button primary full-width" type="submit">${icon('plus', 18)} Add ${kind}</button></form>`);
}
function detail(a: Asset) {
  openSheet(`<div class="detail-art ${a.kind}">${image(a)}</div><span class="eyebrow">${e(a.category)} · ${a.source === 'upload' ? 'YOUR COLLECTION' : 'STUDIO COLLECTION'}</span><h2 id="dialog-title">${e(a.name)}</h2><p class="dialog-description">${a.kind === 'fabric' ? 'A little texture. A whole new possibility. Use this fabric with any style in your next outfit plan.' : 'Keep this silhouette close. Pair it with a fabric from your shelf to start a new look.'}</p>${button(`Use this ${a.kind}`, 'use-asset', 'arrow', 'button primary full-width').replace('data-action="use-asset"', `data-action="use-asset" data-id="${a.id}"`)}${a.source === 'upload' ? `<button class="button danger full-width" data-action="delete-asset" data-id="${a.id}">${icon('trash', 17)} Remove from library</button><p class="small-copy">Saved history keeps its own copy. Delete a saved look separately to remove that copy.</p>` : '<p class="small-copy">Real photographic reference. Not a generated try-on.</p>'}`);
  if (a.attribution) sheet.insertAdjacentHTML('beforeend', `<p class="small-copy">Photo by ${e(a.attribution.author)} · <a class="credit-link" href="${e(a.attribution.url)}" target="_blank" rel="noopener noreferrer">View on Pexels</a></p>`);
}
function profiles() {
  openSheet(`<span class="eyebrow">THE DETAILS THAT MATTER</span><h2 id="dialog-title">Made to measure<span class="heading-dot">.</span></h2><p class="dialog-description">Save your measurements, or a client’s. Attach a profile when you’re ready to prepare a sewing plan.</p><div class="profile-list">${data.profiles.map(p => `<div class="profile-row"><span class="quick-icon">${icon('ruler', 20)}</span><div><h3>${e(p.name)}</h3><p>${Object.keys(p.values).length} measurements · Entered manually</p></div><button class="icon-button" data-action="edit-profile" data-id="${p.id}" aria-label="Edit ${e(p.name)}">${icon('edit', 18)}</button><button class="icon-button" data-action="delete-profile" data-id="${p.id}" aria-label="Delete ${e(p.name)}">${icon('trash', 18)}</button></div>`).join('') || '<p class="small-copy">No profiles yet. A measuring tape is a good place to start.</p>'}</div>${button('Add measurement profile', 'new-profile', 'plus', 'button primary full-width')}<div class="notice subtle"><p>Measurements support the sewing brief and future yardage estimates. The try-on image comes from your photo, not these numbers. Confirm measurements with your tailor.</p></div>`);
}
function profileForm(profile?: Profile) {
  modalProfile = profile;
  measurementEdits = new Set();
  modalUnit = data.unit;
  openSheet(`<span class="eyebrow">YOUR SEWING DETAILS</span><h2 id="dialog-title">${profile ? 'Edit measurements' : 'A perfect starting point'}</h2><form id="profile-form"><label class="field-label" for="profile-name">Profile name</label><input id="profile-name" name="name" maxlength="80" required placeholder="e.g. My measurements" value="${e(profile?.name || '')}"/><div class="measurement-heading"><h3>Measurements</h3><label class="unit-control">Units <select id="measurement-unit" aria-label="Measurement units"><option value="cm" ${modalUnit === 'cm' ? 'selected' : ''}>cm</option><option value="in" ${modalUnit === 'in' ? 'selected' : ''}>inches</option></select></label></div><div class="measurement-grid">${measurementFields.map(([key, label, help]) => `<label class="measurement-field"><span>${label}</span><div><input name="${key}" type="number" inputmode="decimal" step="any" min="0" value="${displayMeasurement(profile?.values[key], modalUnit)}" placeholder="—" aria-describedby="help-${key}"/><span class="unit-label">${modalUnit}</span></div><small id="help-${key}">${help}</small></label>`).join('')}</div><p class="form-error" id="profile-error" role="alert"></p><p class="small-copy">All measurements are optional. Add at least one to save. Use a relaxed measuring tape and confirm with your tailor.</p><button type="submit" class="button primary full-width">${icon('check', 18)} Save measurements</button></form>`);
}
function showLook(look: Look) {
  openSheet(`<span class="eyebrow">SAVED OUTFIT PLAN</span><h2 id="dialog-title">${e(look.name)}</h2><div class="saved-board">${[look.photo, look.fabric, look.style].map(a => `<div>${image(a)}<small>${a.kind === 'photo' ? 'Original photo' : a.kind === 'fabric' ? 'Fabric' : 'Style reference'}</small></div>`).join('')}</div><p class="small-copy">Saved ${new Date(look.createdAt).toLocaleString()}. This is an outfit plan; a try-on has not been generated.</p>${look.notes ? `<p class="look-notes">${e(look.notes)}</p>` : ''}${look.profile ? `<div class="notice subtle"><p>${icon('ruler', 16)} Measurements: ${e(look.profile.name)} · ${Object.keys(look.profile.values).length} saved values</p></div>` : ''}<div class="dialog-actions">${button('Use this combination', 'reuse-look', 'arrow').replace('data-action="reuse-look"', `data-action="reuse-look" data-id="${look.id}"`)}<button class="button secondary" data-action="export-look" data-id="${look.id}">${icon('download', 18)} Download plan</button></div><button class="button danger full-width" data-action="delete-look" data-id="${look.id}">${icon('trash', 17)} Delete this plan</button>`);
}
function exportLook(look: Look) {
  const rows = measurementFields.filter(([key]) => look.profile?.values[key] !== undefined).map(([key, label]) => `<tr><td>${label}</td><td>${displayMeasurement(look.profile!.values[key], 'cm')} cm</td></tr>`).join('');
  const content = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PreSew outfit plan</title><style>body{font:16px system-ui;max-width:800px;margin:40px auto;padding:24px;color:#241e24}h1{color:#682b50}section{display:flex;gap:20px}figure{margin:0;flex:1}img{width:100%;height:230px;object-fit:contain;background:#f4efe9}figcaption{margin-top:8px}table{border-collapse:collapse;width:100%}td{padding:10px;border-bottom:1px solid #ddd}small{color:#666}p{white-space:pre-wrap}@media print{body{margin:0}}</style></head><body><h1>PreSew · Outfit plan</h1><h2>${e(look.name)}</h2><small>${e(new Date(look.createdAt).toLocaleDateString())} · Draft, not a generated try-on</small><section>${awaitableImages(look)}</section>${look.notes ? `<h3>Design notes</h3><p>${e(look.notes)}</p>` : ''}${rows ? `<h3>Measurements · ${e(look.profile!.name)}</h3><table>${rows}</table><small>Entered manually. Confirm with your tailor.</small>` : '<p>Measurements have not been added.</p>'}<p>Preview not generated. Confirm fabric, measurements, construction details, and yardage with your tailor.</p><small>Open this file in a browser and choose Print → Save as PDF.</small></body></html>`;
  void makeExport(content, look);
}
function awaitableImages(look: Look) {
  return [look.photo, look.fabric, look.style].map(a => `<figure><img src="__ASSET_${a.kind}__" alt="${e(a.name)}"><figcaption>${e(a.name)}</figcaption></figure>`).join('');
}
async function makeExport(content: string, look: Look) {
  try {
    for (const a of [look.photo, look.fabric, look.style]) {
      const src = a.image.startsWith('data:') ? a.image : await blobDataUrl(await (await fetch(a.image)).blob());
      content = content.replace(`__ASSET_${a.kind}__`, e(src));
    }
    const url = URL.createObjectURL(new Blob([content], { type: 'text/html' }));
    const link = document.createElement('a'); link.href = url; link.download = `presew-plan-${look.id.slice(0, 8)}.html`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('Your outfit plan has been downloaded. Open it to print or save as PDF.');
  } catch { toast('Could not download the plan. Reconnect and try again.'); }
}
function blobDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read this image.')); reader.readAsDataURL(file); });
}

function remoteCard(job: RenderJob) {
  return `<article class="look-card"><button class="look-collage ${job.status === 'done' ? '' : 'job-pending'}" data-action="remote-job" data-id="${job.id}">${job.resultUrl ? `<img src="${e(job.resultUrl)}" alt="Generated preview for ${e(job.name)}" loading="lazy"/>` : `<span class="job-symbol">${icon(job.status === 'failed' || job.status === 'needs_review' ? 'info' : 'studio', 32)}</span>`}<span class="draft-label">${e(jobLabels[job.status] || job.status)}</span></button><div class="asset-caption"><div><h3>${e(job.name)}</h3><p>${new Date(job.createdAt).toLocaleDateString()} · AI try-on</p></div></div></article>`;
}
function accountDialog() {
  if (account) {
    openSheet(`<span class="eyebrow">YOUR FASHION STUDIO</span><h2 id="dialog-title">Hello, ${e(account.name.split(' ')[0])}<span class="heading-dot">.</span></h2><p class="dialog-description">${e(account.email)}<br>Your signed-in library and try-on history are stored in your account.</p>${button('Measurement profiles', 'profiles', 'ruler', 'button secondary full-width')}${button('Import this device’s library', 'import-device', 'upload', 'button secondary full-width')}<p class="small-copy">Importing copies your device’s uploaded photos, fabrics, styles, measurements and saved plans into your account. Existing account items are kept.</p>${button('Sign out', 'signout', 'back', 'button secondary full-width')}${button('Delete cloud studio data', 'delete-cloud', 'trash', 'button danger full-width')}`);
    sheet.insertAdjacentHTML('afterbegin', `<div class="account-identity">${accountAvatar(true)}<div><span class="eyebrow">YOUR PRESEW ACCOUNT</span><span>Made for your next idea.</span></div></div>`);
    if (!isInstalled()) sheet.insertAdjacentHTML('beforeend', `<div class="account-install">${button('Add PreSew to home screen', 'install', 'download', 'button secondary full-width')}</div>`);
    sheet.insertAdjacentHTML('beforeend', `<button class="inline-button account-privacy" data-action="privacy">${icon('info', 16)} Your data & privacy</button>`);
  } else {
    requireSignInDialog('Sign in with Google to access your studio library, create looks, and generate AI try-ons.');
  }
}
function remoteDetail(job: RenderJob) {
  openSheet(`<span class="eyebrow">${e(jobLabels[job.status] || job.status)}</span><h2 id="dialog-title">${e(job.name)}</h2>${job.resultUrl ? `<div class="result-comparison"><figure><img src="${e(job.originalUrl)}" alt="Your original unchanged photo"/><figcaption>Original</figcaption></figure><figure><img src="${e(job.resultUrl)}" alt="AI generated outfit preview"/><figcaption>AI try-on</figcaption></figure></div><p class="small-copy">Compare the face, body proportions and fabric with the originals before sharing. This is a visual preview, not a guarantee of physical fit.</p><button class="button primary full-width" data-action="download-render" data-id="${job.id}">${icon('download', 18)} Download preview</button>` : `<div class="job-progress">${icon(job.status === 'failed' || job.status === 'needs_review' ? 'info' : 'studio', 38)}<h3>${e(jobLabels[job.status] || job.status)}</h3><p>${job.error ? e(job.error) : 'You can leave this screen. Your server keeps the task running, and the result will appear in History.'}</p></div>${button('Refresh status', 'refresh-jobs', 'history', 'button secondary full-width')}`}`);
  shownRemoteJob = job.id;
  if (job.resultUrl) sheet.insertAdjacentHTML('beforeend', `<button class="button secondary full-width" data-action="open-preview" data-id="${e(job.id)}">${icon('expand', 18)} Open interactive preview</button>`);
}
async function refreshJobs() {
  if (!account) return;
  remoteJobs = await api<RenderJob[]>('/api/renders');
  const activeJob = sheet.open && shownRemoteJob ? remoteJobs.find(j => j.id === shownRemoteJob) : null;
  if (activeJob) remoteDetail(activeJob);
  if (route() === 'history' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) render();
}
async function generate() {
  await mutationQueue;
  if (!account) return accountDialog();
  const errors = draftErrors(data); if (errors.length) return toast(errors.join(' '));
  if (!processingConsent) return toast('Confirm permission to send these images to YouCam.');
  if (submittingRender) return;
  submittingRender = true; render();
  try {
    const fingerprint = [account.id, data.draft.photoId, data.draft.fabricId, data.draft.styleId].join(':');
    const stored = sessionStorage.getItem('presew-render-request');
    let request = stored ? JSON.parse(stored) : null;
    if (request?.fingerprint !== fingerprint) request = { fingerprint, id: crypto.randomUUID() };
    sessionStorage.setItem('presew-render-request', JSON.stringify(request));
    const job = await api<RenderJob>('/api/renders', { photo: selected('photo'), fabric: selected('fabric'), style: selected('style'), consent: true, notes: data.draft.notes }, 'POST', { 'Idempotency-Key': request.id });
    await refreshJobs(); sheet.close(); go('history'); remoteDetail(job);
    toast(job.status === 'done' ? 'Your saved preview is ready.' : 'Your try-on is in the queue.');
  } finally { submittingRender = false; render(); }
}
async function handleAction(action: string, el: HTMLElement) {
  const id = el.dataset.id || '';
  if (action === 'account') return accountDialog();
  if (action === 'open-history') return go('history');
  if (action === 'open-preview') {
    if (!account) return requireSignInDialog('Please sign in first to open previews.');
    sheet.close(); return go(`preview/${id}`);
  }
  if (action === 'google-signin') { if (!navigator.onLine) return toast('Reconnect to sign in with Google.'); return signIn(); }
  if (action === 'update-app' && waitingWorker) {
    if (submittingRender || sheet.open) return toast('Finish your current edit before refreshing.');
    await mutationQueue;
    applyingUpdate = true; waitingWorker.postMessage({ type: 'SKIP_WAITING' }); return;
  }
  if (action === 'generate') return generate();
  if (action === 'remote-job') {
    if (!account) return requireSignInDialog('Please sign in first to view try-on details.');
    const job = remoteJobs.find(j => j.id === id); if (job?.resultUrl) go(`preview/${job.id}`); else if (job) remoteDetail(job); return;
  }
  if (action === 'refresh-jobs') return refreshJobs();
  if (action === 'download-render') {
    if (!account) return requireSignInDialog('Please sign in first to download previews.');
    const job = remoteJobs.find(j => j.id === id); if (!job?.resultUrl) return;
    const response = await fetch(job.resultUrl, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('Could not download this preview. Sign in and try again.');
    const blob = await response.blob(), url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `presew-${id}.${blob.type.includes('png') ? 'png' : 'jpg'}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); return;
  }
  if (action === 'signout') {
    await mutationQueue; await api('/api/auth/sign-out', {});
    account = null; remoteJobs = []; cloudRevision = 0; processingConsent = false;
    data = refreshCatalog(await loadData() || initialData()); sheet.close(); go('studio'); render(); return;
  }
  if (action === 'import-device') {
    const local = await loadData(); if (!local) return toast('There is no saved device library to import.');
    await update(next => {
      for (const a of local.assets.filter(a => a.source === 'upload')) if (!next.assets.some(x => x.id === a.id)) next.assets.push(a);
      for (const l of local.looks) if (!next.looks.some(x => x.id === l.id)) next.looks.push(l);
      for (const p of local.profiles) if (!next.profiles.some(x => x.id === p.id)) next.profiles.push(p);
      if (!next.draft.photoId) next.draft = { ...local.draft, consent: false };
    }); sheet.close(); render(); toast('Device library imported into your account.'); return;
  }
  if (action === 'delete-cloud') {
    if (!confirm('Delete all studio images, measurements, saved plans and results from this server? Provider-retained copies and downloaded files are separate. Your Google account remains signed in.')) return;
    await mutationQueue; await api('/api/me/data', undefined, 'DELETE'); data = initialData(); cloudRevision = 0; remoteJobs = []; sheet.close(); render(); toast('Your cloud studio data has been removed.'); return;
  }
  if (action === 'privacy') return openSheet(`<span class="eyebrow">YOUR PHOTOS, YOUR CHOICE</span><h2 id="dialog-title">Your studio data.</h2><p class="dialog-description">${account ? 'Your signed-in library is stored in your account. Images are served through authenticated routes, with ownership checks.' : 'Your device library is stored in this browser. Other people using this browser profile can access it.'}</p><p>Creating an AI try-on sends the selected images to YouCam. Its documented standard file retention is 30 days. Deleting studio data here does not establish immediate provider-side deletion.</p><p>Downloaded plans and images are separate files you manage yourself.</p>${button(account ? 'Manage account & cloud data' : 'Delete this device’s library', account ? 'account' : 'clear-data', account ? 'info' : 'trash', 'button secondary full-width')}`);
  if (action === 'about') return openSheet(`<span class="eyebrow">SEE IT BEFORE YOU SEW IT</span><h2 id="dialog-title">Your fabric.<br>Your next look.</h2><p class="dialog-description">Collect real fabric and style references, sign in with Google, and create a try-on from your original photo. A preparation task applies the fabric to the style; Clothes V4 then puts it on your photo.</p><p>Realism and pattern fidelity depend on the images and provider output. Compare each result with the original.</p><p class="small-copy">Catalog photography is sourced from Pexels, with source credits on each item.</p>`);
  if (action === 'close-sheet') return sheet.close();
  if (action.startsWith('upload-')) {
    if (!account) return requireSignInDialog(`Please sign in first to add your own ${action.slice(7)}s.`);
    return showUpload(action.slice(7) as AssetKind);
  }
  if (action === 'create') {
    if (!account) return requireSignInDialog('Please sign in first to try your look in the studio.');
    return go('create/0');
  }
  if (action === 'step') {
    if (!account) return requireSignInDialog('Please sign in first to try your look in the studio.');
    return go(`create/${el.dataset.step}`);
  }
  if (action === 'previous') return go(`create/${step() - 1}`);
  if (action === 'close-flow') { toast('Your selections are saved on this device.'); return go('studio'); }
  if (action === 'next') {
    if (!account) return requireSignInDialog('Please sign in first to try your look in the studio.');
    const kind = (['photo', 'fabric', 'style'] as const)[step()];
    if (!kind || !selected(kind) || (kind === 'photo' && !data.draft.consent)) return toast('Choose an image and confirm photo permission to continue.');
    return go(`create/${step() + 1}`);
  }
  if (action === 'select') {
    if (!account) return requireSignInDialog('Please sign in first to choose items for your look.');
    const a = asset(id); if (!a) return;
    await update(next => { next.draft[`${a.kind}Id`] = a.id; if (a.kind === 'photo') next.draft.consent = false; }); render(); return;
  }
  if (action === 'favorite') {
    if (!account) return requireSignInDialog('Please sign in first to save your favourites.');
    await update(next => { const a = next.assets.find(a => a.id === id); if (a) a.favorite = !a.favorite; }); render(); return;
  }
  if (action === 'detail') {
    const a = asset(id);
    if (a?.kind === 'photo') openSheet(`<div class="detail-art">${image(a)}</div><span class="eyebrow">YOUR ORIGINAL PHOTO</span><h2 id="dialog-title">${e(a.name)}</h2><p class="dialog-description">This is your unchanged upload. You can use it again, or remove it from the photo library.</p><button class="button primary full-width" data-action="use-asset" data-id="${a.id}">Use this photo ${icon('arrow', 18)}</button><button class="button danger full-width" data-action="delete-asset" data-id="${a.id}">${icon('trash', 17)} Remove photo from library</button><p class="small-copy">Saved outfit plans keep their own copy. Delete those plans from History to remove their snapshots too.</p>`);
    else if (a) detail(a);
    return;
  }
  if (action === 'use-asset') {
    if (!account) return requireSignInDialog('Please sign in first to use this in your look.');
    const a = asset(id); if (!a) return; await update(next => { next.draft[`${a.kind}Id`] = id; if (a.kind === 'photo') next.draft.consent = false; }); sheet.close(); go(selected('photo') && data.draft.consent ? a.kind === 'fabric' ? 'create/2' : selected('fabric') ? 'create/3' : 'create/1' : 'create/0'); return;
  }
  if (action === 'delete-asset') {
    if (!confirm('Remove this upload from your library? Saved history keeps its own copy.')) return;
    await update(next => Object.assign(next, deleteAsset(next, id))); sheet.close(); render(); toast('Removed from your library.'); return;
  }
  if (action === 'save-look') {
    if (!account) return requireSignInDialog('Please sign in first to save outfit plans.');
    await mutationQueue;
    const errors = draftErrors(data); if (errors.length) return toast(errors.join(' '));
    const look = snapshotLook(data, crypto.randomUUID(), new Date().toISOString());
    await update(next => { next.looks.unshift(look); next.draft = emptyDraft(); }); go('history'); toast('Outfit plan saved. Your next idea has a home.'); return;
  }
  if (action === 'look') { const l = data.looks.find(l => l.id === id); if (l) showLook(l); return; }
  if (action === 'look-favorite') {
    if (!account) return requireSignInDialog('Please sign in first to save your favourites.');
    await update(next => { const l = next.looks.find(l => l.id === id); if (l) l.favorite = !l.favorite; }); render(); return;
  }
  if (action === 'delete-look') { if (!confirm('Delete this saved outfit plan and its snapshot? Library uploads are kept.')) return; await update(next => { next.looks = next.looks.filter(l => l.id !== id); }); sheet.close(); render(); toast('Outfit plan deleted.'); return; }
  if (action === 'reuse-look') {
    if (!account) return requireSignInDialog('Please sign in first to reuse saved outfit combinations.');
    const l = data.looks.find(l => l.id === id); if (!l) return;
    await update(next => { for (const a of [l.photo, l.fabric, l.style]) if (!next.assets.some(existing => existing.id === a.id)) next.assets.push(structuredClone(a)); next.draft = { photoId: l.photo.id, fabricId: l.fabric.id, styleId: l.style.id, profileId: next.profiles.some(p => p.id === l.profile?.id) ? l.profile!.id : '', consent: false, notes: l.notes }; }); sheet.close(); go('create/0'); return;
  }
  if (action === 'export-look') { const l = data.looks.find(l => l.id === id); if (l) exportLook(l); return; }
  if (action === 'profiles') {
    if (!account) return requireSignInDialog('Please sign in first to manage measurement profiles.');
    return profiles();
  }
  if (action === 'new-profile') {
    if (!account) return requireSignInDialog('Please sign in first to add measurement profiles.');
    return profileForm();
  }
  if (action === 'edit-profile') {
    if (!account) return requireSignInDialog('Please sign in first to edit measurement profiles.');
    return profileForm(data.profiles.find(p => p.id === id));
  }
  if (action === 'delete-profile') {
    if (!confirm('Delete this measurement profile? Saved outfit plans retain their measurement snapshot.')) return;
    await update(next => { next.profiles = next.profiles.filter(p => p.id !== id); if (next.draft.profileId === id) next.draft.profileId = ''; }); render(); profiles(); return;
  }
  if (action === 'generation-info') return accountDialog();
  if (action === 'clear-data') {
    if (!confirm('Permanently delete all uploaded images, measurements, saved plans, and selections from this browser? Downloaded files are not removed.')) return;
    await update(next => Object.assign(next, initialData())); sheet.close(); render(); toast('Your local studio data has been deleted.'); return;
  }
  if (action === 'install') {
    if (isInstalled()) return toast('PreSew is already open as an app.');
    if (!installPrompt) return installHelp();
    const prompt = installPrompt;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    installPrompt = undefined;
    if (choice.outcome === 'accepted') { if (sheet.open) sheet.close(); toast('Your pocket studio is ready to install.'); }
    render();
  }
}

document.addEventListener('click', event => {
  if ((event.target as Element).closest('.skip-link')) {
    event.preventDefault();
    document.querySelector<HTMLElement>('#main')?.focus();
    return;
  }
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action], [data-filter]');
  if (!target) return;
  if (target.dataset.filter) { filter = target.dataset.filter; render(); return; }
  void handleAction(target.dataset.action!, target).catch(error => toast(error instanceof Error ? error.message : 'That change could not be saved. Please try again.'));
});
document.addEventListener('input', event => {
  const target = event.target as HTMLInputElement;
  if (target.closest('#profile-form') && measurementFields.some(([key]) => key === target.name)) measurementEdits.add(target.name);
  if (target.id === 'library-search') {
    const position = target.selectionStart;
    search = target.value; render();
    const next = document.querySelector<HTMLInputElement>('#library-search'); next?.focus();
    if (next && next.type !== 'search') next.setSelectionRange(position, position);
  }
  if (target.id === 'look-notes') void update(next => { next.draft.notes = target.value; }).catch(error => toast(error.message));
});
document.addEventListener('change', async event => {
  const target = event.target as HTMLInputElement;
  try {
    if (target.id === 'render-consent') { processingConsent = target.checked; return; }
    if (target.id === 'photo-consent') { await update(next => { next.draft.consent = target.checked; }); render(); }
    if (target.id === 'profile-select') await update(next => { next.draft.profileId = target.value; });
    if (target.id === 'measurement-unit') {
      const nextUnit = target.value as Unit;
      for (const [key] of measurementFields) {
        const input = sheet.querySelector<HTMLInputElement>(`[name="${key}"]`)!;
        if (input.value.trim() && Number.isFinite(Number(input.value))) {
          // Keep full precision during editing; round only when showing saved profiles.
          const cm = toCm(Number(input.value), modalUnit);
          input.value = String(Math.round((nextUnit === 'in' ? cm / 2.54 : cm) * 10000) / 10000);
        }
      }
      modalUnit = nextUnit;
      sheet.querySelectorAll('.unit-label').forEach(el => { el.textContent = nextUnit; });
    }
    if (target.id === 'image-file') {
      pendingImage = '';
      const file = target.files?.[0]; if (!file) return;
      const error = validateImage(file); if (error) throw new Error(error);
      const url = await blobDataUrl(file);
      const img = new Image(); img.src = url; await img.decode();
      if (target.files?.[0] !== file) return;
      if (Math.max(img.naturalWidth, img.naturalHeight) > 4096) throw new Error('Choose a photo no larger than 4096 pixels on its longest side. Resize a copy first; your original stays unchanged.');
      if (Math.min(img.naturalWidth, img.naturalHeight) < 384) throw new Error('Choose a clearer photo, at least 384 pixels on its shortest side.');
      pendingImage = url;
      sheet.querySelector('#upload-error')!.textContent = '';
      sheet.querySelector('#upload-preview')!.innerHTML = `<img src="${e(url)}" alt="Selected image preview"/><small>Tap to choose another photo</small>`;
      const name = sheet.querySelector<HTMLInputElement>('#asset-name')!;
      if (!name.value) name.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').slice(0, 80);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read that image. Try a JPG or PNG.';
    if (target.id === 'image-file') { target.value = ''; const output = sheet.querySelector('#upload-error'); if (output) output.textContent = message; }
    else toast(message);
  }
});
document.addEventListener('submit', async event => {
  const form = event.target as HTMLFormElement;
  if (!['upload-form', 'profile-form'].includes(form.id)) return;
  event.preventDefault();
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  submit.disabled = true;
  try {
    if (form.id === 'upload-form') {
      if (!pendingImage) throw new Error('Choose a valid photo before adding it.');
      const name = (form.querySelector<HTMLInputElement>('#asset-name')!.value).trim();
      if (!name) throw new Error('Give your image a name.');
      const item: Asset = { id: crypto.randomUUID(), kind: uploadKind, name, image: pendingImage, category: form.querySelector<HTMLSelectElement>('#asset-category')!.value, source: 'upload', favorite: false, createdAt: new Date().toISOString() };
      await update(next => { next.assets.unshift(item); if (isCreate()) { next.draft[`${item.kind}Id`] = item.id; if (item.kind === 'photo') next.draft.consent = false; } });
      sheet.close(); render(); toast(`Your ${item.kind} has a home in the studio.`);
    } else {
      const fields = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
      const result = parseMeasurements(fields, modalUnit);
      if (result.errors.length) throw new Error(result.errors.join(' '));
      // Formatting or changing units must not alter an untouched saved measurement.
      if (modalProfile) for (const [key] of measurementFields) {
        if (!measurementEdits.has(key) && modalProfile.values[key] !== undefined) result.values[key] = modalProfile.values[key];
      }
      if (!fields.name.trim()) throw new Error('Give this profile a name.');
      const id = modalProfile?.id || crypto.randomUUID();
      await update(next => { next.profiles = next.profiles.filter(p => p.id !== id); next.profiles.push({ id, name: fields.name.trim(), values: result.values, updatedAt: new Date().toISOString() }); next.unit = modalUnit; if (isCreate()) next.draft.profileId = id; });
      render(); profiles(); toast('Measurements saved.');
    }
  } catch (error) { form.querySelector('.form-error')!.textContent = error instanceof Error ? error.message : 'Could not save. Please try again.'; }
  finally { submit.disabled = false; }
});
sheet.addEventListener('click', event => { if (event.target === sheet) { const bounds = sheet.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) sheet.close(); } });
window.addEventListener('hashchange', () => { search = ''; filter = 'All'; render(); window.scrollTo({ top: 0 }); document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true }); });
window.addEventListener('online', render);
window.addEventListener('offline', render);
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; render(); });
window.addEventListener('appinstalled', () => { installedThisSession = true; installPrompt = undefined; render(); toast('PreSew is on your home screen.'); });
standaloneDisplay.addEventListener('change', render);
document.addEventListener('error', event => { const target = event.target; if (target instanceof HTMLImageElement && target.hasAttribute('data-account-photo')) target.remove(); }, true);

async function start() {
  serverStatus = await api<ServerStatus>('/api/status').catch(() => null);
  try {
    const session = await api<{ user: Account | null }>('/api/me');
    account = session.user;
    if (account) { const cloud = await getStudio(); data = refreshCatalog(cloud.data); cloudRevision = cloud.revision; await refreshJobs(); }
    else data = refreshCatalog(await loadData() || initialData());
  } catch (error) {
    storageError = error instanceof Error ? `Could not check your sign-in or load your library: ${error.message}` : 'Could not check your sign-in or load your library.';
    data = refreshCatalog(await loadData().catch(() => null) || initialData());
  }
  ready = true; sessionReady = true; render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (applyingUpdate) location.reload(); });
    navigator.serviceWorker.register('/sw.js').then(registration => {
      const offerUpdate = () => { if (registration.waiting && navigator.serviceWorker.controller) { waitingWorker = registration.waiting; showUpdateNotice(); } };
      offerUpdate();
      registration.addEventListener('updatefound', () => { registration.installing?.addEventListener('statechange', offerUpdate); });
    }).catch(() => { /* App remains usable without offline caching. */ });
  }
}
async function refreshSignedInSession() {
  if (!sessionReady || account || sessionRefreshInFlight || !navigator.onLine) return;
  sessionRefreshInFlight = true;
  try {
    const session = await api<{ user: Account | null }>('/api/me');
    if (!session.user) return;
    account = session.user;
    const cloud = await getStudio();
    data = refreshCatalog(cloud.data); cloudRevision = cloud.revision;
    await refreshJobs();
    storageError = '';
    render();
  } catch (error) {
    storageError = error instanceof Error ? `Could not refresh your sign-in: ${error.message}` : 'Could not refresh your sign-in.';
    render();
  } finally { sessionRefreshInFlight = false; }
}
window.addEventListener('pageshow', () => { void refreshSignedInSession(); });
window.addEventListener('focus', () => { void refreshSignedInSession(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void refreshSignedInSession(); });
void start();
setInterval(() => { if (account && navigator.onLine && document.visibilityState === 'visible') void refreshJobs().catch(() => {}); }, 10000);
