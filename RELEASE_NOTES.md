First standalone release of **Eat This for Spicetify**.

## Download and install

Download **eat-this.zip** below. You do not need the automatically generated source-code archives to play.

1. Extract the ZIP and copy its **eat-this** folder to your Spicetify **CustomApps** directory.
2. Run `spicetify config custom_apps eat-this`, then `spicetify apply`.
3. Open Eat This in Spotify, pick a saved playlist, and start playing.

Spotify desktop and a working Spicetify installation are required. On Windows, the usual destination is `%APPDATA%\spicetify\CustomApps\`. Run `spicetify -c` to locate your configuration; `CustomApps` sits beside it.

## Included

- Saved-playlist browser and search, with folder traversal and link fallback.
- Native Spotify playback and configurable song fragments.
- Minimal cover-art Snake, three speeds, pause, restart, and playlist shortcuts.

The interface is currently Spanish. The estimated intense section is a musical-analysis heuristic, not a most-listened timestamp. Windows gameplay was tested by the project owner; Linux/macOS and an exact client-version matrix still need testing. Playback capabilities depend on the account and active device.

For updates, replace the whole app folder and run `spicetify apply`. See the repository README for full installation, troubleshooting, and contribution instructions.
