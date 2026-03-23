# Contributing to ClawKB

ClawKB is a knowledge base built for Human–AI Agent collaboration — where humans and AI agents work together to capture, organize, and retrieve knowledge. Contributions of all kinds are welcome.

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/hata1234/clawkb/issues) with:
- A clear description of the problem
- Steps to reproduce
- Expected vs. actual behavior
- Environment info (OS, Node version, browser if relevant)

## Suggesting Features

Open a [GitHub Issue](https://github.com/hata1234/clawkb/issues) with the label `enhancement`. Describe the use case, not just the solution — helps us understand if it fits the project direction.

---

## Development Setup

```bash
# 1. Fork & clone
git clone https://github.com/<your-username>/clawkb.git
cd clawkb/app

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and other required vars

# 4. Set up the database
npx prisma migrate dev

# 5. Start dev server
npm run dev
```

The app runs at `http://localhost:3000`.

---

## Code Style

- **TypeScript** — strict mode, no `any` unless unavoidable
- **Next.js App Router** — use server components by default, client components only when needed
- **Tailwind CSS** — utility-first; avoid inline styles
- Keep components small and focused; colocate logic close to where it's used

---

## Pull Request Process

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes with clear, atomic commits
3. Open a PR against `main` with a description that covers:
   - **What** changed
   - **Why** it was needed
   - Any **breaking changes** or migration steps
4. PRs that pass CI and have a clear description will be reviewed promptly

---

## Plugin Development

Plugins live in the `plugins/` directory. Each plugin needs at minimum:
- `manifest.json` — metadata, permissions, entry points
- `server.mjs` — server-side logic

See the **Plugins** section in [README.md](./README.md) for the full spec and examples.

---

## i18n Contributions

Translations are welcome. Current languages: English, 繁體中文, 简体中文, 日本語.

Translation files are in `src/messages/`. To add or improve a translation:
1. Copy the `en.json` file as a reference
2. Translate the values (not the keys)
3. Submit a PR — mention which language in the title

---

## License

By submitting a contribution, you agree that your code will be licensed under the [GNU Affero General Public License v3.0](./LICENSE). Make sure you have the right to contribute any code you submit.

---

## Code of Conduct

Be respectful, constructive, and inclusive. Critique ideas, not people. If something feels off, open an issue or reach out directly.
