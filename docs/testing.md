# Testing

The project uses Deno's built-in test runner with assertions from the standard library.

## Running Tests

```bash
# Run all tests
deno task test

# Run tests in watch mode
deno task test:watch

# Run a specific test file
deno test -A tests/registry_test.ts

# Run tests matching a pattern
deno test -A --filter "parser"
```

## Test Organization

```
tests/
├── registry_test.ts       # Registry, auto-detection, structured config
├── validation_test.ts     # Zod validation, serialization, compatibility
├── teltonika/
│   ├── parser_test.ts     # .cfg parse + generate round-trips
│   ├── schema_test.ts     # Parameter schema coverage
│   └── category_test.ts   # Categorization logic
├── chafon/
│   ├── parser_test.ts     # .ini parse + generate round-trips
│   └── schema_test.ts     # Parameter schema coverage
└── fixtures/
    ├── sample.cfg         # Sanitized Teltonika config
    └── sample.ini         # Sanitized Chafon config
```

## Writing Tests

### Basic Test Structure

```ts
import { assertEquals, assertExists } from "$std/assert/mod.ts";
import { registerVendor, _clearVendors } from "../lib/registry.ts";
import { teltonikaPlugin } from "../vendors/teltonika/mod.ts";

Deno.test("my test group", async (t) => {
  // Setup
  _clearVendors();
  registerVendor(teltonikaPlugin);

  await t.step("sub-test name", () => {
    // Test logic
    assertEquals(1 + 1, 2);
  });
});
```

### Parser Round-Trip Tests

Verify that parsing a file and regenerating it produces equivalent output:

```ts
Deno.test("round-trip parse → generate → parse", async () => {
  const original = await Deno.readFile("tests/fixtures/sample.cfg");

  const parsed = await teltonikaPlugin.parse(original);
  assert(parsed.success);

  const regenerated = await teltonikaPlugin.generate(parsed.config!);
  const reparsed = await teltonikaPlugin.parse(regenerated);
  assert(reparsed.success);

  assertEquals(parsed.config, reparsed.config);
});
```

### Schema Coverage Tests

Ensure all device params have proper schemas:

```ts
Deno.test("all FMB params have schemas", () => {
  for (const [id, schema] of Object.entries(fmbDevice.paramSchemas)) {
    assertExists(schema.name, `Param ${id} missing name`);
    assertExists(schema.category, `Param ${id} missing category`);
    assertExists(schema.zodSchema, `Param ${id} missing zodSchema`);
  }
});
```

### Validation Tests

Test parameter validation with Zod schemas:

```ts
Deno.test("validates number range", () => {
  const schema = fmbDevice.paramSchemas["1000"];
  const result = validateParam(schema, "999999");
  assertEquals(result.valid, false);
});
```

### Detection Tests

Verify device auto-detection:

```ts
Deno.test("detects FMC from CAN params", () => {
  const config = { "30000": "1", "2004": "example.com" };
  const device = teltonikaPlugin.detectDevice(config);
  assertEquals(device, "fmc");
});
```

## Test Fixtures

Sample config files live in `tests/fixtures/`. These are **sanitized** copies of real device configs with sensitive data (server IPs, IMEIs, etc.) replaced with dummy values.

### Creating Fixtures

1. Copy a real config file
2. Replace sensitive values:
   - Server addresses → `example.com` or `0.0.0.0`
   - IMEIs → `123456789012345`
   - Passwords → `password`
3. Place in `tests/fixtures/` with a descriptive name

## Test Conventions

- Use `_clearVendors()` before registering vendors in tests to avoid conflicts
- Group related tests with `Deno.test("group", async (t) => { ... })`
- Use `t.step()` for sub-tests
- Test both success and failure paths
- Include edge cases: empty strings, boundary values, invalid formats
- Keep fixtures minimal — only include params needed for the test
