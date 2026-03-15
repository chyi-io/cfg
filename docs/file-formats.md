# File Formats

This document describes each supported configuration file format in detail.

## Teltonika `.cfg`

Gzip-compressed text files with semicolon-delimited key:value pairs.

### Raw Format (after decompression)

```
2004:connect.tmtx.io;2005:11919;2006:0;100:0;101:1;
```

### Structure

| Property | Value |
|----------|-------|
| **Compression** | Standard gzip |
| **Encoding** | UTF-8 text |
| **Delimiter** | Semicolon `;` between pairs |
| **Separator** | Colon `:` between key and value |
| **Keys** | Numeric parameter IDs (e.g. `2004`) |
| **Values** | Strings (numbers, IPs, enums stored as text) |

### Detection

- Gzip magic bytes `0x1f 0x8b` at file start
- After decompression, content matches `\d+:.+;` pattern

### Device Detection

| Condition | Device |
|-----------|--------|
| CAN Adapter params present (30000+) | FMC |
| Otherwise | FMB |

### Parameter ID Ranges

| Range | Category |
|-------|----------|
| 0–99 | System |
| 100–199 | Security |
| 200–299 | Sleep Mode |
| 1000–1999 | Data Acquisition |
| 2000–2099 | GPRS / Server |
| 10000–10999 | I/O Settings |
| 11000–11999 | Geofencing |
| 30000–30099 | CAN Adapter (FMC only) |
| 50000–50049 | OBD PIDs (FMC only) |

---

## Ruptela `.rcfg` / `.txt`

Text-based format with `key=value` pairs, one per line.

### Format

```
DeviceIMEI=123456789012345
ServerDomain=track.example.com
ServerPort=6001
ReportInterval=60
```

### Structure

| Property | Value |
|----------|-------|
| **Compression** | None (plain text) |
| **Encoding** | UTF-8 |
| **Delimiter** | Newline between pairs |
| **Separator** | Equals `=` between key and value |
| **Keys** | Descriptive strings (e.g. `ServerDomain`) |
| **Comments** | Lines starting with `#` or `;` are ignored |

### Detection

- File extension `.rcfg` or `.txt`
- Presence of known Ruptela keys (e.g. `DeviceIMEI`, `ServerDomain`)

---

## Chafon `.ini`

Standard INI format with `[Section]` headers.

### Format

```ini
[Basic]
Baud=9600
Power=33
Region=USA
Workmode=Active Mode

[Antenna]
Ant1=True
AntPower1=33
Ant2=False

[Advanced]
PasswordEnable=False
PasswordHEX=FF FF FF FF

[Remote]
IsEnable=True
RemoteIP=192.168.1.100
RemotePort=1801
HeartbeatTime=232
```

### Structure

| Property | Value |
|----------|-------|
| **Compression** | None (plain text) |
| **Encoding** | UTF-8 |
| **Sections** | `[Basic]`, `[Antenna]`, `[Advanced]`, `[Remote]` |
| **Separator** | Equals `=` between key and value |
| **Keys** | Descriptive strings, globally unique across sections |

### Detection

- File extension `.ini`
- Presence of known section headers: `[Basic]`, `[Antenna]`, `[Advanced]`, `[Remote]`

### Section → Category Mapping

| INI Section | UI Category |
|------------|-------------|
| `[Basic]` | Basic |
| `[Antenna]` | Antenna |
| `[Advanced]` | Advanced |
| `[Remote]` | Remote |

### Parameter Types

Chafon uses typed values in the INI file:

| Type | Example | UI Control |
|------|---------|------------|
| Boolean | `True` / `False` | Dropdown |
| Numeric | `9600`, `33` | Number input with range |
| String | `192.168.1.100` | Text input |
| Enum | `Active Mode`, `USA` | Dropdown |

---

## Adding a New Format

To support a new file format:

1. Create `vendors/<name>/parser.ts` implementing `parse()` and `generate()`
2. Handle compression/encoding as needed (use `DecompressionStream`/`CompressionStream` for gzip)
3. Always return a flat `Record<string, string>` from `parse()`
4. The `generate()` function must produce the exact binary format the device expects
5. Add robust error handling — return `{ success: false, error: "..." }` for invalid files
6. Add detection logic that distinguishes your format from others

See the [Adding a Vendor](/docs/add-vendor) guide for the complete implementation walkthrough.
