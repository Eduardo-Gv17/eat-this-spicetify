(function eatThisMenu() {
  if (!Spicetify.ContextMenu || !Spicetify.Platform?.History) { setTimeout(eatThisMenu, 300); return; }
  new Spicetify.ContextMenu.Item('Jugar Eat This', uris => {
    Spicetify.LocalStorage.set('eat-this:playlist', uris[0]);
    Spicetify.Platform.History.push('/eat-this');
    window.dispatchEvent(new Event('eat-this:playlist'));
  }, uris => uris.length === 1 && /^spotify:playlist:[a-zA-Z0-9]{22}$/.test(uris[0]), 'play').register();
})();
