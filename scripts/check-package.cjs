const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const app = path.join(root, 'eat-this');
const manifest = JSON.parse(fs.readFileSync(path.join(app, 'manifest.json'), 'utf8'));
const files = ['index.js', 'style.css', ...manifest.subfiles, ...manifest.subfiles_extension];
for (const file of files) {
  const target = path.resolve(app, file);
  if (!target.startsWith(app + path.sep) || !fs.existsSync(target)) throw new Error(`Missing or invalid app file: ${file}`);
  if (file.endsWith('.js')) new vm.Script(fs.readFileSync(target, 'utf8'), { filename: file });
}
const ctx = { Spicetify: { React: { createElement: type => ({ type }) } } };
vm.createContext(ctx);
for (const file of ['index.js', ...manifest.subfiles]) vm.runInContext(fs.readFileSync(path.join(app, file), 'utf8'), ctx);
if (ctx.render().type !== ctx.EatThisApp) throw new Error('Invalid Custom App entry point.');
console.log('Installed manifest, app entry point, and JavaScript syntax are valid.');
