# Chyi Hardware Configurator

A multi-vendor web application for uploading, editing, and generating IoT device
configuration files. Built with **Deno Fresh 2.x**, **Preact**, and **Tailwind
CSS v4**.

## Supported Vendors

| Vendor        | Devices                | File Format                        |
| ------------- | ---------------------- | ---------------------------------- |
| **Teltonika** | FMB Series, FMC Series | `.cfg` (gzip-compressed key:value) |
| **Ruptela**   | ECO5                   | `.rcfg` / `.txt` (INI-like)        |
| **Chafon**    | UHF Reader M-Series    | `.ini` (sectioned INI)             |

## Features

- **Auto-detection** — Upload any supported config file; vendor and device are
  detected automatically
- **URL-based routing** — Shareable URLs: `/config/teltonika/fmb`,
  `/config/chafon/m_series`
- **Zod validation** — Per-parameter type/range/enum validation with inline
  error feedback
- **Device compatibility** — Incompatible parameters shown as disabled, excluded
  from downloads
- **Search & filter** — Sidebar search across parameter names, IDs, and
  descriptions
- **Create from defaults** — Start a new config for any vendor/device with one
  click

## Quick Start

```bash
deno task dev      # Development (Vite HMR)
deno task build    # Production build
deno task test     # Run all tests
```

## API Routes

| Method | Path                            | Description                                 |
| ------ | ------------------------------- | ------------------------------------------- |
| `GET`  | `/api/vendors`                  | List all registered vendors and devices     |
| `GET`  | `/api/defaults?vendor=&device=` | Get default config for a device             |
| `POST` | `/api/upload`                   | Upload and auto-detect a config file        |
| `POST` | `/api/download`                 | Validate and generate a downloadable config |

## Project Structure

```
cfg/
├── main.ts                          # App entry, vendor registration
├── routes/
│   ├── index.tsx                    # Landing page
│   ├── config.tsx                   # Legacy /config (sessionStorage)
│   ├── config/[vendor]/[device].tsx # Dynamic config route
│   └── api/                         # REST endpoints
├── islands/
│   ├── HomePage.tsx                 # Vendor picker + file upload
│   ├── ConfigEditor.tsx             # Main editor (state + layout)
│   ├── ConfigLoaderIsland.tsx       # URL-param config loader
│   └── ConfigPageIsland.tsx         # SessionStorage config loader
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
└── tests/
    ├── registry_test.ts
    ├── validation_test.ts
    ├── teltonika/                   # Vendor-specific tests
    ├── chafon/
    └── fixtures/                    # Sanitized sample configs
```

## Documentation

Full documentation is hosted at [`/docs`](/docs) when the app is running. It
includes:

| Guide                                    | Description                                       |
| ---------------------------------------- | ------------------------------------------------- |
| [Getting Started](/docs/getting-started) | Installation, tasks, tech stack                   |
| [Architecture](/docs/architecture)       | Plugin system, data flow, component tree          |
| [Adding a Vendor](/docs/add-vendor)      | Step-by-step guide with code examples             |
| [Adding a Device](/docs/add-device)      | Adding a device variant to an existing vendor     |
| [API Reference](/docs/api-reference)     | All REST endpoints with request/response examples |
| [File Formats](/docs/file-formats)       | Detailed format specs for each vendor             |
| [UI Components](/docs/ui-components)     | Islands, components, shared types                 |
| [Testing](/docs/testing)                 | Test runner, conventions, fixtures                |
