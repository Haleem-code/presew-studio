const paths: Record<string, string> = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  offline:
    '<path d="m3 3 18 18M8.5 8.5a10 10 0 0 1 11.3 1.7M4.2 10.2l1.3-1M8 14a6 6 0 0 1 2.2-1.2M12 17h.01"/>',
  google: '<path d="M20.5 12h-8.3m8.3 0c0 5-3.3 8.5-8.3 8.5a8.5 8.5 0 1 1 5.8-14.7"/>',
  studio: '<path d="M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z"/>',
  fabric:
    '<path d="M5 5h12a3 3 0 0 1 0 6H7a3 3 0 0 1 0-6M5 5v13a3 3 0 0 0 3 3h11V8M9 11v7M13 11v7"/>',
  style: '<path d="M10 5a2 2 0 1 1 3 1.7V9l8 6a2 2 0 0 1-1.2 3.6H4.2A2 2 0 0 1 3 15l9-6"/>',
  history:
    '<rect x="4" y="5" width="16" height="16" rx="1"/><path d="M8 5V3h8v2M8 16l3-3 3 3 2-2 4 4"/><circle cx="9" cy="10" r="1"/>',
  minus: '<path d="M5 12h14"/>',
  expand: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
  rotate: '<path d="M3 11a9 9 0 1 1 2.7 7M3 5v6h6"/>',
  layers: '<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
  heart:
    '<path d="M20.8 4.6c-2.1-2.1-5.5-1.6-8.8 1.5C8.7 3 5.3 2.5 3.2 4.6c-3.7 3.7.9 9.9 8.8 15.4 7.9-5.5 12.5-11.7 8.8-15.4Z"/>',
  ruler: '<path d="m3 16 13-13 5 5L8 21zM13 6l3 3M9 10l3 3M5 14l3 3"/>',
  camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  edit: '<path d="m14 4 6 6M3 21l2-7L17 2l5 5L10 19z"/>',
  leaf: '<path d="M20 3C8 2 2 8 5 15s17 9 15-12ZM5 20l9-11"/>',
};
export function icon(name: string, size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.style}</svg>`;
}
