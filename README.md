# Handy Online Tools

Developer-friendly handy online tools, still in early development.

## Features

- View zip and code files
- View image
- Clipboard Inspector

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Rspack](https://rspack.dev/) (bundler / dev server)
- [Tailwind CSS](https://tailwindcss.com/) (styling)
- [Zustand](https://github.com/pmndrs/zustand) (state management)

## Getting Started

```bash
pnpm install     # install dependencies
pnpm dev         # start dev server on http://localhost:42591
pnpm build       # production build to dist/
pnpm preview     # preview the production build
pnpm typecheck
```

## Project Structure

```
src/
  apps/                # the individual tools (registered in apps/registry.ts)
    zip-viewer/
    image-viewer/
    code-viewer/
    clipboard-inspector/
  components/          # shared UI (window manager, file picker, ...)
  stores/              # Zustand stores (windows, blobs)
  lib/                 # helpers (file actions)
  utils/               # pure utilities (JSON formatter)
  Desktop.tsx          # app launcher + window layer
  main.tsx             # entry point
```

## Notes

The previous Flutter + Rust/WASM implementation has been replaced with a
pure-web stack. Zip parsing uses [`fflate`](https://github.com/101arrowz/fflate),
syntax highlighting uses [highlight.js](https://highlightjs.org/).
