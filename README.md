# Compound Readings

A phone-first study web app for advanced Japanese learners who have passed JLPT N1 and still hesitate on how compound kanji words are read: whether each character takes its Chinese-derived (音) or native (訓) reading, and why. It is built first for Dan, its first user, and may later be offered to other N1+ learners. It is a static site with no backend, opened in Chrome on an Android phone in five-minute sessions the learner starts himself.

## Screenshots

`npm run build && npm run screenshots -- --set session-4 --out reports/screenshots/session-4` renders a fixed list of screens at 380×915 and 1280×800 with `playwright-core`; it needs a Chromium already on the machine, found from `CHROMIUM_PATH` or under `PLAYWRIGHT_BROWSERS_PATH` (no browser is downloaded).
