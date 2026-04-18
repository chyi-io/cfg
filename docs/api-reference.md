# API Reference

All API routes return JSON unless otherwise noted. Error responses use
`{ "error": "message" }`.

## `GET /api/vendors`

List all registered vendors and their devices.

### Response

```json
{
  "vendors": [
    {
      "id": "teltonika",
      "name": "Teltonika",
      "fileExtensions": [".cfg"],
      "devices": [
        {
          "id": "fmb",
          "name": "Teltonika FMB Series",
          "vendorId": "teltonika",
          "categoryCount": 19,
          "paramCount": 1378
        },
        {
          "id": "fmc",
          "name": "Teltonika FMC Series",
          "vendorId": "teltonika",
          "categoryCount": 19,
          "paramCount": 1528
        }
      ]
    }
  ]
}
```

---

## `GET /api/defaults?vendor=&device=`

Get a full default configuration for a vendor/device pair.

### Query Parameters

| Param    | Required | Description                  |
| -------- | -------- | ---------------------------- |
| `vendor` | Yes      | Vendor ID (e.g. `teltonika`) |
| `device` | Yes      | Device ID (e.g. `fmb`)       |

### Success Response (200)

Returns a `ConfigPayload` object:

```json
{
  "vendorId": "teltonika",
  "deviceId": "fmb",
  "config": {
    "2004": "connect.example.io",
    "2005": "11919",
    ...
  },
  "structured": {
    "gprs_server": { "2004": "connect.example.io", "2005": "11919" },
    "system": { "100": "0", ... },
    ...
  },
  "categories": [
    { "id": "system", "label": "System", "icon": "⚙️", "color": "...", "order": 0 },
    ...
  ],
  "paramMetas": {
    "2004": {
      "id": "2004",
      "name": "Server Domain",
      "description": "Primary server hostname or IP",
      "category": "gprs_server",
      "type": "string",
      "hint": "e.g. connect.example.io",
      "compatible": true
    },
    ...
  }
}
```

### Error Responses

| Status | Condition                                    |
| ------ | -------------------------------------------- |
| 400    | Missing `vendor` or `device` query parameter |
| 404    | Unknown vendor ID                            |
| 404    | Unknown device ID for vendor                 |

---

## `POST /api/upload`

Upload a config file for auto-detection and parsing.

### Request

`Content-Type: multipart/form-data`

| Field  | Type | Description                      |
| ------ | ---- | -------------------------------- |
| `file` | File | The configuration file to upload |

### Success Response (200)

Same `ConfigPayload` structure as `/api/defaults`, but with the parsed config
values from the uploaded file.

### Auto-Detection Process

1. The server iterates through all registered vendors
2. For each vendor, checks if the file extension matches
3. Attempts to parse the file with the vendor's parser
4. On success, calls `detectDevice()` to identify the hardware variant
5. Builds the full vendor config with compatibility metadata

### Error Responses

| Status | Condition                               |
| ------ | --------------------------------------- |
| 400    | No file provided in the form data       |
| 400    | No vendor could parse the uploaded file |

---

## `POST /api/download`

Validate and generate a downloadable config file.

### Request

`Content-Type: application/json`

```json
{
  "vendorId": "teltonika",
  "deviceId": "fmb",
  "config": {
    "2004": "connect.example.io",
    "2005": "11919",
    ...
  }
}
```

### Success Response (200)

Binary file with appropriate content type:

```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="config.cfg"
```

### Validation

Before generating the file, the server validates every parameter value against
its Zod schema. If there are validation errors, the download is rejected.

### Error Responses

| Status | Condition                                                                                                 |
| ------ | --------------------------------------------------------------------------------------------------------- |
| 400    | Missing `vendorId`, `deviceId`, or `config`                                                               |
| 400    | Validation errors — returns `{ "error": "Validation failed", "details": { "2004": "Must be a string" } }` |
| 404    | Unknown vendor or device ID                                                                               |

---

## `GET /api/docs`

List all available documentation pages.

### Response

```json
{
  "pages": [
    { "slug": "getting-started", "title": "Getting Started" },
    { "slug": "architecture", "title": "Architecture" },
    ...
  ]
}
```

---

## `GET /api/docs/[slug]`

Get a single documentation page rendered as HTML.

### Response

```json
{
  "slug": "getting-started",
  "title": "Getting Started",
  "html": "<h1>Getting Started</h1>..."
}
```

---

## JSDoc API Docs

Auto-generated API documentation from source code JSDoc comments is available at
[`/docs/api/`](/docs/api/) after running:

```bash
deno task docs
```

This generates HTML documentation for all core library modules and vendor
plugins.
