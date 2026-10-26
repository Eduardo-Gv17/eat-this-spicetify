# Contributing

Thanks for helping more people play Eat This.

## Report a bug

Search existing issues first. Include your OS, Spotify version, Spicetify version (`spicetify --version`), Eat This release, steps to reproduce, and expected versus actual behavior. Screenshots and relevant console errors help. Remove account tokens and private information before posting logs.

## Make a change

1. Fork the repository and create a branch for one focused change.
2. Edit the files under `eat-this/`. No compiler or npm install is needed.
3. Run `node --test tests/game.test.cjs` and `node scripts/check-package.cjs`.
4. Copy your app folder to your local `CustomApps` directory and run `spicetify apply`.
5. Check library selection, playback, fragments, keyboard controls, restart, and leaving/reopening the app when relevant.
6. Open a pull request explaining the resulting behavior, checks performed, and tested client versions.

Keep the interface minimal and consistent with Spotify. Clean up event listeners and timers, keep engine logic independent of Spotify, and handle unavailable internal APIs with useful messages. Use mocked tests for integration logic and real-client testing for playback and UI changes.

## Useful contributions

- Report exact working Spotify/Spicetify versions and platform details.
- Test Linux and macOS installation.
- Improve keyboard access and library compatibility.
- Help add English and other in-app translations.

By contributing, you agree that your contribution is distributed under this repository's MIT license.
