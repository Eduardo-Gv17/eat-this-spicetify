/* Minimal canvas renderer. Kept separate from game and playback behavior. */
var EatThisBoard = (() => {
  function draw(canvas, state, images, redraw) {
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    const cell = canvas.width / EatThisEngine.size;
    function rounded(x, y, width, height, radius) {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
    }
    function cover(track, x, y, inset, radius) {
      let img = images.get(track.uri);
      if (track.image && !img) {
        img = new Image(); images.set(track.uri, img);
        img.onload = redraw; img.src = track.image;
      }
      ctx.save();
      rounded(x + inset, y + inset, cell - inset * 2, cell - inset * 2, radius);
      ctx.clip();
      ctx.fillStyle = '#343434'; ctx.fillRect(x, y, cell, cell);
      if (img?.complete && img.naturalWidth) ctx.drawImage(img, x + inset, y + inset, cell - inset * 2, cell - inset * 2);
      ctx.restore();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#121212'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff05';
    for (let i = 1; i < 20; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, canvas.height);
      ctx.moveTo(0, i * cell); ctx.lineTo(canvas.width, i * cell); ctx.stroke();
    }
    // A narrow continuous base joins the covers without obscuring their artwork.
    ctx.lineWidth = cell * .74; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#237c43';
    ctx.beginPath();
    state.snake.forEach((s, i) => {
      const x = (s.x + .5) * cell, y = (s.y + .5) * cell;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.stroke();
    state.snake.slice(1).forEach(s => {
      const x = s.x * cell, y = s.y * cell;
      if (s.track) cover(s.track, x, y, .65, cell * .12);
      else { ctx.fillStyle = '#237c43'; rounded(x + .65, y + .65, cell - 1.3, cell - 1.3, cell * .16); ctx.fill(); }
    });
    const head = state.snake[0];
    if (head) {
      const x = head.x * cell, y = head.y * cell;
      ctx.fillStyle = '#1ed760'; rounded(x + .5, y + .5, cell - 1, cell - 1, cell * .24); ctx.fill();
      const dir = state.direction;
      ctx.fillStyle = '#102a19';
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.arc(x + cell * (.5 + dir.x * .2 - dir.y * side * .17), y + cell * (.5 + dir.y * .2 + dir.x * side * .17), cell * .055, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (state.food) {
      const x = state.food.x * cell, y = state.food.y * cell;
      cover(state.food.track, x, y, 2.5, cell * .13);
      // Crisp outline instead of glow, particles or a larger moving target.
      ctx.strokeStyle = '#a7e5bb'; ctx.lineWidth = 1.5;
      rounded(x + .9, y + .9, cell - 1.8, cell - 1.8, cell * .18); ctx.stroke();
    }
  }
  return { draw };
})();
