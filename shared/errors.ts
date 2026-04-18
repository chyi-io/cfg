export type StatusCode = number;

interface StatusEntry {
  name: string;
  message: string;
  http: number;
}

const STATUS_TABLE = new Map<number, StatusEntry>([
  [0x00000000, { name: "STAT_OK", message: "Success", http: 200 }],
  [0xffffff01, { name: "STAT_PORT_HANDLE_ERR", message: "Handle error or invalid serial port parameter", http: 400 }],
  [0xffffff02, { name: "STAT_PORT_OPEN_FAILED", message: "Failed to open serial port", http: 502 }],
  [0xffffff03, { name: "STAT_DLL_INNER_FAILED", message: "Internal error in dynamic library", http: 500 }],
  [0xffffff04, { name: "STAT_CMD_PARAM_ERR", message: "Invalid parameter value or unsupported by module", http: 400 }],
  [0xffffff05, { name: "STAT_CMD_SERIAL_NUM_EXIT", message: "Serial number already exists", http: 409 }],
  [0xffffff06, { name: "STAT_CMD_INNER_ERR", message: "Internal module error - command execution failed", http: 500 }],
  [0xffffff07, { name: "STAT_CMD_INVENTORY_STOP", message: "Inventory completed or no tags found", http: 200 }],
  [0xffffff08, { name: "STAT_CMD_TAG_NO_RESP", message: "Tag response timeout", http: 504 }],
  [0xffffff09, { name: "STAT_CMD_DECODE_TAG_DATA_FAIL", message: "Demodulation tag data error", http: 502 }],
  [0xffffff0a, { name: "STAT_CMD_CODE_OVERFLOW", message: "Tag data exceeds maximum transmission length", http: 502 }],
  [0xffffff0b, { name: "STAT_CMD_AUTH_FAIL", message: "Authentication failed", http: 401 }],
  [0xffffff0c, { name: "STAT_CMD_PWD_ERR", message: "Password error", http: 401 }],
  [0xffffff0f, { name: "STAT_CMD_RESP_FORMAT_ERR", message: "Reader response format error", http: 502 }],
  [0xffffff10, { name: "STAT_CMD_HAS_MORE_DATA", message: "Command success - more data follows", http: 206 }],
  [0xffffff11, { name: "STAT_CMD_BUF_OVERFLOW", message: "Input buffer too small - data overflow", http: 500 }],
  [0xffffff12, { name: "STAT_CMD_COMM_TIMEOUT", message: "Timed out waiting for reader response", http: 504 }],
  [0xffffff13, { name: "STAT_CMD_COMM_WR_FAILED", message: "Failed to write to serial/network port", http: 502 }],
  [0xffffff14, { name: "STAT_CMD_COMM_RD_FAILED", message: "Failed to read serial/network port", http: 502 }],
  [0xffffff15, { name: "STAT_CMD_NOMORE_DATA", message: "No more data available", http: 200 }],
  [0xffffff16, { name: "STAT_DLL_UNCONNECT", message: "Network connection not yet established", http: 503 }],
  [0xffffff17, { name: "STAT_DLL_DISCONNECT", message: "Network has been disconnected - reconnect required", http: 410 }],
  [0xffffff18, { name: "STAT_CMD_RESP_CRC_ERR", message: "Reader response CRC verification error", http: 502 }],
]);

export class ReaderError extends Error {
  readonly code: number;
  readonly statusName: string;
  readonly httpStatus: number;

  constructor(code: number, contextLabel?: string) {
    const entry = STATUS_TABLE.get(code >>> 0);
    const name = entry?.name ?? `STAT_UNKNOWN_0x${(code >>> 0).toString(16).toUpperCase()}`;
    const message = entry?.message ?? `Unknown SDK error code 0x${(code >>> 0).toString(16).toUpperCase()}`;
    super(contextLabel ? `${contextLabel}: ${name} - ${message}` : `${name} - ${message}`);
    this.name = "ReaderError";
    this.code = code >>> 0;
    this.statusName = name;
    this.httpStatus = entry?.http ?? 500;
  }
}

export function check(rc: number, contextLabel?: string): void {
  if ((rc >>> 0) !== 0) {
    throw new ReaderError(rc, contextLabel);
  }
}

export interface ErrorBody {
  code: number;
  statusName: string;
  httpStatus: number;
  message: string;
  traceId?: string;
}

export function toErrorBody(err: unknown, traceId?: string): ErrorBody {
  if (err instanceof ReaderError) {
    return {
      code: err.code,
      statusName: err.statusName,
      httpStatus: err.httpStatus,
      message: err.message,
      traceId,
    };
  }
  const msg = err instanceof Error ? err.message : String(err);
  return {
    code: 0,
    statusName: "STAT_INTERNAL",
    httpStatus: 500,
    message: msg,
    traceId,
  };
}

export const TRANSPORT_DISCONNECTED: ErrorBody = {
  code: 0xffffff17,
  statusName: "STAT_DLL_DISCONNECT",
  httpStatus: 410,
  message: "Agent disconnected from the cloud; retry when the agent reconnects.",
};

export const BUSY: ErrorBody = {
  code: 0xfffffe01,
  statusName: "STAT_BUSY",
  httpStatus: 429,
  message: "Agent queue is full; try again shortly.",
};

export const TIMEOUT: ErrorBody = {
  code: 0xfffffe02,
  statusName: "STAT_TIMEOUT",
  httpStatus: 504,
  message: "Request timed out.",
};

export const NOT_PAIRED: ErrorBody = {
  code: 0xfffffe03,
  statusName: "STAT_NOT_PAIRED",
  httpStatus: 401,
  message: "Browser token is invalid or expired. Re-pair with the agent.",
};

export const NOT_OPEN: ErrorBody = {
  code: 0xfffffe04,
  statusName: "STAT_NOT_OPEN",
  httpStatus: 409,
  message: "Reader is not open. Call connection.open first.",
};
