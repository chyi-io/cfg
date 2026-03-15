import type { RawDef } from "./schemas.ts";
import { OPT_DISABLE_ENABLE, OPT_IO_PRIORITY } from "./schemas.ts";

/**
 * Statically defined Teltonika parameter metadata.
 * These are explicit, hand-curated definitions for known parameters.
 * @internal
 */
export const staticDefs: Record<string, RawDef> = {
  "10": { name: "Device IMEI/ID", type: "string", description: "Device identifier string", category: "system", hint: "IMEI or custom device ID" },

  // ── I/O Elements: GPRS Settings (101-170) ──
  "101": { name: "Home On Stop Send Period", type: "number", description: "Data send period when stopped on home network", category: "io_elements", hint: "Seconds. 0 = disabled", min: 0, max: 999999 },
  "102": { name: "Home On Moving Send Period", type: "number", description: "Data send period when moving on home network", category: "io_elements", hint: "Seconds. 0 = disabled", min: 0, max: 999999 },
  "103": { name: "Home Record Saving Period", type: "number", description: "Record saving interval on home network", category: "io_elements", hint: "Seconds", min: 1, max: 999999 },
  "104": { name: "Roaming On Stop Send Period", type: "number", description: "Data send period when stopped on roaming", category: "io_elements", hint: "Seconds. 0 = disabled", min: 0, max: 999999 },
  "105": { name: "Roaming On Moving Send Period", type: "number", description: "Data send period when moving on roaming", category: "io_elements", hint: "Seconds. 0 = disabled", min: 0, max: 999999 },
  "106": { name: "Home On Stop Records", type: "number", description: "Records per batch when stopped on home", category: "io_elements", hint: "Number of records", min: 1, max: 255 },
  "107": { name: "Home On Moving Records", type: "number", description: "Records per batch when moving on home", category: "io_elements", hint: "Number of records", min: 1, max: 255 },
  "108": { name: "Roaming On Stop Records", type: "number", description: "Records per batch when stopped on roaming", category: "io_elements", hint: "Number of records", min: 1, max: 255 },
  "109": { name: "Roaming On Moving Records", type: "number", description: "Records per batch when moving on roaming", category: "io_elements", hint: "Number of records", min: 1, max: 255 },
  "110": { name: "Open Link Timeout", type: "number", description: "Max time GPRS link stays open without data", category: "io_elements", hint: "Seconds. 0 = no timeout", min: 0, max: 999999 },
  "111": { name: "Response Timeout (ext)", type: "number", description: "Extended server response timeout", category: "io_elements", hint: "Seconds", min: 0, max: 999999 },
  "112": { name: "Sorting", type: "number", description: "Record sorting order for data sending", category: "io_elements", options: [
    { value: "0", label: "Newest first" }, { value: "1", label: "Oldest first" },
    { value: "2", label: "Newest + ack" }, { value: "3", label: "Oldest + ack" },
  ] },
  "113": { name: "Active Data Link Timeout", type: "number", description: "Timeout for active GPRS data link", category: "io_elements", hint: "Seconds", min: 0, max: 999999 },
  "129": { name: "Network Ping Timeout", type: "number", description: "GPRS context keep-alive ping interval", category: "io_elements", hint: "Seconds. 0 = disabled", min: 0, max: 999999 },
  "130": { name: "Duplex Timeout", type: "number", description: "Full-duplex communication timeout", category: "io_elements", hint: "Seconds", min: 0 },
  "131": { name: "Target Server Timestamp", type: "number", description: "Sync timestamp with target server", category: "io_elements", hint: "Seconds", min: 0 },
  "133": { name: "Fixed PDP Context ID", type: "number", description: "Fixed PDP context identifier", category: "io_elements", options: OPT_DISABLE_ENABLE, hint: "0 = auto, 1 = fixed" },
  "134": { name: "SMS Data Sending", type: "number", description: "Enable SMS data sending", category: "io_elements", options: OPT_DISABLE_ENABLE },
  "136": { name: "GNSS Source", type: "number", description: "GNSS module source selection", category: "io_elements", options: [
    { value: "0", label: "Disabled" }, { value: "1", label: "GPS" },
    { value: "2", label: "GLONASS+GPS" }, { value: "7", label: "All available" },
  ] },
  "137": { name: "Link Receive Timeout", type: "number", description: "Max wait time for data on active link", category: "io_elements", hint: "Seconds", min: 0, max: 999999 },
  "138": { name: "Max Records Send", type: "number", description: "Max records to send in single batch", category: "io_elements", hint: "1-255", min: 1, max: 255 },
  "139": { name: "GNSS Fix Timeout", type: "number", description: "Timeout to acquire GNSS fix", category: "io_elements", hint: "Seconds", min: 0, max: 999999 },
  "141": { name: "Keep Alive", type: "number", description: "Keep-alive packet sending", category: "io_elements", options: OPT_DISABLE_ENABLE },
  "144": { name: "Open Link Retry", type: "number", description: "GPRS link retry attempts", category: "io_elements", hint: "Count", min: 0 },
  "145": { name: "Unknown On Stop Period", type: "number", description: "Send period when stopped on unknown network", category: "io_elements", hint: "Seconds", min: 0 },
  "149": { name: "Static Navigation", type: "number", description: "Static navigation filtering", category: "io_elements", options: OPT_DISABLE_ENABLE },
  "169": { name: "Codec 8 Extended", type: "number", description: "Data encoding protocol variant", category: "io_elements", options: [
    { value: "0", label: "Codec 8" }, { value: "1", label: "Codec 8 Extended" },
  ] },
  "170": { name: "Config Erase On Reset", type: "number", description: "Clear configuration after factory reset", category: "io_elements", options: [
    { value: "0", label: "Keep config" }, { value: "1", label: "Erase config" },
  ] },

  // ── Green Driving (234-243) ──
  "234": { name: "Green Driving Priority", type: "number", description: "Event priority for green driving alerts", category: "io_elements", options: OPT_IO_PRIORITY },
  "235": { name: "Green Driving: Harsh Accel", type: "number", description: "Harsh acceleration enable", category: "io_elements", options: OPT_DISABLE_ENABLE },
  "236": { name: "Green Driving: Harsh Brake", type: "number", description: "Harsh braking enable", category: "io_elements", options: OPT_DISABLE_ENABLE },
  "237": { name: "Green Driving: Harsh Cornering", type: "number", description: "Harsh cornering enable", category: "io_elements", options: OPT_DISABLE_ENABLE },
  "238": { name: "Green Driving: HA Threshold", type: "number", description: "Harsh acceleration threshold (mG)", category: "io_elements", hint: "milliG", min: 0, max: 10000 },
  "239": { name: "Green Driving: HB Threshold", type: "number", description: "Harsh braking threshold (mG)", category: "io_elements", hint: "milliG", min: 0, max: 10000 },
  "240": { name: "Green Driving: HC Threshold", type: "number", description: "Harsh cornering threshold (mG)", category: "io_elements", hint: "milliG", min: 0, max: 10000 },
  "241": { name: "Green Driving: HA Duration", type: "number", description: "Harsh acceleration duration (ms)", category: "io_elements", hint: "Milliseconds", min: 0 },
  "242": { name: "Green Driving: HB Duration", type: "number", description: "Harsh braking duration (ms)", category: "io_elements", hint: "Milliseconds", min: 0 },
  "243": { name: "Green Driving: HC Duration", type: "number", description: "Harsh cornering duration (ms)", category: "io_elements", hint: "Milliseconds", min: 0 },

  // ── FOTA / Device Info (800-834) ──
  "800": { name: "FOTA Web", type: "number", description: "Firmware-over-the-air web connection", category: "io_elements", options: [
    { value: "0", label: "Disabled" }, { value: "1", label: "Enabled" }, { value: "2", label: "Auto" },
  ] },
  "801": { name: "Device Name", type: "string", description: "Device name used for identification", category: "io_elements", hint: "e.g. FMB120, FMC125" },
  "802": { name: "FOTA Web Port", type: "number", description: "Port for FOTA web connection", category: "io_elements", hint: "1-65535", min: 1, max: 65535 },
  "803": { name: "FOTA Web Period", type: "number", description: "FOTA check interval", category: "io_elements", hint: "Minutes. 0 = disabled", min: 0 },
  "804": { name: "FOTA Web APN", type: "string", description: "APN for FOTA connection", category: "io_elements", hint: "Leave empty to use main APN" },
  "805": { name: "FOTA Web APN User", type: "string", description: "APN username for FOTA", category: "io_elements" },
  "806": { name: "FOTA Web APN Pass", type: "string", description: "APN password for FOTA", category: "io_elements" },
  "807": { name: "FOTA Web Protocol", type: "number", description: "FOTA connection protocol", category: "io_elements", options: [
    { value: "0", label: "TCP" }, { value: "1", label: "UDP" },
  ] },
  "830": { name: "FOTA Server Domain", type: "string", description: "Custom FOTA server address", category: "io_elements" },
  "831": { name: "FOTA Server Path", type: "string", description: "FOTA update path", category: "io_elements" },
  "832": { name: "FOTA Server User", type: "string", description: "FOTA server username", category: "io_elements" },
  "833": { name: "FOTA Server Pass", type: "string", description: "FOTA server password", category: "io_elements" },
  "834": { name: "FOTA Server Cert", type: "string", description: "FOTA server certificate", category: "io_elements" },

  // ── NTP (901-903) ──
  "901": { name: "NTP Servers Count", type: "number", description: "Number of NTP servers to use", category: "io_elements", hint: "0-3", min: 0, max: 3 },
  "902": { name: "NTP Server 1", type: "string", description: "Primary NTP server address", category: "io_elements", hint: "e.g. pool.ntp.org" },
  "903": { name: "NTP Server 2", type: "string", description: "Secondary NTP server address", category: "io_elements", hint: "e.g. time.nist.gov" },

  // ── Data Acquisition Core (1000-1004) ──
  "1000": { name: "Min Saving Period", type: "number", description: "Minimum time between saving records", category: "data_acquisition", hint: "Seconds", min: 0, max: 999999 },
  "1001": { name: "Min Distance", type: "number", description: "Minimum distance to trigger record", category: "data_acquisition", hint: "Meters. 0 = disabled", min: 0, max: 999999 },
  "1002": { name: "Min Angle", type: "number", description: "Minimum heading change to trigger record", category: "data_acquisition", hint: "Degrees. 0 = disabled", min: 0, max: 360 },
  "1003": { name: "Min Speed Delta", type: "number", description: "Minimum speed change to trigger record", category: "data_acquisition", hint: "km/h. 0 = disabled", min: 0, max: 999 },
  "1004": { name: "GNSS Source", type: "number", description: "GNSS module source for data acquisition", category: "data_acquisition", options: [
    { value: "0", label: "Disabled" }, { value: "1", label: "GNSS" },
  ] },

  // ── Data Acquisition: Home Stop (1100-1115) ──
  "1100": { name: "Home Stop: Min Period", type: "number", description: "Minimum record saving period (on-stop, home)", category: "data_acquisition", hint: "Seconds", min: 0 },
  "1110": { name: "Home Stop: Min Speed", type: "number", description: "Movement detection speed threshold", category: "data_acquisition", hint: "km/h", min: 0 },
  "1111": { name: "Home Stop: Min Distance", type: "number", description: "Minimum distance between records", category: "data_acquisition", hint: "Meters. 0 = disabled", min: 0, max: 999999 },
  "1112": { name: "Home Stop: Min Angle", type: "number", description: "Minimum heading change for record", category: "data_acquisition", hint: "Degrees", min: 0, max: 360 },
  "1113": { name: "Home Stop: Send Period", type: "number", description: "Data sending interval", category: "data_acquisition", hint: "Seconds", min: 0 },
  "1114": { name: "Home Stop: Min Satellites", type: "number", description: "Min visible satellites for valid fix", category: "data_acquisition", hint: "0-20", min: 0, max: 20 },
  "1115": { name: "Home Stop: PDOP Limit", type: "number", description: "Position dilution of precision limit", category: "data_acquisition", hint: "0 = no limit", min: 0 },

  // ── Data Acquisition: Home Moving (1200-1255) ──
  "1200": { name: "Home Moving: Min Period", type: "number", description: "Minimum record saving period (on-move, home)", category: "data_acquisition", hint: "Seconds", min: 0 },
  "1201": { name: "Home Moving: Min Distance", type: "number", description: "Minimum distance between records", category: "data_acquisition", hint: "Meters. 0 = disabled", min: 0, max: 999999 },
  "1202": { name: "Home Moving: Min Angle", type: "number", description: "Minimum heading change for record", category: "data_acquisition", hint: "Degrees", min: 0, max: 360 },
  "1203": { name: "Home Moving: Min Speed", type: "number", description: "Speed threshold for records", category: "data_acquisition", hint: "km/h", min: 0 },
  "1204": { name: "Home Moving: Min Satellites", type: "number", description: "Min visible satellites", category: "data_acquisition", hint: "0-20", min: 0, max: 20 },
  "1205": { name: "Home Moving: PDOP Limit", type: "number", description: "PDOP accuracy limit", category: "data_acquisition", hint: "0 = no limit", min: 0 },
  "1250": { name: "Home Moving: Send Period", type: "number", description: "Data sending interval (on-move, home)", category: "data_acquisition", hint: "Seconds", min: 0 },
  "1251": { name: "Home Moving: Send Distance", type: "number", description: "Distance trigger for sending", category: "data_acquisition", hint: "Meters", min: 0, max: 999999 },
  "1252": { name: "Home Moving: Send Angle", type: "number", description: "Angle trigger for sending", category: "data_acquisition", hint: "Degrees", min: 0, max: 360 },
  "1253": { name: "Home Moving: Send Speed", type: "number", description: "Speed trigger for sending", category: "data_acquisition", hint: "km/h", min: 0 },
  "1254": { name: "Home Moving: Send Satellites", type: "number", description: "Satellite count trigger", category: "data_acquisition", hint: "0-20", min: 0, max: 20 },
  "1255": { name: "Home Moving: Send PDOP", type: "number", description: "PDOP limit trigger", category: "data_acquisition", min: 0 },

  // ── Data Acquisition: Roaming Stop (1300-1305) ──
  "1300": { name: "Roaming Stop: Min Period", type: "number", description: "Min record saving period (on-stop, roaming)", category: "data_acquisition", hint: "Seconds", min: 0 },
  "1301": { name: "Roaming Stop: Min Distance", type: "number", description: "Min distance between records", category: "data_acquisition", hint: "Meters", min: 0, max: 999999 },
  "1302": { name: "Roaming Stop: Min Angle", type: "number", description: "Min heading change for record", category: "data_acquisition", hint: "Degrees", min: 0, max: 360 },
  "1303": { name: "Roaming Stop: Min Speed", type: "number", description: "Speed threshold", category: "data_acquisition", hint: "km/h", min: 0 },
  "1304": { name: "Roaming Stop: Min Satellites", type: "number", description: "Min visible satellites", category: "data_acquisition", hint: "0-20", min: 0, max: 20 },
  "1305": { name: "Roaming Stop: PDOP Limit", type: "number", description: "PDOP accuracy limit", category: "data_acquisition", min: 0 },

  // ── Data Acquisition: Roaming Moving (1350-1355) ──
  "1350": { name: "Roaming Moving: Min Period", type: "number", description: "Min record saving period (on-move, roaming)", category: "data_acquisition", hint: "Seconds", min: 0 },
  "1351": { name: "Roaming Moving: Min Distance", type: "number", description: "Min distance between records", category: "data_acquisition", hint: "Meters", min: 0, max: 999999 },
  "1352": { name: "Roaming Moving: Min Angle", type: "number", description: "Min heading change for record", category: "data_acquisition", hint: "Degrees", min: 0, max: 360 },
  "1353": { name: "Roaming Moving: Min Speed", type: "number", description: "Speed threshold", category: "data_acquisition", hint: "km/h", min: 0 },
  "1354": { name: "Roaming Moving: Min Satellites", type: "number", description: "Min visible satellites", category: "data_acquisition", hint: "0-20", min: 0, max: 20 },
  "1355": { name: "Roaming Moving: PDOP Limit", type: "number", description: "PDOP accuracy limit", category: "data_acquisition", min: 0 },

  // ── GPRS / Server (2000-2038) ──
  "2000": { name: "Data Protocol", type: "number", description: "Data encoding protocol", category: "gprs_server", options: [
    { value: "0", label: "Disabled" }, { value: "1", label: "Codec 8" },
  ] },
  "2001": { name: "APN Name", type: "string", description: "Mobile network Access Point Name", category: "gprs_server", hint: "e.g. internet, M2M" },
  "2002": { name: "APN Username", type: "string", description: "APN authentication username", category: "gprs_server", hint: "Leave empty if not required" },
  "2003": { name: "APN Password", type: "string", description: "APN authentication password", category: "gprs_server", hint: "Leave empty if not required" },
  "2004": { name: "Server Domain", type: "string", description: "Primary server IP address or domain", category: "gprs_server", hint: "e.g. 192.168.1.1 or server.example.com" },
  "2005": { name: "Server Port", type: "number", description: "Primary server port number", category: "gprs_server", hint: "1-65535", min: 0, max: 65535 },
  "2006": { name: "Protocol", type: "number", description: "Transport protocol for primary server", category: "gprs_server", options: [
    { value: "0", label: "TCP" }, { value: "1", label: "UDP" },
  ] },
  "2007": { name: "Backup Server Domain", type: "string", description: "Backup/secondary server address", category: "gprs_server", hint: "Failover server IP or domain" },
  "2008": { name: "Backup Server Port", type: "number", description: "Backup server port", category: "gprs_server", hint: "1-65535", min: 0, max: 65535 },
  "2009": { name: "Backup Protocol", type: "number", description: "Transport protocol for backup server", category: "gprs_server", options: [
    { value: "0", label: "TCP" }, { value: "1", label: "UDP" },
  ] },
  "2010": { name: "Backup Server Activation", type: "number", description: "When to switch to backup server", category: "gprs_server", options: OPT_DISABLE_ENABLE },
  "2011": { name: "Second Server Mode", type: "number", description: "Second server operation mode", category: "gprs_server", options: [
    { value: "0", label: "Disabled" }, { value: "1", label: "Backup" }, { value: "2", label: "Duplicate" },
  ] },
  "2015": { name: "GPRS Context", type: "string", description: "GPRS context identifier", category: "gprs_server" },
  "2016": { name: "DNS Check", type: "number", description: "Verify server domain via DNS", category: "gprs_server", options: OPT_DISABLE_ENABLE },
  "2018": { name: "Response Timeout", type: "number", description: "Max wait for server response", category: "gprs_server", hint: "Seconds. 0 = default", min: 0 },
  "2020": { name: "Send Period", type: "number", description: "Periodic data send interval", category: "gprs_server", hint: "Seconds. 0 = disabled", min: 0 },
  "2021": { name: "Data Roaming", type: "number", description: "Allow data sending while roaming", category: "gprs_server", options: OPT_DISABLE_ENABLE },
  "2025": { name: "Records per Send", type: "number", description: "Number of records per transmission", category: "gprs_server", hint: "1-255", min: 1, max: 255 },
  "2027": { name: "SMS Login", type: "string", description: "SMS command authentication login", category: "gprs_server", hint: "Leave empty to disable SMS auth" },
  "2028": { name: "SMS Password", type: "string", description: "SMS command authentication password", category: "gprs_server" },
  "2029": { name: "Authorized Phone", type: "string", description: "Phone number authorized for SMS commands", category: "gprs_server", hint: "International format: +370..." },
  "2030": { name: "APN2 Name", type: "string", description: "Second APN name", category: "gprs_server", hint: "For dual-APN setups" },
  "2035": { name: "Network Mode", type: "number", description: "Preferred network mode", category: "gprs_server", options: [
    { value: "0", label: "Auto" }, { value: "1", label: "2G only" },
    { value: "2", label: "3G only" }, { value: "3", label: "4G only" },
  ] },
  "2038": { name: "Auto APN", type: "number", description: "Automatic APN detection from SIM", category: "gprs_server", options: OPT_DISABLE_ENABLE },

  // ── Network (2100-2105) ──
  "2100": { name: "Network Type", type: "number", description: "Network type preference", category: "network", hint: "FMC only" },
  "2101": { name: "Band Lock", type: "string", description: "Lock to specific band", category: "network", hint: "FMC only" },
  "2102": { name: "Band Scan", type: "number", description: "Band scanning mode", category: "network", hint: "FMC only" },
  "2103": { name: "LTE Band Preference", type: "string", description: "LTE band preference bitmask", category: "network" },
  "2104": { name: "GSM Band Preference", type: "string", description: "GSM band preference bitmask", category: "network" },
  "2105": { name: "WCDMA Band Preference", type: "string", description: "WCDMA band preference bitmask", category: "network" },

  // ── Device Behavior (3000-3008) ──
  "3000": { name: "Sleep Mode", type: "number", description: "Power saving mode when idle", category: "device_behavior", options: [
    { value: "0", label: "Disabled" }, { value: "1", label: "GPS Sleep" },
    { value: "2", label: "Deep Sleep" }, { value: "3", label: "Online Deep Sleep" },
    { value: "4", label: "Ultra Sleep" },
  ] },
  "3001": { name: "Sleep Timeout", type: "number", description: "Time before entering sleep mode", category: "device_behavior", hint: "Seconds. 0 = default", min: 0, max: 999999 },
  "3003": { name: "Configurator Login", type: "string", description: "Login for device configurator access", category: "device_behavior", hint: "Default: tmt" },
  "3004": { name: "Configurator Password", type: "string", description: "Password for device configurator", category: "device_behavior", hint: "Default: tmt" },
  "3005": { name: "LED Indication", type: "number", description: "Status LED behavior", category: "device_behavior", options: OPT_DISABLE_ENABLE },
  "3006": { name: "Ignition Source", type: "number", description: "How ignition state is detected", category: "device_behavior", options: [
    { value: "0", label: "Power voltage" }, { value: "1", label: "Digital input" },
    { value: "2", label: "Movement" }, { value: "3", label: "Accelerometer" },
  ] },
  "3007": { name: "Movement Source", type: "number", description: "How movement is detected", category: "device_behavior", options: [
    { value: "0", label: "Accelerometer" }, { value: "1", label: "GNSS" },
    { value: "2", label: "Both (OR)" },
  ] },
  "3008": { name: "Operational Mode", type: "number", description: "Device operational mode", category: "device_behavior", options: [
    { value: "0", label: "Home+Roaming (default)" }, { value: "1", label: "Home only" },
    { value: "2", label: "Roaming only" },
  ] },

  // ── Trip / Odometer (6000-6009) ──
  "6000": { name: "Trip Start Speed", type: "number", description: "Speed threshold to start trip", category: "trip_odometer", hint: "km/h. 0 = use ignition", min: 0, max: 255 },
  "6001": { name: "Trip Stop Timeout", type: "number", description: "Idle time before trip ends", category: "trip_odometer", hint: "Seconds", min: 0, max: 65535 },
  "6002": { name: "Trip Continuous Distance", type: "number", description: "Continuous distance without stop", category: "trip_odometer", hint: "Meters", min: 0, max: 999999 },
  "6003": { name: "Odometer Mode", type: "number", description: "Odometer calculation method", category: "trip_odometer", options: [
    { value: "0", label: "GPS" }, { value: "1", label: "OBD" },
  ] },
  "6004": { name: "Odometer Value", type: "number", description: "Current odometer reading", category: "trip_odometer", hint: "km", min: 0 },
  "6005": { name: "Trip Detection Mode", type: "number", description: "How trips are detected", category: "trip_odometer", options: [
    { value: "0", label: "Ignition" }, { value: "1", label: "Movement" }, { value: "2", label: "Speed" },
  ] },
  "6006": { name: "Trip Avg Speed", type: "number", description: "Calculate average speed", category: "trip_odometer", options: OPT_DISABLE_ENABLE },
  "6007": { name: "Trip Fuel Consumed", type: "number", description: "Track fuel consumption", category: "trip_odometer", options: OPT_DISABLE_ENABLE },
  "6008": { name: "Trip Distance Type", type: "number", description: "Distance calculation method", category: "trip_odometer", options: [
    { value: "0", label: "GPS" }, { value: "1", label: "OBD" },
  ] },
  "6009": { name: "Trip Continuous Mode", type: "number", description: "Continuous trip mode", category: "trip_odometer", options: OPT_DISABLE_ENABLE },
};
