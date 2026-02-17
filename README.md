# Lumina Docs

```
  ██╗     ██╗   ██╗███╗   ███╗██╗███╗   ██╗ █████╗
  ██║     ██║   ██║████╗ ████║██║████╗  ██║██╔══██╗
  ██║     ██║   ██║██╔████╔██║██║██╔██╗ ██║███████║
  ██║     ██║   ██║██║╚██╔╝██║██║██║╚██╗██║██╔══██║
  ███████╗╚██████╔╝██║ ╚═╝ ██║██║██║ ╚████║██║  ██║
  ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
```

Documentation for **Lumina** — automatic REST API for Laravel. Built for the AI era: register a model, get full CRUD, auth, validation, and querying with zero boilerplate.

---

[**📖 Read the documentation**](https://startsoft-dev.github.io/lumina-docs/)

---

## Repositories

| Package | Description |
|--------|-------------|
| [**lumina-server**](https://github.com/startsoft-dev/lumina-server) | Laravel package — automatic REST API generation |
| [**lumina-client**](https://github.com/startsoft-dev/lumina-client) | React / React Native client for Lumina APIs |

---

This site is built with [Docusaurus](https://docusaurus.io/).

### Installation

```bash
yarn
```

### Local Development

```bash
yarn start
```

### Build

```bash
yarn build
```

### Deployment (GitHub Pages)

1. **Settings → Pages** → set **Source** to **GitHub Actions**
2. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and deploys.
3. Live at `https://<owner>.github.io/lumina-docs/`

Manual deploy: `GIT_USER=<username> yarn deploy` or `USE_SSH=true yarn deploy`.
