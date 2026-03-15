# Getting Started

The **Chyi Hardware Configurator** is a multi-vendor web application for
uploading, editing, and generating IoT device configuration files.

## Prerequisites

- **Deno** v2.x or later — [deno.land](https://deno.land)
- **Node.js** (optional, for `node_modules` resolution)

## Installation

```bash
git clone <repo-url>
cd cfg
deno install
```

## Development

```bash
# Start dev server with Vite HMR
deno task dev

# Run all tests
deno task test

# Run tests in watch mode
deno task test:watch

# Production build
deno task build

# Generate JSDoc API docs
deno task docs
```

## Available Tasks

| Task         | Command                | Description                    |
| ------------ | ---------------------- | ------------------------------ |
| `dev`        | `deno task dev`        | Start Vite dev server with HMR |
| `build`      | `deno task build`      | Production build               |
| `start`      | `deno task start`      | Serve production build         |
| `test`       | `deno task test`       | Run all tests                  |
| `test:watch` | `deno task test:watch` | Tests in watch mode            |

## Tech Stack

- **Deno Fresh 2.x** — Server-side rendered framework with islands architecture
- **Preact** — Lightweight React-compatible UI library
- **Vite 7** — Dev server and build tool
- **Tailwind CSS v4** — Utility-first styling
- **Zod** — Schema validation for parameters
- **Marked** — Markdown rendering for documentation pages

## Supported Vendors

| Vendor        | Devices                | File Format                        |
| ------------- | ---------------------- | ---------------------------------- |
| **Teltonika** | FMB Series, FMC Series | `.cfg` (gzip-compressed key:value) |
| **Ruptela**   | ECO5                   | `.rcfg` / `.txt` (INI-like)        |
| **Chafon**    | UHF Reader M-Series    | `.ini` (sectioned INI)             |

## Project Structure

```
cfg/
├── main.ts                          # App entry, vendor registration
├── routes/
│   ├── index.tsx                    # Landing page
│   ├── config.tsx                   # Legacy /config (sessionStorage)
│   ├── config/[vendor]/[device].tsx # Dynamic config route
│   ├── docs.tsx                     # Docs hub
│   ├── docs/[slug].tsx              # Individual doc page
│   └── api/                         # REST endpoints
├── islands/
│   ├── HomePage.tsx                 # Vendor picker + file upload
│   ├── ConfigEditor.tsx             # Main editor (state + layout)
│   ├── ConfigLoaderIsland.tsx       # URL-param config loader
│   ├── ConfigPageIsland.tsx         # SessionStorage config loader
│   └── DocsIsland.tsx               # Documentation viewer
├── components/
│   ├── types.ts                     # Shared client types
│   ├── ParamField.tsx               # Single parameter input
│   ├── Sidebar.tsx                  # Category navigation
│   ├── CategoryPanel.tsx            # Parameter grid for a category
│   ├── MessageBanner.tsx            # Success/error banner
│   └── BottomBar.tsx                # Status bar + download button
├── lib/
│   ├── types.ts                     # Core server interfaces
│   ├── registry.ts                  # Vendor registration + detection
│   ├── validation.ts                # Zod validation + serialization
│   └── http.ts                      # Shared JSON response helper
├── vendors/
│   ├── teltonika/                   # Teltonika plugin
│   ├── ruptela/                     # Ruptela plugin
│   └── chafon/                      # Chafon plugin
├── docs/                            # Markdown documentation
└── tests/                           # Test suites + fixtures
```
