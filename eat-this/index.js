function render() { return Spicetify.React.createElement(EatThisApp); }
function EatThisApp() {
  const R = Spicetify.React, h = R.createElement;
  const [input, setInput] = R.useState(() => Spicetify.LocalStorage.get('eat-this:playlist') || '');
  const [tracks, setTracks] = R.useState([]), [loading, setLoading] = R.useState(false);
  const [library, setLibrary] = R.useState([]), [libraryBusy, setLibraryBusy] = R.useState(true);
  const [libraryError, setLibraryError] = R.useState(''), [filter, setFilter] = R.useState('');
  const [selected, setSelected] = R.useState(''), [message, setMessage] = R.useState('Selecciona una playlist para cargar sus canciones.');
  const [phase, setPhase] = R.useState('setup'), [score, setScore] = R.useState(0);
  const [audio, setAudio] = R.useState({}), [speed, setSpeed] = R.useState(160);
  const [fragment, setFragment] = R.useState(() => Spicetify.LocalStorage.get('eat-this:fragment') || 'auto');
  const canvas = R.useRef(null), game = R.useRef(null), playback = R.useRef(null);
  const active = R.useRef('setup'), images = R.useRef(new Map()), abort = R.useRef(null), libraryAbort = R.useRef(null);
  function changePhase(next) { active.current = next; setPhase(next); }
  function draw() {
    EatThisBoard.draw(canvas.current, game.current?.state, images.current, () => {
      if (active.current !== 'setup') draw();
    });
  }
  async function refreshLibrary() {
    libraryAbort.current?.abort(); const controller = new AbortController(); libraryAbort.current = controller;
    setLibraryBusy(true); setLibraryError('');
    try { const rows = await EatThisSpotify.loadLibrary(Spicetify, controller.signal); if (!controller.signal.aborted) setLibrary(rows); }
    catch (e) { if (!controller.signal.aborted) setLibraryError(e.message || String(e)); }
    finally { if (!controller.signal.aborted) setLibraryBusy(false); }
  }
  R.useEffect(() => {
    playback.current = EatThisSpotify.player(Spicetify, patch => setAudio(prev => ({ ...prev, ...patch })));
    void refreshLibrary();
    function incoming() {
      abort.current?.abort(); setLoading(false); setInput(Spicetify.LocalStorage.get('eat-this:playlist') || '');
      setTracks([]); setSelected(''); changePhase('setup'); setMessage('Playlist seleccionada. Pulsa Cargar playlist.');
    }
    window.addEventListener('eat-this:playlist', incoming);
    return () => {
      active.current = 'setup'; abort.current?.abort(); libraryAbort.current?.abort(); playback.current?.dispose();
      window.removeEventListener('eat-this:playlist', incoming); images.current.forEach(img => { img.onload = null; });
    };
  }, []);
  R.useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      if (active.current !== 'playing') return;
      const eaten = game.current.step();
      if (eaten) { playback.current.request(eaten, fragment); if (fragment === 'auto') playback.current.prepare(game.current.state.food?.track); }
      setScore(game.current.state.score); draw(); if (game.current.state.over) changePhase('over');
    }, speed);
    return () => clearInterval(id);
  }, [phase, speed, fragment]);
  R.useEffect(() => { draw(); }, [phase]);
  R.useEffect(() => {
    function blur() { if (active.current === 'playing') changePhase('paused'); }
    window.addEventListener('blur', blur); return () => window.removeEventListener('blur', blur);
  }, []);
  async function load(value = input, name = '') {
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setLoading(true); setTracks([]); setInput(value); setSelected(name); setMessage('Leyendo playlist…');
    try {
      const loaded = await EatThisSpotify.loadPlaylist(Spicetify, value, n => { if (!controller.signal.aborted) setMessage(`${n} canciones cargadas…`); }, controller.signal);
      if (controller.signal.aborted) return;
      setTracks(loaded); Spicetify.LocalStorage.set('eat-this:playlist', EatThisSpotify.playlistUri(value));
      if (fragment === 'auto') loaded.slice(0, 3).forEach(t => playback.current.prepare(t));
      setMessage(`${loaded.length} canciones listas. Archivos locales, episodios y canciones no disponibles se omiten.`);
    } catch (e) { if (!controller.signal.aborted) setMessage(e.message || String(e)); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  function start() {
    game.current = EatThisEngine.create(tracks); setScore(0); changePhase('playing');
    playback.current.request(game.current.state.food.track, fragment); setTimeout(() => canvas.current?.focus(), 0);
  }
  function key(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const dirs = { ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 } };
    if (e.code === 'Space' && ['playing', 'paused'].includes(active.current)) { e.preventDefault(); e.stopPropagation(); changePhase(active.current === 'playing' ? 'paused' : 'playing'); }
    else if (dirs[e.key] && active.current === 'playing') { e.preventDefault(); e.stopPropagation(); game.current.turn(dirs[e.key]); }
  }
  const button = (label, onClick, disabled = false, secondary = false) => h('button', { type: 'button', onClick, disabled, className: secondary ? 'et-secondary' : 'et-primary' }, label);
  const visible = library.filter(p => `${p.name} ${p.folder} ${p.owner}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
  return h('main', { className: 'eat-this' },
    h('header', null, h('span', { className: 'et-eyebrow' }, 'TU PLAYLIST. TU PARTIDA.'), h('h1', null, 'Eat This'), h('p', null, 'Come portadas. Descubre tu próxima canción.')),
    phase === 'setup' ? h('section', { className: 'et-card' },
      h('h2', null, '¿Qué playlist nos comemos hoy?'),
      h('div', { className: 'et-row' }, h('h3', null, 'Tus playlists guardadas'), button('Actualizar', refreshLibrary, libraryBusy, true)),
      h('input', { className: 'et-filter', type: 'search', value: filter, placeholder: 'Buscar en tu biblioteca…', 'aria-label': 'Buscar playlists guardadas', onChange: e => setFilter(e.target.value) }),
      h('p', { role: 'status', className: 'et-muted' }, libraryBusy ? 'Leyendo tu biblioteca…' : libraryError || (library.length ? `${visible.length} playlists` : 'No se encontraron playlists guardadas. Puedes usar un enlace abajo.')),
      h('div', { className: 'et-library' }, ...visible.map(p => h('button', { key: p.uri, type: 'button', disabled: loading, className: `et-playlist${input === p.uri ? ' et-selected' : ''}`, onClick: () => void load(p.uri, p.name), 'aria-label': `Cargar ${p.name}` },
        p.image ? h('img', { src: p.image, alt: '', loading: 'lazy' }) : h('span', { className: 'et-placeholder', 'aria-hidden': true }, '♫'),
        h('span', { className: 'et-playlist-text' }, h('strong', null, p.name), h('small', null, p.folder || p.owner || 'Playlist')), h('span', { className: 'et-load' }, 'Cargar')))),
      !libraryBusy && !libraryError && library.length > 0 && !visible.length && h('p', { className: 'et-muted' }, 'Ninguna playlist coincide con tu búsqueda.'),
      h('details', null, h('summary', null, 'O usar un enlace de playlist'), h('label', { htmlFor: 'et-playlist' }, 'Enlace de playlist'),
        h('div', { className: 'et-row' }, h('input', { id: 'et-playlist', value: input, disabled: loading, placeholder: 'https://open.spotify.com/playlist/…', onChange: e => { setInput(e.target.value); setTracks([]); setSelected(''); }, onKeyDown: e => { if (e.key === 'Enter' && !loading) void load(); } }), button(loading ? 'Cargando…' : 'Cargar playlist', () => void load(), loading))),
      selected && h('h3', { className: 'et-selection' }, selected),
      h('p', { role: 'status', className: 'et-muted' }, message),
      tracks.length > 0 && h('div', { className: 'et-covers' }, ...tracks.slice(0, 12).map(t => t.image ? h('img', { key: t.uri, src: t.image, alt: t.name, title: t.name }) : h('span', { key: t.uri }, '♫'))),
      h('div', { className: 'et-settings' }, h('label', null, 'Velocidad ', h('select', { value: speed, onChange: e => setSpeed(Number(e.target.value)) }, h('option', { value: 220 }, 'Tranquila'), h('option', { value: 160 }, 'Normal'), h('option', { value: 110 }, 'Rápida'))),
        h('label', null, 'Comenzar canciones ', h('select', { value: fragment, onChange: e => { setFragment(e.target.value); Spicetify.LocalStorage.set('eat-this:fragment', e.target.value); } }, h('option', { value: 'auto' }, 'Parte intensa (estimada)'), h('option', { value: '30' }, 'Desde 0:30'), h('option', { value: '45' }, 'Desde 0:45'), h('option', { value: 'start' }, 'Desde el inicio')))),
      h('p', { className: 'et-muted' }, fragment === 'auto' ? 'Busca una sección intensa por análisis musical. Si no está disponible, salta al primer tercio. Es una estimación, no el punto más escuchado.' : 'El salto se adapta a la duración para no pasar al final de canciones cortas.'),
      button('Empezar partida', start, !tracks.length || loading), h('p', { className: 'et-muted' }, 'Flechas o WASD · Espacio para pausar el juego. La música sigue sonando.')) :
    h('section', { className: 'et-game' }, h('div', { className: 'et-row et-hud' }, h('strong', null, `${score} portadas`), button(phase === 'playing' ? 'Pausar' : 'Continuar', () => { changePhase(phase === 'playing' ? 'paused' : 'playing'); canvas.current?.focus(); }, phase === 'over', true), button('Cambiar playlist', () => changePhase('setup'), false, true)),
      h('div', { className: 'et-board' }, h('canvas', { ref: canvas, width: 640, height: 640, tabIndex: 0, onKeyDown: key, 'aria-label': 'Tablero Snake. Flechas o WASD para moverte, espacio para pausar.' }),
        phase !== 'playing' && h('div', { className: 'et-overlay' }, h('h2', null, phase === 'over' ? game.current?.state.won ? '¡Playlist devorada!' : 'Fin de la partida' : 'En pausa'), h('p', null, `${score} portadas comidas`), button(phase === 'over' ? 'Volver a jugar' : 'Continuar', () => { if (phase === 'over') start(); else { changePhase('playing'); canvas.current?.focus(); } }))), h('p', { className: 'et-muted' }, 'Flechas / WASD · Espacio: pausa · Haz clic en el tablero para activar los controles')),
    h('footer', { className: 'et-now', 'aria-live': 'polite' }, h('span', { className: 'et-eyebrow' }, 'SONANDO EN SPOTIFY'), h('strong', null, audio.item?.name || 'Sin reproducción'), h('span', { className: 'et-muted' }, audio.error || (audio.pending ? `Esperando a Spotify: ${audio.pending}…` : audio.paused ? 'Reproducción pausada' : ''))));
}
