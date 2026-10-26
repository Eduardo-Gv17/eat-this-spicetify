var EatThisSpotify = (() => {
  function playlistUri(input) {
    const text = String(input || '').trim();
    const match = text.match(/^spotify:playlist:([a-zA-Z0-9]{22})$/) || text.match(/^https:\/\/open\.spotify\.com\/(?:intl-[^/]+\/)?playlist\/([a-zA-Z0-9]{22})(?:[/?#].*)?$/);
    if (!match) throw new Error('Pega el enlace o URI de una playlist de Spotify.');
    return `spotify:playlist:${match[1]}`;
  }
  function cover(value) {
    let url = typeof value === 'string' ? value : value?.url;
    if (url?.startsWith('spotify:image:')) url = `https://i.scdn.co/image/${url.split(':').pop()}`;
    return /^(https?:\/\/|data:image\/)/.test(url || '') ? url : '';
  }
  function normalize(row) {
    const t = row?.track || row?.item?.data || row?.item || row;
    if (!t || !/^spotify:track:[a-zA-Z0-9]{22}$/.test(t.uri || '') || t.isPlayable === false || t.isAvailable === false) return null;
    const image = t.album?.images?.[0] || t.album?.coverArt?.sources?.[0] || t.images?.[0];
    return { uri: t.uri, name: t.name || 'Canción', artist: (t.artists?.items || t.artists || []).map(a => a.profile?.name || a.name || '').join(', '), image: cover(image), duration: Number(t.duration?.milliseconds ?? t.duration?.totalMilliseconds ?? t.duration_ms ?? t.duration) || 0 };
  }
  async function loadPlaylist(sp, input, progress = () => {}, signal) {
    const uri = playlistUri(input), api = sp.Platform?.PlaylistAPI;
    if (!api?.getContents) throw new Error('Esta versión de Spotify no expone PlaylistAPI.getContents. Actualiza Spicetify.');
    const result = [], seen = new Set(); let offset = 0;
    for (;;) {
      signal?.throwIfAborted();
      const page = await api.getContents(uri, { offset, limit: 100 });
      signal?.throwIfAborted();
      const rows = page?.items || page?.contents?.items;
      if (!Array.isArray(rows)) throw new Error('Spotify devolvió un formato de playlist no compatible.');
      if (!rows.length) break;
      const fingerprint = JSON.stringify(rows);
      if (seen.has(fingerprint)) throw new Error('Spotify repitió una página: no se cargará una playlist incompleta.');
      seen.add(fingerprint); result.push(...rows.map(normalize).filter(Boolean)); offset += rows.length; progress(result.length);
      const total = page.totalLength ?? page.total ?? page.contents?.totalLength;
      if (typeof total === 'number' ? offset >= total : rows.length < 100) break;
      if (offset >= 100000) throw new Error('La playlist excede el límite de seguridad.');
    }
    const tracks = [...new Map(result.map(t => [t.uri, t])).values()];
    if (!tracks.length) throw new Error('No hay canciones reproducibles. Archivos locales y episodios se omiten.');
    return tracks;
  }
  async function loadLibrary(sp, signal) {
    const api = sp.Platform?.RootlistAPI;
    if (!api?.getContents) throw new Error('Tu cliente no expone RootlistAPI. Puedes usar el enlace de playlist.');
    const playlists = new Map(), folders = new Set();
    async function visit(folderUri, path = '') {
      if (folderUri && folders.has(folderUri)) return;
      if (folderUri) folders.add(folderUri);
      let offset = 0; const pages = new Set();
      for (;;) {
        signal?.throwIfAborted();
        const page = await api.getContents({ ...(folderUri ? { folderUri } : {}), offset, limit: 100 });
        signal?.throwIfAborted();
        const rows = page?.items || page?.contents?.items;
        if (!Array.isArray(rows)) throw new Error('Formato de biblioteca no compatible con este cliente.');
        if (!rows.length) break;
        const fingerprint = JSON.stringify(rows);
        if (pages.has(fingerprint)) throw new Error('Spotify repitió una página de tu biblioteca. Usa el enlace o actualiza Spicetify.');
        pages.add(fingerprint);
        for (const row of rows) {
          if (/^spotify:playlist:[a-zA-Z0-9]{22}$/.test(row.uri || '')) {
            playlists.set(row.uri, { uri: row.uri, name: row.name || 'Playlist', folder: path, image: cover(row.images?.[0] || row.image || row.metadata?.picture), owner: row.owner?.displayName || row.owner?.name || '' });
          } else if (row.type === 'folder' || row.uri?.startsWith('spotify:folder:')) {
            await visit(row.uri, [path, row.name].filter(Boolean).join(' / '));
          }
        }
        offset += rows.length;
        const total = page.totalLength ?? page.total ?? page.contents?.totalLength;
        if (typeof total === 'number' ? offset >= total : rows.length < 100) break;
        if (offset >= 100000 || folders.size > 1000) throw new Error('La biblioteca excede el límite de seguridad.');
      }
    }
    await visit(); return [...playlists.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  // Loudness is an estimate of a musical highlight, never listening statistics.
  function highlight(analysis, durationMs) {
    const duration = durationMs || Number(analysis?.track?.duration) * 1000;
    const sections = (analysis?.sections || []).filter(s => Number.isFinite(s.start) && Number.isFinite(s.loudness) && s.duration >= 8 && s.start >= 15 && (!duration || s.start * 1000 < duration * .75));
    sections.sort((a, b) => b.loudness - a.loudness || a.start - b.start);
    return sections.length ? Math.round((sections[0].start + 1) * 1000) : null;
  }
  function startPosition(mode, duration, estimated) {
    if (mode === 'start') return 0;
    const target = mode === '30' ? 30000 : mode === '45' ? 45000 : estimated ?? (duration > 0 ? duration * .33 : 30000);
    return Math.round(Math.max(0, Math.min(target, duration > 0 ? Math.max(0, duration - 10000) : target)));
  }
  function player(sp, onState) {
    let desired = null, busy = false, disposed = false, timer, sought = null;
    const analysis = new Map();
    function prepare(track) {
      if (!track || analysis.has(track.uri) || !sp.getAudioData) return;
      analysis.set(track.uri, null);
      // Never delay playback waiting for analysis. Next food is prepared in advance.
      Promise.resolve().then(() => sp.getAudioData(track.uri)).then(data => {
        if (!disposed) analysis.set(track.uri, highlight(data, track.duration));
      }).catch(() => {});
    }
    function sync() {
      if (disposed) return;
      const item = sp.Player.data?.item, confirmed = desired && item?.uri === desired.track.uri;
      if (confirmed) {
        clearTimeout(timer);
        if (sought !== desired) {
          sought = desired;
          const target = desired;
          const duration = Number(sp.Player.getDuration?.()) || target.track.duration || 0;
          const position = startPosition(target.mode, duration, analysis.get(target.track.uri));
          if (position > 0 && sp.Player.seek) {
            try { Promise.resolve(sp.Player.seek(position)).catch(() => { if (!disposed && desired === target) onState({ error: 'Spotify no permitió saltar al fragmento.' }); }); }
            catch (_) { onState({ error: 'Spotify no permitió saltar al fragmento.' }); }
          }
        }
      }
      onState({ item, pending: desired && !confirmed ? desired.track.name : '', paused: !!sp.Player.data?.isPaused });
    }
    async function pump() {
      if (busy || disposed) return;
      busy = true;
      try {
        while (desired && !disposed) {
          const target = desired;
          try {
            await sp.Player.playUri(target.track.uri);
            if (disposed) break;
            if (target === desired) {
              sync();
              if (sp.Player.data?.item?.uri !== target.track.uri) {
                clearTimeout(timer); timer = setTimeout(() => { if (!disposed && desired === target && sp.Player.data?.item?.uri !== target.track.uri) onState({ error: 'Spotify no confirmó la canción. Comprueba el dispositivo activo.', pending: '' }); }, 10000);
              }
              break;
            }
          } catch (e) { if (!disposed && target === desired) { onState({ error: `No se pudo reproducir: ${e.message || e}`, pending: '' }); break; } }
        }
      } finally { busy = false; }
    }
    sp.Player.addEventListener('songchange', sync); sp.Player.addEventListener('onplaypause', sync); sync();
    return { prepare, request(track, mode = 'auto') { if (disposed) return; clearTimeout(timer); desired = { track, mode }; onState({ item: sp.Player.data?.item, error: '', pending: track.name }); if (mode === 'auto') prepare(track); void pump(); },
      dispose() { disposed = true; desired = null; clearTimeout(timer); analysis.clear(); sp.Player.removeEventListener('songchange', sync); sp.Player.removeEventListener('onplaypause', sync); }
    };
  }
  return { playlistUri, normalize, loadPlaylist, loadLibrary, highlight, startPosition, player };
})();
if (typeof module !== 'undefined') module.exports = EatThisSpotify;
