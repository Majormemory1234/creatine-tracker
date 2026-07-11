# creatinectl

A local-first daily creatine tracker with a Linux-rice-inspired interface, built as a dependency-free static site for GitHub Pages.

## Features

- Add a creatine dose with an automatic exact date/time stamp
- Daily total, configurable goal, progress ring, streak, and 7-day chart
- Timestamped entry history with delete/reset controls
- JSON export and import for backups
- Tokyo Night, Catppuccin, and Gruvbox themes
- Responsive layout and keyboard-accessible controls
- Single-user convenience login (`test` / `test`)

## Important privacy limitation

GitHub Pages only serves public static files. It cannot securely validate a password or host a private database. The login in this app is therefore a **convenience gate, not secure authentication**; anyone can inspect the public source and recover the credentials.

Tracker data is kept in the current browser's `localStorage` and is not committed to GitHub or synchronized between devices. Use **Export** to make backups.

For real private authentication and cross-device sync, connect the frontend to a backend such as Supabase, Firebase, or a small server-side API, and store credentials only on that backend.

## Local development

```bash
python3 -m http.server 8080
```

Then visit <http://localhost:8080>.

## Tests

```bash
node --test tests/core.test.mjs
```
