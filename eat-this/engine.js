var EatThisEngine = (() => {
  const size = 20;
  function create(tracks, random = Math.random) {
    if (!tracks.length) throw new Error('La playlist no contiene canciones jugables.');
    const order = [...tracks];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const state = { snake: [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }], direction: { x: 1, y: 0 }, next: { x: 1, y: 0 }, turned: false, score: 0, cursor: 0, over: false, won: false, food: null };
    function spawn() {
      const empty = [];
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!state.snake.some(s => s.x === x && s.y === y)) empty.push({ x, y });
      if (!empty.length) { state.over = state.won = true; state.food = null; return; }
      state.food = { ...empty[Math.floor(random() * empty.length)], track: order[state.cursor++ % order.length] };
    }
    spawn();
    return { state, turn(dir) {
      if (!dir || state.turned || state.over || Math.abs(dir.x) + Math.abs(dir.y) !== 1 || (dir.x === -state.direction.x && dir.y === -state.direction.y)) return;
      state.next = dir; state.turned = true;
    }, step() {
      if (state.over) return null;
      state.direction = state.next; state.turned = false;
      const head = { x: state.snake[0].x + state.direction.x, y: state.snake[0].y + state.direction.y };
      const eating = head.x === state.food.x && head.y === state.food.y;
      const body = eating ? state.snake : state.snake.slice(0, -1);
      if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || body.some(s => s.x === head.x && s.y === head.y)) { state.over = true; return null; }
      const track = eating ? state.food.track : null;
      if (track) head.track = track;
      state.snake.unshift(head);
      if (track) { state.score++; spawn(); } else state.snake.pop();
      return track;
    } };
  }
  return { create, size };
})();
if (typeof module !== 'undefined') module.exports = EatThisEngine;
