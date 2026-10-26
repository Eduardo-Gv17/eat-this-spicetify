const fs = require('node:fs');
const path = require('node:path');
const tiles = [
  [10, 8, '#76604d', '#e1bd8d'], [9, 8, '#793344', '#f2a4a0'], [8, 8, '#365b69', '#a9d5d5'],
  [7, 8, '#816541', '#e1d29d'], [7, 9, '#3e4b7a', '#b8bfe4'], [7, 10, '#785051', '#e5b7a5'],
  [7, 11, '#44674d', '#c8d6a6'], [6, 11, '#5d4771', '#caafdc'], [5, 11, '#686454', '#dfd9bf']
];
const n = 25, bx = 610, by = 99;
let grid = '';
for (let i = 1; i < 20; i++) grid += `<path d="M${bx + i*n} ${by}v500 M${bx} ${by+i*n}h500" stroke="#ffffff" stroke-opacity=".025"/>`;
const covers = tiles.map(([x,y,a,b],i) => `<g transform="translate(${bx+x*n+.65} ${by+y*n+.65})"><rect width="23.7" height="23.7" rx="3" fill="${a}"/><circle cx="${7+i%3}" cy="10" r="9" fill="${b}" opacity=".7"/><path d="M0 22L24 7v17H0" fill="${b}" opacity=".4"/></g>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img" aria-labelledby="title desc">
<title id="title">Eat This — your playlists, one hungry snake</title><desc id="desc">Illustrated preview of a dark Snake board with a green head, connected cover tiles, and an outlined food tile. Uses placeholder artwork.</desc>
<rect width="1200" height="720" rx="24" fill="#101010"/>
<rect x="24" y="24" width="1152" height="672" rx="18" fill="#181818" stroke="#303030"/>
<g font-family="Segoe UI,Arial,sans-serif">
<text x="74" y="113" fill="#1ed760" font-size="12" font-weight="700" letter-spacing="3">YOUR PLAYLIST. YOUR GAME.</text>
<text x="70" y="209" fill="#fff" font-size="84" font-weight="800" letter-spacing="-5">Eat This</text>
<text x="74" y="263" fill="#e5e5e5" font-size="21">One hungry snake.</text>
<text x="74" y="295" fill="#b3b3b3" font-size="21">A whole playlist to discover.</text>
<rect x="74" y="341" width="188" height="40" rx="20" fill="#1ed760"/>
<text x="168" y="366" text-anchor="middle" fill="#0c2917" font-size="14" font-weight="700">Made for Spicetify</text>
<path d="M74 423H489" stroke="#ffffff" stroke-opacity=".12"/>
<text x="74" y="459" fill="#fff" font-size="16" font-weight="600">Pick a saved playlist.</text>
<text x="74" y="491" fill="#fff" font-size="16" font-weight="600">Eat a cover. Hear its song.</text>
<text x="74" y="545" fill="#b3b3b3" font-size="14">Arrow keys / WASD</text>
<text x="74" y="570" fill="#b3b3b3" font-size="14">Space to pause the game</text>
<text x="74" y="645" fill="#777" font-size="12">Illustrated gameplay · placeholder artwork</text>
<text x="610" y="73" fill="#fff" font-size="15" font-weight="700">9 portadas</text>
<text x="1110" y="73" text-anchor="end" fill="#b3b3b3" font-size="13">Pausar</text>
<rect x="${bx}" y="${by}" width="500" height="500" rx="10" fill="#121212" stroke="#333"/>
${grid}
<path d="M${bx+11.5*n} ${by+8.5*n}H${bx+7.5*n}V${by+11.5*n}H${bx+5.5*n}" fill="none" stroke="#237c43" stroke-width="18.5" stroke-linejoin="round" stroke-linecap="round"/>
${covers}
<g transform="translate(${bx+11*n+.5} ${by+8*n+.5})"><rect width="24" height="24" rx="6" fill="#1ed760"/><circle cx="17" cy="8" r="1.5" fill="#102a19"/><circle cx="17" cy="16" r="1.5" fill="#102a19"/></g>
<g transform="translate(${bx+15*n} ${by+8*n})"><rect x=".9" y=".9" width="23.2" height="23.2" rx="4.5" fill="none" stroke="#a7e5bb" stroke-width="1.5"/><rect x="2.5" y="2.5" width="20" height="20" rx="3" fill="#89744a"/><circle cx="12.5" cy="12.5" r="7" fill="#e2c98f"/><circle cx="12.5" cy="12.5" r="2" fill="#89744a"/></g>
<text x="610" y="634" fill="#1ed760" font-size="10" font-weight="700" letter-spacing="2">SONANDO EN SPOTIFY</text>
<text x="610" y="660" fill="#e5e5e5" font-size="16" font-weight="600">Your next favorite track</text>
<text x="1110" y="660" text-anchor="end" fill="#777" font-size="12">v0.1.0</text>
</g></svg>`;
fs.writeFileSync(path.join(__dirname, '../assets/preview.svg'), svg);
console.log('Generated assets/preview.svg');
