const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../eat-this/engine');
const adapter = require('../eat-this/spotify');
const uri = 'spotify:track:1234567890123456789012';
const track = { uri, name: 'Song', artists: [{ name: 'Artist' }], album: { images: [{ url: 'https://example.com/cover.jpg' }] } };
test('playlist links are validated, including localized URLs', () => {
  assert.equal(adapter.playlistUri('https://open.spotify.com/intl-es/playlist/1234567890123456789012?si=x'), 'spotify:playlist:1234567890123456789012');
  assert.throws(() => adapter.playlistUri('https://evil.example/playlist/1234567890123456789012'));
});
test('playlist pagination keeps requesting until the reported total', async () => {
  const offsets = [];
  const sp = { Platform: { PlaylistAPI: { getContents: async (_, { offset }) => {
    offsets.push(offset); return { items: offset ? [{ ...track, uri: 'spotify:track:abcdefghijklmnopqrstuv' }] : Array.from({ length: 100 }, () => track), totalLength: 101 };
  } } } };
  const rows = await adapter.loadPlaylist(sp, 'spotify:playlist:1234567890123456789012');
  assert.deepEqual(offsets, [0, 100]); assert.equal(rows.length, 2); assert.equal(rows[0].artist, 'Artist');
});
test('unsupported, empty and repeated playlist pages fail explicitly', async () => {
  const playlist = 'spotify:playlist:1234567890123456789012';
  await assert.rejects(adapter.loadPlaylist({ Platform: {} }, playlist), /getContents/);
  await assert.rejects(adapter.loadPlaylist({ Platform: { PlaylistAPI: { getContents: async () => ({ items: [] }) } } }, playlist), /No hay/);
  await assert.rejects(adapter.loadPlaylist({ Platform: { PlaylistAPI: { getContents: async () => ({ items: Array(100).fill(track), totalLength: 201 }) } } }, playlist), /repitió/);
  assert.equal(adapter.normalize({ uri: 'spotify:local:a' }), null);
});
test('snake grows, prevents reversal and ends on walls', () => {
  const game = engine.create([track], () => 0);
  game.state.food = { x: 10, y: 10, track };
  game.turn({ x: -1, y: 0 });
  assert.equal(game.step(), track); assert.equal(game.state.score, 1); assert.equal(game.state.snake.length, 4);
  for (let i = 0; i < 20; i++) game.step();
  assert.equal(game.state.over, true);
});
test('snake can move into a departing tail and complete the board', () => {
  const game = engine.create([track], () => 0);
  game.state.snake = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 1 }];
  game.state.direction = game.state.next = { x: 0, y: -1 };
  game.state.food = { x: 5, y: 5, track }; game.turn({ x: -1, y: 0 }); game.step();
  assert.equal(game.state.over, false);
  game.state.snake = [];
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if (x !== 1 || y !== 0) game.state.snake.push({ x, y });
  game.state.direction = game.state.next = { x: 1, y: 0 }; game.state.turned = false; game.state.food = { x: 1, y: 0, track };
  game.step(); assert.equal(game.state.won, true);
});
test('player serializes and collapses changes; confirms actual track; removes listeners', async () => {
  const listeners = {}, calls = []; let release;
  const sp = { Player: { data: { item: { uri: 'old', name: 'Old' } },
    addEventListener: (event, fn) => { listeners[event] = fn; }, removeEventListener: event => { delete listeners[event]; },
    playUri: async target => { calls.push(target); if (calls.length === 1) await new Promise(resolve => { release = resolve; }); sp.Player.data.item = { uri: target, name: target }; }
  } };
  let state; const player = adapter.player(sp, patch => { state = patch; });
  player.request(track); player.request({ ...track, uri: 'second' }); player.request({ ...track, uri: 'third' });
  assert.equal(state.item.uri, 'old'); assert.equal(state.pending, 'Song');
  release(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, [uri, 'third']); assert.equal(state.item.uri, 'third'); assert.equal(state.pending, '');
  player.dispose(); assert.deepEqual(listeners, {});
});

test('library reads saved playlists, folders, pagination and deduplicates', async () => {
  const a = 'spotify:playlist:1234567890123456789012', b = 'spotify:playlist:abcdefghijklmnopqrstuv';
  const calls = [];
  const sp = { Platform: { RootlistAPI: { getContents: async options => {
    calls.push(options);
    if (options.folderUri) return { items: [{ uri: b, name: 'Inside' }, { uri: a, name: 'Same' }], totalLength: 2 };
    if (options.offset) return { items: [{ type: 'folder', uri: 'spotify:folder:test', name: 'Folder' }], totalLength: 101 };
    return { items: Array(100).fill({ uri: a, name: 'Saved' }), totalLength: 101 };
  } } } };
  const library = await adapter.loadLibrary(sp);
  assert.equal(library.length, 2); assert.equal(library.find(p => p.uri === b).folder, 'Folder');
  assert.equal(calls[1].offset, 100); assert.equal(calls[2].folderUri, 'spotify:folder:test');
  await assert.rejects(adapter.loadLibrary({ Platform: {} }), /RootlistAPI/);
});
test('highlight estimates loud sections away from intro and outro; short songs stay safe', () => {
  const data = { sections: [{ start: 0, duration: 20, loudness: -1 }, { start: 45, duration: 20, loudness: -5 }, { start: 90, duration: 20, loudness: -4 }, { start: 190, duration: 20, loudness: -2 }] };
  assert.equal(adapter.highlight(data, 220000), 91000);
  assert.equal(adapter.highlight({}, 220000), null);
  assert.equal(adapter.startPosition('auto', 180000, null), 59400);
  assert.equal(adapter.startPosition('45', 20000), 10000);
  assert.equal(adapter.startPosition('start', 180000, 45000), 0);
});
test('seek waits for confirmed URI, happens once and ignores stale song events', async () => {
  const listeners = {}, seeks = [];
  const sp = { Player: { data: { item: { uri: 'previous' } }, getDuration: () => 180000,
    addEventListener: (e, fn) => { listeners[e] = fn; }, removeEventListener: e => delete listeners[e],
    playUri: async () => {}, seek: ms => seeks.push(ms) } };
  const player = adapter.player(sp, () => {});
  player.request(track, '45'); await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(seeks, []);
  sp.Player.data.item = { uri }; listeners.songchange(); listeners.onplaypause(); assert.deepEqual(seeks, [45000]);
  player.request({ ...track, uri: 'new' }, '30'); listeners.songchange(); assert.deepEqual(seeks, [45000]);
  sp.Player.data.item = { uri: 'new' }; listeners.songchange(); assert.deepEqual(seeks, [45000, 30000]);
  player.dispose();
});
test('unavailable analysis falls back without blocking playback', async () => {
  const listeners = {}, seeks = [];
  const sp = { getAudioData: async () => { throw Error('Unavailable'); }, Player: { data: {}, getDuration: () => 120000,
    addEventListener: (e, fn) => { listeners[e] = fn; }, removeEventListener: e => delete listeners[e],
    playUri: async target => { sp.Player.data.item = { uri: target }; }, seek: ms => seeks.push(ms) } };
  const player = adapter.player(sp, () => {}); player.request(track);
  await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(seeks, [39600]); player.dispose();
});
