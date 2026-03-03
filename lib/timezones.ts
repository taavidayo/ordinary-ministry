export interface TimezoneOption {
  value: string
  label: string
}

export function getUtcOffset(tz: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(new Date())
  const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT"
  return offset.replace("GMT", "UTC")
}

export const TIMEZONES: TimezoneOption[] = [
  // UTC
  { value: "UTC", label: "UTC — Coordinated Universal Time" },

  // Americas
  { value: "America/New_York",    label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago",     label: "Central Time (US & Canada)" },
  { value: "America/Denver",      label: "Mountain Time (US & Canada)" },
  { value: "America/Phoenix",     label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Anchorage",   label: "Alaska" },
  { value: "Pacific/Honolulu",    label: "Hawaii" },
  { value: "America/Puerto_Rico", label: "Atlantic Time (Puerto Rico)" },
  { value: "America/Toronto",     label: "Eastern Time (Canada)" },
  { value: "America/Vancouver",   label: "Pacific Time (Canada)" },
  { value: "America/Winnipeg",    label: "Central Time (Canada)" },
  { value: "America/Halifax",     label: "Atlantic Time (Canada)" },
  { value: "America/St_Johns",    label: "Newfoundland" },
  { value: "America/Sao_Paulo",   label: "Brasilia" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { value: "America/Bogota",      label: "Bogota, Lima, Quito" },
  { value: "America/Caracas",     label: "Caracas" },
  { value: "America/Santiago",    label: "Santiago" },
  { value: "America/Mexico_City", label: "Mexico City" },

  // Europe
  { value: "Europe/London",       label: "London, Dublin, Edinburgh" },
  { value: "Europe/Paris",        label: "Paris, Brussels, Amsterdam" },
  { value: "Europe/Berlin",       label: "Berlin, Frankfurt, Vienna" },
  { value: "Europe/Rome",         label: "Rome, Madrid, Stockholm" },
  { value: "Europe/Athens",       label: "Athens, Istanbul, Helsinki" },
  { value: "Europe/Moscow",       label: "Moscow" },
  { value: "Europe/Lisbon",       label: "Lisbon" },
  { value: "Europe/Amsterdam",    label: "Amsterdam" },
  { value: "Europe/Warsaw",       label: "Warsaw, Prague, Budapest" },
  { value: "Europe/Bucharest",    label: "Bucharest, Sofia, Vilnius" },
  { value: "Europe/Kiev",         label: "Kyiv, Riga, Tallinn" },
  { value: "Europe/Helsinki",     label: "Helsinki" },

  // Africa
  { value: "Africa/Cairo",        label: "Cairo" },
  { value: "Africa/Johannesburg", label: "Johannesburg, Harare" },
  { value: "Africa/Lagos",        label: "Lagos, Nairobi" },
  { value: "Africa/Accra",        label: "Accra, Dakar" },

  // Asia
  { value: "Asia/Dubai",          label: "Dubai, Abu Dhabi" },
  { value: "Asia/Karachi",        label: "Karachi, Islamabad" },
  { value: "Asia/Kolkata",        label: "Mumbai, New Delhi, Kolkata" },
  { value: "Asia/Dhaka",          label: "Dhaka" },
  { value: "Asia/Bangkok",        label: "Bangkok, Jakarta, Hanoi" },
  { value: "Asia/Singapore",      label: "Singapore, Kuala Lumpur" },
  { value: "Asia/Shanghai",       label: "Beijing, Shanghai, Taipei" },
  { value: "Asia/Hong_Kong",      label: "Hong Kong" },
  { value: "Asia/Seoul",          label: "Seoul" },
  { value: "Asia/Tokyo",          label: "Tokyo, Osaka, Sapporo" },
  { value: "Asia/Colombo",        label: "Colombo, Sri Lanka" },
  { value: "Asia/Kathmandu",      label: "Kathmandu" },
  { value: "Asia/Rangoon",        label: "Yangon" },
  { value: "Asia/Kabul",          label: "Kabul" },
  { value: "Asia/Tehran",         label: "Tehran" },
  { value: "Asia/Jerusalem",      label: "Jerusalem" },
  { value: "Asia/Beirut",         label: "Beirut, Amman" },
  { value: "Asia/Riyadh",         label: "Riyadh" },
  { value: "Asia/Taipei",         label: "Taipei" },
  { value: "Asia/Manila",         label: "Manila" },
  { value: "Asia/Makassar",       label: "Makassar (Central Indonesia)" },
  { value: "Asia/Jayapura",       label: "Jayapura (Eastern Indonesia)" },

  // Australia / Pacific
  { value: "Australia/Perth",     label: "Perth (Western Australia)" },
  { value: "Australia/Darwin",    label: "Darwin (Northern Territory)" },
  { value: "Australia/Adelaide",  label: "Adelaide" },
  { value: "Australia/Brisbane",  label: "Brisbane, Queensland" },
  { value: "Australia/Sydney",    label: "Sydney, Melbourne, Canberra" },
  { value: "Pacific/Auckland",    label: "Auckland, Wellington" },
  { value: "Pacific/Fiji",        label: "Fiji" },
  { value: "Pacific/Guam",        label: "Guam" },
]
