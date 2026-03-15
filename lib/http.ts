/**
 * Shared HTTP response helpers for API routes.
 * @module
 */

/**
 * Create a JSON response with the given data and status code.
 *
 * @param data - Response body (will be JSON-serialized).
 * @param status - HTTP status code (default: 200).
 * @returns A `Response` with `Content-Type: application/json`.
 */
export const jsonResponse = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
