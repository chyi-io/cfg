import type { RawDef } from "./schemas.ts";
import { OPT_DISABLE_ENABLE, OPT_IO_PRIORITY, OPT_OPERAND } from "./schemas.ts";

/**
 * Generate pattern-based Teltonika parameter definitions.
 * These cover repetitive parameter blocks (IO settings, scenarios, etc.).
 * @internal
 */
export const generatePatternDefs = (): Record<string, RawDef> => {
  const defs: Record<string, RawDef> = {};

  // SMS Event Phone Numbers (1600-1649)
  for (let i = 0; i < 50; i++) {
    defs[`${1600 + i}`] = {
      name: `SMS Event Number ${i + 1}`,
      type: "string",
      description: `Phone number for SMS event ${i + 1}`,
      category: "sms_data_sending",
      hint: "International format: +370...",
    };
  }

  // CAN Data Sources (1700-1798)
  const canFields = [
    "ID",
    "Mask",
    "Type",
    "Byte Order",
    "Byte Offset",
    "Byte Count",
    "Multiplier",
    "Divider",
    "Offset",
  ];
  const canHints = [
    "Hex CAN frame ID",
    "Hex filter mask (00000000=any)",
    "0=disabled, 1=standard, 2=extended",
    "0=big endian, 1=little endian",
    "Start byte position (0-7)",
    "Number of bytes (1-8)",
    "Value multiplier",
    "Value divider",
    "Value offset",
  ];
  for (let src = 0; src < 10; src++) {
    const base = 1700 + src * 10;
    for (let f = 0; f < 9; f++) {
      defs[`${base + f}`] = {
        name: `CAN Source ${src + 1}: ${canFields[f]}`,
        type: f === 0 || f === 1 ? "string" : "number",
        description: `CAN data source ${src + 1} ${canFields[f].toLowerCase()}`,
        category: "obd_can",
        hint: canHints[f],
      };
    }
  }

  // Authorized Numbers (4000-4099)
  for (let i = 0; i < 100; i++) {
    defs[`${4000 + i}`] = {
      name: `Authorized Number ${i + 1}`,
      type: "string",
      description: `Authorized phone number slot ${i + 1}`,
      category: "authorized_numbers",
      hint: "International format: +370...",
    };
  }

  // Bluetooth Devices (4100-4199)
  for (let i = 0; i < 100; i++) {
    defs[`${4100 + i}`] = {
      name: `Bluetooth Device ${i + 1}`,
      type: "string",
      description: `Bluetooth device MAC address slot ${i + 1}`,
      category: "bluetooth",
      hint: "MAC format: AA:BB:CC:DD:EE:FF",
    };
  }

  // IO Settings: Priority (5000-5099) and Operand (5500-5599)
  const ioNames = [
    "Digital Input 1",
    "Digital Input 2",
    "Digital Input 3",
    "Analog Input 1",
    "Analog Input 2",
    "Battery Voltage",
    "Battery Current",
    "GNSS PDOP",
    "GNSS HDOP",
    "External Voltage",
    "GNSS Speed",
    "GSM Cell ID",
    "GSM Area Code",
    "Total Odometer",
    "GNSS Satellites",
    "Digital Output 1",
    "Digital Output 2",
    "Axis X",
    "Axis Y",
    "Axis Z",
    "Eco Score",
    "iButton ID",
    "Dallas Temp 1",
    "Dallas Temp 2",
    "Dallas Temp 3",
    "Dallas Temp 4",
    "Fuel Counter",
    "Fuel Rate GPS",
    "BLE Temp 1",
    "BLE Temp 2",
    "BLE Temp 3",
    "BLE Temp 4",
    "BLE Humidity 1",
    "BLE Humidity 2",
    "BLE Humidity 3",
    "BLE Humidity 4",
    "BLE Battery 1",
    "BLE Battery 2",
    "BLE Battery 3",
    "BLE Battery 4",
    "Custom IO 1",
    "Custom IO 2",
    "Custom IO 3",
    "Custom IO 4",
    "Custom IO 5",
    "Custom IO 6",
    "Custom IO 7",
    "Custom IO 8",
    "Custom IO 9",
    "Custom IO 10",
  ];
  for (let i = 0; i < 50; i++) {
    const ioName = ioNames[i] || `IO Element ${i + 1}`;
    defs[`${5000 + i}`] = {
      name: `${ioName}: Priority`,
      type: "number",
      description: `Event priority for ${ioName}`,
      category: "io_settings",
      options: OPT_IO_PRIORITY,
    };
    defs[`${5500 + i}`] = {
      name: `${ioName}: Operand`,
      type: "number",
      description: `Event operand for ${ioName}`,
      category: "io_settings",
      options: OPT_OPERAND,
    };
  }
  for (let i = 50; i < 100; i++) {
    defs[`${5000 + i}`] = {
      name: `Ext IO ${i + 1}: Priority`,
      type: "number",
      description: `Extended IO element ${i + 1} priority`,
      category: "io_settings",
      options: OPT_IO_PRIORITY,
    };
    defs[`${5500 + i}`] = {
      name: `Ext IO ${i + 1}: Operand`,
      type: "number",
      description: `Extended IO element ${i + 1} operand`,
      category: "io_settings",
      options: OPT_OPERAND,
    };
    defs[`${5100 + i - 50}`] = {
      name: `Ext IO ${i + 1}: Low Value`,
      type: "number",
      description: `Low threshold for IO element ${i + 1}`,
      category: "io_settings",
    };
    defs[`${5200 + i - 50}`] = {
      name: `Ext IO ${i + 1}: High Value`,
      type: "number",
      description: `High threshold for IO element ${i + 1}`,
      category: "io_settings",
    };
  }

  // Feature Flags (7030-8411)
  const featureSlots: [number, number, string][] = [
    [7030, 8030, "Auto Geofence"],
    [7031, 8031, "Trip"],
    [7032, 8032, "Overspeeding"],
    [7033, 8033, "Idling Event"],
    [7034, 8034, "Green Driving"],
    [7035, 8035, "Towing Detection"],
    [7036, 8036, "Unplug Detection"],
    [7037, 8037, "Crash Detection"],
  ];
  for (const [flagId, nameId, label] of featureSlots) {
    defs[`${flagId}`] = {
      name: `${label}: Enable`,
      type: "number",
      description: `Enable/disable ${label} scenario`,
      category: "advanced",
      options: OPT_DISABLE_ENABLE,
    };
    defs[`${nameId}`] = {
      name: `${label}: Name`,
      type: "string",
      description: `Display name for ${label} scenario`,
      category: "advanced",
      hint: `Default: ${label}`,
    };
  }
  defs["7140"] = {
    name: "Immobilizer: Enable",
    type: "number",
    description: "Enable/disable Immobilizer",
    category: "advanced",
    options: OPT_DISABLE_ENABLE,
  };
  defs["8140"] = {
    name: "Immobilizer: Name",
    type: "string",
    description: "Display name for Immobilizer",
    category: "advanced",
    hint: "Default: Immobilizer",
  };
  defs["7411"] = {
    name: "GNSS Jamming: Enable",
    type: "number",
    description: "Enable/disable GNSS Jamming detection",
    category: "advanced",
    options: OPT_DISABLE_ENABLE,
  };
  defs["8411"] = {
    name: "GNSS Jamming: Name",
    type: "string",
    description: "Display name for GNSS Jamming",
    category: "advanced",
    hint: "Default: GNSS Jamming",
  };

  // Notification Settings (9250-9279)
  const notifFeatures = [
    "Auto Geofence",
    "Trip",
    "Overspeeding",
    "Idling",
    "Green Driving",
    "Towing",
    "Unplug",
    "Crash",
    "Immobilizer",
    "GNSS Jamming",
  ];
  for (let i = 0; i < notifFeatures.length; i++) {
    const base = 9250 + i * 3;
    defs[`${base}`] = {
      name: `${notifFeatures[i]}: SMS Enable`,
      type: "number",
      description: `Send SMS on ${notifFeatures[i]} event`,
      category: "advanced",
      options: OPT_DISABLE_ENABLE,
    };
    defs[`${base + 1}`] = {
      name: `${notifFeatures[i]}: SMS Priority`,
      type: "number",
      description: `SMS priority for ${notifFeatures[i]}`,
      category: "advanced",
      options: OPT_IO_PRIORITY,
    };
    defs[`${base + 2}`] = {
      name: `${notifFeatures[i]}: SMS Number`,
      type: "string",
      description: `Phone number for ${notifFeatures[i]} SMS`,
      category: "advanced",
      hint: "+370...",
    };
  }

  // Scenario: Data Profiles (10000-10255)
  const profileNames = [
    "Profile 1 (Home Stop)",
    "Profile 2 (Home Moving)",
    "Profile 3 (Roaming)",
  ];
  for (let p = 0; p < 3; p++) {
    const base = 10000 + p * 100;
    const pn = profileNames[p];
    defs[`${base}`] = {
      name: `${pn}: Min Period`,
      type: "number",
      description: "Min record saving period",
      category: "scenario_io",
      hint: "Seconds",
      min: 0,
    };
    defs[`${base + 4}`] = {
      name: `${pn}: GNSS Source`,
      type: "number",
      description: "GNSS source for this profile",
      category: "scenario_io",
      options: [{ value: "0", label: "Disabled" }, {
        value: "1",
        label: "GNSS",
      }],
    };
    defs[`${base + 5}`] = {
      name: `${pn}: Min Saved Records`,
      type: "number",
      description: "Min records before send",
      category: "scenario_io",
      hint: "Count",
      min: 0,
    };
    defs[`${base + 50}`] = {
      name: `${pn}: Min Distance`,
      type: "number",
      description: "Min distance for record",
      category: "scenario_io",
      hint: "Meters",
      min: 0,
    };
    defs[`${base + 51}`] = {
      name: `${pn}: Send Period`,
      type: "number",
      description: "Data sending period",
      category: "scenario_io",
      hint: "Seconds",
      min: 0,
    };
    defs[`${base + 52}`] = {
      name: `${pn}: Min Angle`,
      type: "number",
      description: "Min heading change",
      category: "scenario_io",
      hint: "Degrees (0-360)",
      min: 0,
      max: 360,
    };
    defs[`${base + 53}`] = {
      name: `${pn}: Min Speed`,
      type: "number",
      description: "Min speed threshold",
      category: "scenario_io",
      hint: "km/h",
      min: 0,
    };
    defs[`${base + 54}`] = {
      name: `${pn}: Min Satellites`,
      type: "number",
      description: "Min visible satellites",
      category: "scenario_io",
      hint: "0-20",
      min: 0,
      max: 20,
    };
    defs[`${base + 55}`] = {
      name: `${pn}: PDOP Limit`,
      type: "number",
      description: "PDOP accuracy limit",
      category: "scenario_io",
      hint: "0 = no limit",
      min: 0,
    };
  }

  // Static Navigation (10990-10992)
  defs["10990"] = {
    name: "Static Nav: Source",
    type: "number",
    description: "Static navigation data source",
    category: "scenario_io",
    options: [{ value: "0", label: "Movement" }, {
      value: "10",
      label: "Ignition",
    }],
  };
  defs["10991"] = {
    name: "Static Nav: Distance",
    type: "number",
    description: "Distance threshold for static mode",
    category: "scenario_io",
    hint: "Meters",
    min: 0,
  };
  defs["10992"] = {
    name: "Static Nav: Save Period",
    type: "number",
    description: "Record save period in static mode",
    category: "scenario_io",
    hint: "Seconds. 0 = disabled",
    min: 0,
  };

  // Eco Driving (11000-11029)
  defs["11000"] = {
    name: "Eco Drive: Mode",
    type: "number",
    description: "Eco driving detection mode",
    category: "scenario_io",
    options: [
      { value: "0", label: "Disabled" },
      { value: "1", label: "Basic" },
      { value: "2", label: "Advanced" },
    ],
  };
  defs["11001"] = {
    name: "Eco Drive: Accel Threshold",
    type: "number",
    description: "Harsh acceleration threshold",
    category: "scenario_io",
    hint: "mG",
    min: 0,
  };
  defs["11002"] = {
    name: "Eco Drive: Brake Threshold",
    type: "number",
    description: "Harsh braking threshold",
    category: "scenario_io",
    hint: "mG",
    min: 0,
  };
  defs["11003"] = {
    name: "Eco Drive: Cornering Enable",
    type: "number",
    description: "Enable cornering detection",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11004"] = {
    name: "Eco Drive: Accel Limit Low",
    type: "string",
    description: "Low acceleration G threshold",
    category: "scenario_io",
    hint: "G value (e.g. 3.74)",
  };
  defs["11005"] = {
    name: "Eco Drive: Accel Limit Med",
    type: "string",
    description: "Medium acceleration G threshold",
    category: "scenario_io",
    hint: "G value (e.g. 4.08)",
  };
  defs["11006"] = {
    name: "Eco Drive: Accel Limit High",
    type: "string",
    description: "High acceleration G threshold",
    category: "scenario_io",
    hint: "G value (e.g. 4.76)",
  };
  defs["11007"] = {
    name: "Eco Drive: Brake Limit",
    type: "string",
    description: "Braking G threshold",
    category: "scenario_io",
  };
  defs["11008"] = {
    name: "Eco Drive: Corner Limit",
    type: "string",
    description: "Cornering G threshold",
    category: "scenario_io",
  };
  defs["11011"] = {
    name: "Eco Drive: Duration",
    type: "number",
    description: "Event duration threshold",
    category: "scenario_io",
    hint: "Milliseconds",
    min: 0,
  };
  defs["11015"] = {
    name: "Eco Drive: Speed Limit",
    type: "number",
    description: "Min speed for eco scoring",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };
  defs["11019"] = {
    name: "Eco Drive: GPS Source",
    type: "number",
    description: "Speed source for eco driving",
    category: "scenario_io",
    options: [{ value: "0", label: "GPS" }, { value: "1", label: "OBD" }],
  };
  defs["11029"] = {
    name: "Eco Drive: Output",
    type: "number",
    description: "Output action on eco event",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };

  // Overspeeding (11100-11104)
  defs["11100"] = {
    name: "Overspeeding: Enable",
    type: "number",
    description: "Enable overspeeding detection",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11101"] = {
    name: "Overspeeding: Activate Speed",
    type: "number",
    description: "Speed to activate alert",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };
  defs["11102"] = {
    name: "Overspeeding: Deactivate Speed",
    type: "number",
    description: "Speed to deactivate alert",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };
  defs["11103"] = {
    name: "Overspeeding: Duration",
    type: "number",
    description: "Time over speed before alert",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11104"] = {
    name: "Overspeeding: Max Speed",
    type: "number",
    description: "Maximum speed limit",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };

  // Towing Detection (11200-11206)
  defs["11200"] = {
    name: "Towing: Enable",
    type: "number",
    description: "Enable towing detection",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11201"] = {
    name: "Towing: Activate Threshold",
    type: "number",
    description: "Activation acceleration threshold",
    category: "scenario_io",
    hint: "mG",
    min: 0,
  };
  defs["11202"] = {
    name: "Towing: Deactivate Threshold",
    type: "number",
    description: "Deactivation threshold",
    category: "scenario_io",
    hint: "mG",
    min: 0,
  };
  defs["11203"] = {
    name: "Towing: Angle Enable",
    type: "number",
    description: "Use angle for towing detection",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11204"] = {
    name: "Towing: Angle Threshold",
    type: "number",
    description: "Angle change threshold",
    category: "scenario_io",
    hint: "Degrees",
    min: 0,
    max: 360,
  };
  defs["11205"] = {
    name: "Towing: Duration",
    type: "number",
    description: "Duration before towing alert",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11206"] = {
    name: "Towing: Event Count",
    type: "number",
    description: "Events before confirming tow",
    category: "scenario_io",
    hint: "Count",
    min: 0,
  };

  // Crash Detection (11300-11314)
  defs["11300"] = {
    name: "Crash: Enable",
    type: "number",
    description: "Enable crash detection",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11301"] = {
    name: "Crash: Activate Threshold",
    type: "number",
    description: "Crash detection G threshold",
    category: "scenario_io",
    hint: "mG",
    min: 0,
  };
  defs["11302"] = {
    name: "Crash: Duration",
    type: "number",
    description: "Impact duration threshold",
    category: "scenario_io",
    hint: "Milliseconds",
    min: 0,
  };
  defs["11303"] = {
    name: "Crash: Speed Threshold",
    type: "number",
    description: "Min speed for crash detection",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };
  defs["11304"] = {
    name: "Crash: Deceleration",
    type: "number",
    description: "Deceleration threshold",
    category: "scenario_io",
    hint: "mG",
    min: 0,
  };
  defs["11305"] = {
    name: "Crash: Trace Duration",
    type: "number",
    description: "Post-crash trace recording duration",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11310"] = {
    name: "Crash Ext: Enable",
    type: "number",
    description: "Extended crash analytics",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11311"] = {
    name: "Crash Ext: Accel Threshold",
    type: "number",
    description: "Extended crash acceleration",
    category: "scenario_io",
    hint: "mG",
    min: 0,
  };
  defs["11312"] = {
    name: "Crash Ext: Duration",
    type: "number",
    description: "Extended crash duration",
    category: "scenario_io",
    hint: "ms",
    min: 0,
  };
  defs["11313"] = {
    name: "Crash Ext: Auto Calibrate",
    type: "number",
    description: "Auto calibration for crash sensor",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11314"] = {
    name: "Crash Ext: Trace Enable",
    type: "number",
    description: "Enable crash trace data",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };

  // GNSS Jamming (11400-11415)
  defs["11400"] = {
    name: "Jamming: Mode",
    type: "number",
    description: "Jamming detection mode",
    category: "scenario_io",
    options: [{ value: "0", label: "Disabled" }, {
      value: "1",
      label: "Detect only",
    }, { value: "2", label: "Detect + act" }],
  };
  defs["11401"] = {
    name: "Jamming: Timeout",
    type: "number",
    description: "Jamming detection timeout",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11402"] = {
    name: "Jamming: C/N Threshold",
    type: "number",
    description: "Carrier-to-noise ratio threshold",
    category: "scenario_io",
    hint: "dB-Hz",
    min: 0,
  };
  defs["11406"] = {
    name: "Jamming: Satellites Min",
    type: "number",
    description: "Min satellites for jamming check",
    category: "scenario_io",
    min: 0,
  };
  defs["11407"] = {
    name: "Jamming: GNSS Timeout",
    type: "number",
    description: "GNSS fix timeout during jamming",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11408"] = {
    name: "Jamming: Re-check Period",
    type: "number",
    description: "Period between jamming checks",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11410"] = {
    name: "Jamming: Event Send",
    type: "number",
    description: "Send event on jamming detected",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11412"] = {
    name: "Jamming: DOUT Action",
    type: "number",
    description: "Digital output on jamming",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11415"] = {
    name: "Jamming: Speed Filter",
    type: "number",
    description: "Min speed for jamming detection",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };

  // DOUT Control (11500-11511)
  defs["11500"] = {
    name: "DOUT1: Mode",
    type: "number",
    description: "Digital output 1 control mode",
    category: "scenario_io",
    options: [{ value: "0", label: "Disabled" }, {
      value: "1",
      label: "Continuous",
    }, { value: "2", label: "Duration" }],
  };
  defs["11501"] = {
    name: "DOUT1: Default State",
    type: "number",
    description: "DOUT1 default state",
    category: "scenario_io",
    options: [{ value: "0", label: "Off" }, { value: "1", label: "On" }],
  };
  defs["11502"] = {
    name: "DOUT1: On Duration",
    type: "number",
    description: "DOUT1 on duration",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11503"] = {
    name: "DOUT1: Off Duration",
    type: "number",
    description: "DOUT1 off duration",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11510"] = {
    name: "DOUT2: Mode",
    type: "number",
    description: "Digital output 2 control mode",
    category: "scenario_io",
    options: [{ value: "0", label: "Disabled" }, {
      value: "1",
      label: "Continuous",
    }, { value: "2", label: "Duration" }],
  };
  defs["11511"] = {
    name: "DOUT2: Default State",
    type: "number",
    description: "DOUT2 default state",
    category: "scenario_io",
    options: [{ value: "0", label: "Off" }, { value: "1", label: "On" }],
  };

  // Immobilizer (11600-11611)
  defs["11600"] = {
    name: "Immobilizer: Mode",
    type: "number",
    description: "Immobilizer operating mode",
    category: "scenario_io",
    options: [{ value: "0", label: "Disabled" }, {
      value: "1",
      label: "iButton",
    }, { value: "2", label: "Authorization" }],
  };
  defs["11601"] = {
    name: "Immobilizer: iButton Count",
    type: "number",
    description: "Number of authorized iButtons",
    category: "scenario_io",
    hint: "0-10",
    min: 0,
    max: 10,
  };
  defs["11602"] = {
    name: "Immobilizer: Auth Timeout",
    type: "number",
    description: "Authorization timeout",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11603"] = {
    name: "Immobilizer: After Timeout",
    type: "number",
    description: "Action after timeout",
    category: "scenario_io",
  };
  defs["11604"] = {
    name: "Immobilizer: DOUT",
    type: "number",
    description: "Digital output on immobilize",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11605"] = {
    name: "Immobilizer: G Threshold",
    type: "string",
    description: "Acceleration threshold",
    category: "scenario_io",
    hint: "G value",
  };
  defs["11606"] = {
    name: "Immobilizer: Duration",
    type: "number",
    description: "Immobilizer activation delay",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11607"] = {
    name: "Immobilizer: Speed Limit",
    type: "number",
    description: "Max speed when immobilized",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };
  defs["11609"] = {
    name: "Immobilizer: Activate Threshold",
    type: "number",
    description: "Activation threshold",
    category: "scenario_io",
    hint: "mG",
    min: 0,
  };
  defs["11610"] = {
    name: "Immobilizer: Deactivate Threshold",
    type: "number",
    description: "Deactivation threshold",
    category: "scenario_io",
    hint: "mG",
    min: 0,
  };
  defs["11611"] = {
    name: "Immobilizer: Angle Detection",
    type: "number",
    description: "Use angle for detection",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };

  // Unplug Detection (11700-11707)
  defs["11700"] = {
    name: "Unplug: Enable",
    type: "number",
    description: "Enable unplug detection",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11701"] = {
    name: "Unplug: Mode",
    type: "number",
    description: "Unplug detection mode",
    category: "scenario_io",
    options: [{ value: "0", label: "Simple" }, {
      value: "1",
      label: "Advanced",
    }],
  };
  defs["11702"] = {
    name: "Unplug: Send SMS",
    type: "number",
    description: "Send SMS on unplug",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11703"] = {
    name: "Unplug: Event Priority",
    type: "number",
    description: "Unplug event priority",
    category: "scenario_io",
    options: OPT_IO_PRIORITY,
  };
  defs["11704"] = {
    name: "Unplug: DOUT Action",
    type: "number",
    description: "Digital output on unplug",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11705"] = {
    name: "Unplug: Voltage Threshold",
    type: "number",
    description: "Voltage level for unplug",
    category: "scenario_io",
    hint: "mV",
    min: 0,
  };
  defs["11706"] = {
    name: "Unplug: Duration",
    type: "number",
    description: "Duration before confirming unplug",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11707"] = {
    name: "Unplug: Event Generate",
    type: "number",
    description: "Generate unplug event",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };

  // Geofence (11800-11807)
  defs["11800"] = {
    name: "Geofence: Mode",
    type: "number",
    description: "Manual geofence mode",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11801"] = {
    name: "Geofence: Priority",
    type: "number",
    description: "Geofence event priority",
    category: "scenario_io",
    options: OPT_IO_PRIORITY,
  };
  defs["11802"] = {
    name: "Geofence: Enter Event",
    type: "number",
    description: "Generate event on zone enter",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11803"] = {
    name: "Geofence: Exit Event",
    type: "number",
    description: "Generate event on zone exit",
    category: "scenario_io",
  };
  defs["11804"] = {
    name: "Geofence: Sample Period",
    type: "number",
    description: "Geofence check interval",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11806"] = {
    name: "Geofence: Shape",
    type: "number",
    description: "Geofence zone shape",
    category: "scenario_io",
    options: [{ value: "0", label: "Circle" }, {
      value: "1",
      label: "Polygon",
    }],
  };
  defs["11807"] = {
    name: "Geofence: Frame Border",
    type: "number",
    description: "Zone border width",
    category: "scenario_io",
    hint: "Meters",
    min: 0,
  };

  // Weekly schedule (11811-11853)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (let d = 0; d < 7; d++) {
    const base = 11811 + d * 3;
    defs[`${base}`] = {
      name: `Schedule ${days[d]}: Enable`,
      type: "number",
      description: `Enable schedule for ${days[d]}`,
      category: "scenario_io",
      options: OPT_DISABLE_ENABLE,
    };
    defs[`${base + 1}`] = {
      name: `Schedule ${days[d]}: Start`,
      type: "number",
      description: `Start hour for ${days[d]}`,
      category: "scenario_io",
      hint: "0-23",
      min: 0,
      max: 23,
    };
    defs[`${base + 2}`] = {
      name: `Schedule ${days[d]}: End`,
      type: "number",
      description: `End hour for ${days[d]}`,
      category: "scenario_io",
      hint: "0-23",
      min: 0,
      max: 23,
    };
  }
  defs["11839"] = {
    name: "Schedule: Invert Logic",
    type: "number",
    description: "Invert schedule logic",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  for (let d = 0; d < 7; d++) {
    const base = 11840 + d * 2;
    defs[`${base}`] = {
      name: `Schedule2 ${days[d]}: Start`,
      type: "number",
      description: `Second schedule start for ${days[d]}`,
      category: "scenario_io",
      hint: "0-23",
      min: 0,
      max: 23,
    };
    defs[`${base + 1}`] = {
      name: `Schedule2 ${days[d]}: End`,
      type: "number",
      description: `Second schedule end for ${days[d]}`,
      category: "scenario_io",
      hint: "0-23",
      min: 0,
      max: 23,
    };
  }

  // Idling Detection (11900-11909)
  defs["11900"] = {
    name: "Idling: Enable",
    type: "number",
    description: "Enable idling event detection",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11901"] = {
    name: "Idling: Priority",
    type: "number",
    description: "Idling event priority",
    category: "scenario_io",
    options: OPT_IO_PRIORITY,
  };
  defs["11902"] = {
    name: "Idling: Event Generate",
    type: "number",
    description: "Generate event on idle start/end",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11903"] = {
    name: "Idling: Timeout",
    type: "number",
    description: "Time before idle event triggers",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11904"] = {
    name: "Idling: End Timeout",
    type: "number",
    description: "Time before idle event ends",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["11905"] = {
    name: "Idling: Speed Threshold",
    type: "number",
    description: "Max speed considered as idle",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };
  defs["11906"] = {
    name: "Idling: Send SMS",
    type: "number",
    description: "Send SMS on idle event",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11907"] = {
    name: "Idling: DOUT Action",
    type: "number",
    description: "Digital output on idle",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["11908"] = {
    name: "Idling: Start Event Speed",
    type: "number",
    description: "Speed threshold for idle start",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };
  defs["11909"] = {
    name: "Idling: End Event Speed",
    type: "number",
    description: "Speed threshold for idle end",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };

  // DOUT Extended (12000-12002)
  defs["12000"] = {
    name: "DOUT Ext: Source",
    type: "number",
    description: "Extended DOUT control source",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["12001"] = {
    name: "DOUT Ext: Duration",
    type: "number",
    description: "DOUT activation duration",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["12002"] = {
    name: "DOUT Ext: Speed Limit",
    type: "number",
    description: "Speed limit for DOUT action",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };

  // Auto Geofence Extended (12250-12259)
  defs["12250"] = {
    name: "Auto Geofence: Enable",
    type: "number",
    description: "Enable auto geofence",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["12251"] = {
    name: "Auto Geofence: Priority",
    type: "number",
    description: "Auto geofence event priority",
    category: "scenario_io",
    options: OPT_IO_PRIORITY,
  };
  defs["12252"] = {
    name: "Auto Geofence: Event",
    type: "number",
    description: "Event on geofence trigger",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["12253"] = {
    name: "Auto Geofence: Generate",
    type: "number",
    description: "When to generate event",
    category: "scenario_io",
    options: [{ value: "0", label: "On exit" }, {
      value: "1",
      label: "On enter",
    }, { value: "2", label: "Both" }],
  };
  defs["12254"] = {
    name: "Auto Geofence: Radius",
    type: "number",
    description: "Geofence radius",
    category: "scenario_io",
    hint: "Meters",
    min: 0,
  };
  defs["12255"] = {
    name: "Auto Geofence: Timeout",
    type: "number",
    description: "Geofence set timeout",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["12256"] = {
    name: "Auto Geofence: Save Timeout",
    type: "number",
    description: "Record save timeout in zone",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["12257"] = {
    name: "Auto Geofence: Activate Threshold",
    type: "number",
    description: "Activation threshold",
    category: "scenario_io",
    hint: "mG",
    min: 0,
  };
  defs["12258"] = {
    name: "Auto Geofence: Deactivate Threshold",
    type: "number",
    description: "Deactivation threshold",
    category: "scenario_io",
    hint: "mG",
    min: 0,
  };
  defs["12259"] = {
    name: "Auto Geofence: Duration",
    type: "number",
    description: "Duration before trigger",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };

  // FOTA Config (13000-13003)
  defs["13000"] = {
    name: "FOTA: Server Domain",
    type: "string",
    description: "FOTA update server address",
    category: "scenario_io",
    hint: "e.g. fm.teltonika.lt",
  };
  defs["13001"] = {
    name: "FOTA: Server Port",
    type: "number",
    description: "FOTA server port",
    category: "scenario_io",
    hint: "1-65535",
    min: 1,
    max: 65535,
  };
  defs["13002"] = {
    name: "FOTA: Check Period",
    type: "number",
    description: "Firmware check interval",
    category: "scenario_io",
    hint: "Minutes",
    min: 0,
  };
  defs["13003"] = {
    name: "FOTA: Enable",
    type: "number",
    description: "Enable automatic firmware updates",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };

  // Daylight Saving (13401-13403)
  defs["13401"] = {
    name: "DST: Enable",
    type: "number",
    description: "Daylight saving time",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["13402"] = {
    name: "DST: Offset",
    type: "number",
    description: "DST offset",
    category: "scenario_io",
    hint: "Minutes",
    min: 0,
  };
  defs["13403"] = {
    name: "DST: Zone",
    type: "number",
    description: "Timezone offset from UTC",
    category: "scenario_io",
    hint: "Minutes",
    min: -720,
    max: 840,
  };

  // Config Lock (13500-13501)
  defs["13500"] = {
    name: "Config Lock: Enable",
    type: "number",
    description: "Lock device configuration",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["13501"] = {
    name: "Config Lock: Password",
    type: "number",
    description: "Config lock password flag",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };

  // Geofence Zones (14000-14689)
  for (let zone = 0; zone < 4; zone++) {
    const base = 14000 + zone * 200;
    const zn = `Zone ${zone + 1}`;
    for (let i = 0; i < 10; i++) {
      defs[`${base + i}`] = {
        name: `${zn}: Point ${i + 1} Latitude`,
        type: "string",
        description: `Geofence ${zn} point ${i + 1} latitude`,
        category: "scenario_io",
        hint: "Decimal degrees",
      };
      defs[`${base + 10 + i}`] = {
        name: `${zn}: Point ${i + 1} Priority`,
        type: "number",
        description: `Geofence ${zn} point ${i + 1} priority`,
        category: "scenario_io",
        options: OPT_IO_PRIORITY,
      };
      defs[`${base + 20 + i}`] = {
        name: `${zn}: Point ${i + 1} Enable`,
        type: "number",
        description: `Enable geofence ${zn} point ${i + 1}`,
        category: "scenario_io",
        options: OPT_DISABLE_ENABLE,
      };
      defs[`${base + 30 + i}`] = {
        name: `${zn}: Point ${i + 1} Event`,
        type: "number",
        description: `Event type for ${zn} point ${i + 1}`,
        category: "scenario_io",
      };
      defs[`${base + 40 + i}`] = {
        name: `${zn}: Point ${i + 1} Config`,
        type: "number",
        description: `Config for ${zn} point ${i + 1}`,
        category: "scenario_io",
      };
    }
    for (let i = 0; i < 10; i++) {
      defs[`${base + 50 + i}`] = {
        name: `${zn}: Point ${i + 1} Longitude`,
        type: "string",
        description: `Geofence ${zn} point ${i + 1} longitude`,
        category: "scenario_io",
        hint: "Decimal degrees",
      };
      defs[`${base + 60 + i}`] = {
        name: `${zn}: Pt ${i + 1} Radius/Act`,
        type: "number",
        description: `${zn} point ${i + 1} radius or activation`,
        category: "scenario_io",
      };
      defs[`${base + 70 + i}`] = {
        name: `${zn}: Pt ${i + 1} Generate`,
        type: "number",
        description: `${zn} point ${i + 1} event generation`,
        category: "scenario_io",
        options: OPT_DISABLE_ENABLE,
      };
      defs[`${base + 80 + i}`] = {
        name: `${zn}: Pt ${i + 1} Evt Priority`,
        type: "number",
        description: `${zn} point ${i + 1} event priority`,
        category: "scenario_io",
        options: OPT_IO_PRIORITY,
      };
    }
  }

  // Fuel settings (19001-19002)
  defs["19001"] = {
    name: "Fuel: Source",
    type: "number",
    description: "Fuel level data source",
    category: "scenario_io",
    options: [{ value: "0", label: "Disabled" }, {
      value: "1",
      label: "Analog",
    }, { value: "2", label: "OBD" }],
  };
  defs["19002"] = {
    name: "Fuel: Calibration Period",
    type: "number",
    description: "Fuel calibration averaging period",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };

  // Towing Extended (19500-19505)
  defs["19500"] = {
    name: "Towing Ext: Enable",
    type: "number",
    description: "Extended towing detection",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["19501"] = {
    name: "Towing Ext: Timeout",
    type: "number",
    description: "Towing detection timeout",
    category: "scenario_io",
    hint: "Seconds",
    min: 0,
  };
  defs["19502"] = {
    name: "Towing Ext: Angle",
    type: "number",
    description: "Towing angle threshold",
    category: "scenario_io",
    hint: "Degrees",
    min: 0,
    max: 360,
  };
  defs["19503"] = {
    name: "Towing Ext: Accel Threshold",
    type: "string",
    description: "Acceleration threshold for towing",
    category: "scenario_io",
    hint: "G value (e.g. 1.3)",
  };
  defs["19504"] = {
    name: "Towing Ext: Speed Enable",
    type: "number",
    description: "Use speed for towing",
    category: "scenario_io",
    options: OPT_DISABLE_ENABLE,
  };
  defs["19505"] = {
    name: "Towing Ext: Speed Limit",
    type: "number",
    description: "Speed limit for towing",
    category: "scenario_io",
    hint: "km/h",
    min: 0,
  };

  // CAN Adapter (30000-30099) — FMC only
  for (let ch = 0; ch < 10; ch++) {
    const base = 30000 + ch * 10;
    defs[`${base}`] = {
      name: `CAN Ch${ch + 1}: Enable`,
      type: "number",
      description: `Enable CAN adapter channel ${ch + 1}`,
      category: "can_adapter",
      options: OPT_DISABLE_ENABLE,
    };
    defs[`${base + 1}`] = {
      name: `CAN Ch${ch + 1}: Baud Rate`,
      type: "number",
      description: `CAN bus baud rate for channel ${ch + 1}`,
      category: "can_adapter",
      options: [{ value: "0", label: "250 kbps" }, {
        value: "1",
        label: "500 kbps",
      }],
    };
    defs[`${base + 2}`] = {
      name: `CAN Ch${ch + 1}: Frame ID`,
      type: "string",
      description: `CAN frame ID filter for channel ${ch + 1}`,
      category: "can_adapter",
      hint: "Hex, e.g. 0x18FEE900",
    };
    defs[`${base + 3}`] = {
      name: `CAN Ch${ch + 1}: Mask`,
      type: "string",
      description: `CAN frame mask for channel ${ch + 1}`,
      category: "can_adapter",
      hint: "Hex, 00000000 = any",
    };
    defs[`${base + 4}`] = {
      name: `CAN Ch${ch + 1}: Byte Offset`,
      type: "number",
      description: `Start byte position for channel ${ch + 1}`,
      category: "can_adapter",
      hint: "0-7",
      min: 0,
      max: 7,
    };
    defs[`${base + 5}`] = {
      name: `CAN Ch${ch + 1}: Byte Count`,
      type: "number",
      description: `Number of bytes for channel ${ch + 1}`,
      category: "can_adapter",
      hint: "1-8",
      min: 1,
      max: 8,
    };
    defs[`${base + 6}`] = {
      name: `CAN Ch${ch + 1}: Multiplier`,
      type: "number",
      description: `Value multiplier for channel ${ch + 1}`,
      category: "can_adapter",
      min: 0,
    };
    defs[`${base + 7}`] = {
      name: `CAN Ch${ch + 1}: Divider`,
      type: "number",
      description: `Value divider for channel ${ch + 1}`,
      category: "can_adapter",
      min: 1,
    };
    defs[`${base + 8}`] = {
      name: `CAN Ch${ch + 1}: Offset`,
      type: "number",
      description: `Value offset for channel ${ch + 1}`,
      category: "can_adapter",
    };
    defs[`${base + 9}`] = {
      name: `CAN Ch${ch + 1}: Priority`,
      type: "number",
      description: `Event priority for channel ${ch + 1}`,
      category: "can_adapter",
      options: OPT_IO_PRIORITY,
    };
  }

  // OBD PIDs (50000-50049) — FMC only
  const obdPids = [
    "Engine RPM",
    "Vehicle Speed",
    "Engine Coolant Temp",
    "Fuel Pressure",
    "Intake Air Temp",
    "MAF Air Flow",
    "Throttle Position",
    "Runtime Since Start",
    "Fuel Tank Level",
    "Barometric Pressure",
    "Control Module Voltage",
    "Engine Load",
    "Ambient Air Temp",
    "Fuel Type",
    "Engine Oil Temp",
    "Fuel Rate",
    "Calculated Load",
    "Short Fuel Trim",
    "Long Fuel Trim",
    "Intake Manifold Pressure",
  ];
  for (let i = 0; i < 50; i++) {
    const pidName = obdPids[i] || `OBD PID ${i + 1}`;
    defs[`${50000 + i}`] = {
      name: `OBD: ${pidName}`,
      type: "number",
      description: `OBD-II PID ${i}: ${pidName}`,
      category: "obd_pids",
      options: OPT_IO_PRIORITY,
    };
  }

  // Accelerometer (20000-20005)
  defs["20000"] = {
    name: "Accel: Crash Trace",
    type: "number",
    description: "Enable crash trace recording",
    category: "accelerometer",
    options: OPT_DISABLE_ENABLE,
  };
  defs["20001"] = {
    name: "Accel: Crash Duration",
    type: "number",
    description: "Crash trace duration",
    category: "accelerometer",
    hint: "Milliseconds",
    min: 0,
  };
  defs["20002"] = {
    name: "Accel: Auto Calibrate",
    type: "number",
    description: "Auto calibration enable",
    category: "accelerometer",
    options: OPT_DISABLE_ENABLE,
  };
  defs["20003"] = {
    name: "Accel: Sensitivity",
    type: "number",
    description: "Movement detection sensitivity",
    category: "accelerometer",
    hint: "0=lowest, 5=highest",
    min: 0,
    max: 5,
  };
  defs["20004"] = {
    name: "Accel: Sample Rate",
    type: "number",
    description: "Accelerometer sampling rate",
    category: "accelerometer",
    hint: "Hz",
    min: 0,
  };
  defs["20005"] = {
    name: "Accel: Range",
    type: "number",
    description: "Measurement range",
    category: "accelerometer",
    hint: "G",
    min: 0,
  };

  return defs;
};
