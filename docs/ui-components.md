# UI Components

The configurator UI is built with **Preact** using the Fresh 2.x **islands architecture**. Interactive components live in `islands/`, while presentational components live in `components/`.

## Islands vs Components

| | Islands (`islands/`) | Components (`components/`) |
|--|---------------------|---------------------------|
| **Hydrated** | Yes — shipped as JS to browser | No — rendered server-side or by parent island |
| **State** | Can hold `useState`, `useEffect` | Receive props from parent |
| **Use for** | Pages, top-level interactive containers | Reusable UI building blocks |

## Component Tree

```
ConfigEditor (island — state owner)
├── Sidebar (component — category nav + search)
├── CategoryPanel (component — param grid)
│   └── ParamField (component — single input)
├── MessageBanner (component — success/error)
└── BottomBar (component — status + download)
```

## Islands

### `HomePage.tsx`

The landing page island. Fetches vendors from `/api/vendors`, provides file upload (drag & drop), search/filter, and "Create New" buttons for each device.

**Key state:**
- `vendors` — fetched vendor/device list
- `search` — filter input value
- `uploading` / `creating` — loading states
- `error` — error message display

### `ConfigEditor.tsx`

The main editor island. Owns all configuration state and passes it down to child components.

**Key state:**
- `config` — `Record<string, string>` of all parameter values
- `activeCategory` — currently selected sidebar category
- `searchQuery` — parameter search filter
- `validationErrors` — `Record<string, string>` of param → error
- `message` / `messageType` — success/error banner

**Memoized computations:**
- `sortedCategories` — filtered and sorted category list
- `getMeta` — param metadata lookup with fallback
- `compatibleParams` — count of compatible parameters
- `getFilteredParams` — search-filtered param list per category

### `ConfigLoaderIsland.tsx`

URL-parameter-based config loader. Used by the `/config/[vendor]/[device]` route. Checks sessionStorage first (for upload flow), falls back to `/api/defaults`.

### `ConfigPageIsland.tsx`

Legacy sessionStorage-based config loader. Used by the `/config` route for backward compatibility.

### `DocsIsland.tsx`

Documentation viewer. Fetches markdown content from `/api/docs/[slug]`, renders HTML with navigation sidebar.

## Components

### `ParamField.tsx`

Renders a single parameter input field.

**Props:**
- `paramId` — parameter ID string
- `value` — current value
- `meta` — `ParamMeta` with name, description, type, options, etc.
- `error` — validation error string (optional)
- `onValueChange` — callback `(paramId, value) => void`

**Renders:**
- `<select>` dropdown when `meta.options` is present
- `<input type="number">` when `meta.type === "number"`
- `<input type="text">` otherwise
- Disabled/greyed out when `meta.compatible === false`
- Inline validation error below the input

### `Sidebar.tsx`

Category navigation sidebar with search input.

**Props:**
- `categories` — sorted category list
- `structured` — structured config for counting params per category
- `activeCategory` — currently selected category ID
- `searchQuery` — current search string
- `validationErrors` — for showing error badges
- `sidebarOpen` — mobile responsive toggle
- `getMeta` — metadata lookup function
- Callbacks: `onCategorySelect`, `onSearchChange`, `onClose`

**Features:**
- Search input filters across param names, IDs, descriptions
- Error count badge per category
- "N/A" badge for fully incompatible categories
- Responsive: overlay on mobile, fixed on desktop

### `CategoryPanel.tsx`

Renders all parameters for a single category.

**Props:**
- `category` — the `CategoryDef` being displayed
- `filteredParams` — pre-filtered list of param IDs
- `searchQuery` — for "no results" messaging
- `config` — current config values
- `validationErrors` — per-param errors
- `getMeta` — metadata lookup
- `onValueChange` — edit callback

### `MessageBanner.tsx`

Dismissible success/error banner at the top of the editor.

**Props:**
- `message` — text to display
- `messageType` — `"success"` | `"error"` | `""`
- `onDismiss` — close callback

### `BottomBar.tsx`

Fixed bottom status bar with download button and param counts.

**Props:**
- `vendorLabel` / `deviceLabel` — display strings
- `compatibleParams` / `incompatibleParams` — counts
- `totalErrors` — validation error count
- `downloading` — loading state
- `onDownload` — download callback

## Shared Types (`components/types.ts`)

Client-side type definitions used across islands and components:

```ts
interface ParamOption { value: string; label: string; }

interface ParamMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  type: "string" | "number";
  hint?: string;
  options?: ParamOption[];
  min?: number;
  max?: number;
  compatible: boolean;
}

interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  order: number;
  deviceOnly?: string;
}

interface ConfigData {
  vendorId: string;
  deviceId: string;
  config: Record<string, string>;
  structured: Record<string, Record<string, string>>;
  categories: CategoryDef[];
  paramMetas: Record<string, ParamMeta>;
}
```

## Styling

All components use **Tailwind CSS v4** utility classes. The color scheme follows a consistent pattern:

- **Blue** — primary actions, links
- **Green** — success states
- **Red** — errors, validation
- **Gray** — neutral, disabled states
- **Category colors** — each category has its own `bg-*/text-*` pair defined in `CategoryDef.color`
