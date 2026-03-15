import type { DeviceDefinition } from "../../../lib/types.ts";
import { chafonCategories } from "../categories.ts";
import { mSeriesParamSchemas } from "../schemas.ts";

/**
 * Chafon UHF RFID Reader M-Series device definition.
 * Supports 4-port UHF readers with Wiegand, RS232/485, RJ45 interfaces.
 */

const defaults: Record<string, string> = Object.fromEntries(
  Object.keys(mSeriesParamSchemas).map((id) => [id, ""]),
);

// Override with typical factory defaults
Object.assign(defaults, {
  Baud: "9600",
  Power: "33",
  Addr: "1",
  Region: "USA",
  StartFreq: "902.750",
  EndFreq: "926.750",
  IsPointFreq: "False",
  Workmode: "Active Mode",
  Port: "RJ45",
  Area: "EPC",
  Startaddr: "0",
  DataLen: "12",
  Filtertime: "3",
  Triggletime: "3",
  Q: "4",
  Session: "S0",
  WiegandMode: "WG26",
  WieggendOutMode: "Low Bytes Are Output First",
  "IntenelTime(*100mS)": "0",
  IsBuzzer: "True",
  Ant1: "True",
  AntPower1: "33",
  Ant2: "False",
  AntPower2: "33",
  Ant3: "False",
  AntPower3: "33",
  Ant4: "False",
  AntPower4: "33",
  PasswordEnable: "False",
  PasswordHEX: "FF FF FF FF",
  MaskEnabled: "False",
  StartAddr: "0",
  MaskLen: "0",
  MaskData: "",
  Condition: "The password or mask is eligible",
  ConditionIndex: "0",
  ProtocolEnable: "False",
  ProrocolType: "Modbus RTU",
  ProrocolTypeIndex: "0",
  CacheEnable: "False",
  IsEnable: "True",
  RemoteIP: "",
  RemotePort: "1801",
  HeartbeatTime: "232",
});

export const mSeriesDevice: DeviceDefinition = {
  id: "m_series",
  name: "Chafon UHF Reader M-Series",
  vendorId: "chafon",
  categories: chafonCategories,
  paramSchemas: mSeriesParamSchemas,
  defaults,
};
