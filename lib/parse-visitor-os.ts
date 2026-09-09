/**
 * Parse mobile/desktop OS + version + device label from a browser User-Agent
 * for visit Telegram alerts.
 *
 * Android UAs often include a model token (e.g. SM-G973F) — we map common codes
 * to marketing names. iPhone UAs do not include “iPhone 11”; stay at class level
 * unless the client sends Client Hints `uaModel`.
 */

export type VisitorOsInfo = {
  /** Family name: iOS, Android, Windows, macOS, Linux, Chrome OS, Unknown */
  os: string
  /** Version segment when known (e.g. "17.2", "14", "10/11", "7") */
  version: string | null
  /** Display label for Telegram, e.g. "iOS 17.2", "Windows 10/11" */
  label: string
  /**
   * Hardware label for Telegram Device line.
   * Prefer marketing name when known (e.g. "Samsung Galaxy S10"), else class
   * ("iPhone") or "Android (SM-G973F)".
   */
  device: string
  /** Raw Android / CH model token when extracted */
  modelToken: string | null
}

export type ParseVisitorOsOptions = {
  /** Client Hints model (`Sec-CH-UA-Model` / `navigator.userAgentData`) when available */
  uaModel?: string | null
}

const WINDOWS_NT_LABELS: Record<string, string> = {
  "10.0": "10/11",
  "6.3": "8.1",
  "6.2": "8",
  "6.1": "7",
  "6.0": "Vista",
  "5.2": "XP",
  "5.1": "XP",
  "5.0": "2000",
}

/** Common Android model codes → marketing names (extend as needed). */
const ANDROID_MODEL_NAMES: Record<string, string> = {
  // Samsung Galaxy S
  "SM-G973F": "Samsung Galaxy S10",
  "SM-G973U": "Samsung Galaxy S10",
  "SM-G975F": "Samsung Galaxy S10+",
  "SM-G970F": "Samsung Galaxy S10e",
  "SM-G980F": "Samsung Galaxy S20",
  "SM-G981B": "Samsung Galaxy S20 5G",
  "SM-G985F": "Samsung Galaxy S20+",
  "SM-G986B": "Samsung Galaxy S20+ 5G",
  "SM-G988B": "Samsung Galaxy S20 Ultra",
  "SM-G991B": "Samsung Galaxy S21",
  "SM-G996B": "Samsung Galaxy S21+",
  "SM-G998B": "Samsung Galaxy S21 Ultra",
  "SM-S901B": "Samsung Galaxy S22",
  "SM-S906B": "Samsung Galaxy S22+",
  "SM-S908B": "Samsung Galaxy S22 Ultra",
  "SM-S911B": "Samsung Galaxy S23",
  "SM-S916B": "Samsung Galaxy S23+",
  "SM-S918B": "Samsung Galaxy S23 Ultra",
  "SM-S921B": "Samsung Galaxy S24",
  "SM-S926B": "Samsung Galaxy S24+",
  "SM-S928B": "Samsung Galaxy S24 Ultra",
  // Samsung A / Note (sample)
  "SM-A515F": "Samsung Galaxy A51",
  "SM-A525F": "Samsung Galaxy A52",
  "SM-A536B": "Samsung Galaxy A53",
  "SM-A546B": "Samsung Galaxy A54",
  "SM-N975F": "Samsung Galaxy Note 10+",
  "SM-N986B": "Samsung Galaxy Note 20 Ultra",
  // Google Pixel
  "Pixel 3": "Google Pixel 3",
  "Pixel 3a": "Google Pixel 3a",
  "Pixel 4": "Google Pixel 4",
  "Pixel 4a": "Google Pixel 4a",
  "Pixel 5": "Google Pixel 5",
  "Pixel 6": "Google Pixel 6",
  "Pixel 6a": "Google Pixel 6a",
  "Pixel 6 Pro": "Google Pixel 6 Pro",
  "Pixel 7": "Google Pixel 7",
  "Pixel 7a": "Google Pixel 7a",
  "Pixel 7 Pro": "Google Pixel 7 Pro",
  "Pixel 8": "Google Pixel 8",
  "Pixel 8a": "Google Pixel 8a",
  "Pixel 8 Pro": "Google Pixel 8 Pro",
  "Pixel 9": "Google Pixel 9",
  "Pixel 9 Pro": "Google Pixel 9 Pro",
  // Xiaomi / Redmi / POCO (numeric codes + names)
  "2201123G": "Xiaomi 12",
  "2201122G": "Xiaomi 12 Pro",
  "2211133G": "Xiaomi 13",
  "2210132G": "Xiaomi 13 Pro",
  "2311DRK48G": "Xiaomi 14",
  "M2102J20SG": "Xiaomi Mi 11",
  "M2011K2G": "Xiaomi Mi 11",
  "Mi 11": "Xiaomi Mi 11",
  "Mi 10": "Xiaomi Mi 10",
  "Redmi Note 10": "Xiaomi Redmi Note 10",
  "Redmi Note 11": "Xiaomi Redmi Note 11",
  "Redmi Note 12": "Xiaomi Redmi Note 12",
  "22101316G": "Xiaomi Redmi Note 12",
  "POCO F3": "POCO F3",
  "POCO X3": "POCO X3",
  "POCO X5": "POCO X5",
  // OnePlus
  "ONEPLUS A6003": "OnePlus 6",
  "GM1913": "OnePlus 7 Pro",
  "IN2023": "OnePlus 8 Pro",
  "LE2123": "OnePlus 9 Pro",
  "NE2213": "OnePlus 10 Pro",
  "CPH2413": "OnePlus 11",
  "CPH2449": "OnePlus 12",
  // Oppo / Vivo / Realme (samples)
  "CPH2197": "OPPO A74",
  "CPH2375": "OPPO Reno7",
  "V2025": "vivo Y20",
  "V2145": "vivo V23",
  "RMX3085": "realme 8",
  "RMX3363": "realme GT Master",
  // Infinix / Tecno / itel
  "Infinix X6812": "Infinix Hot 11",
  "Infinix X6820": "Infinix Note 11",
  "Infinix X6882": "Infinix Hot 12",
  "Infinix X669": "Infinix Hot 20",
  "Infinix X6711": "Infinix Note 30",
  "TECNO KG5": "Tecno Spark 8",
  "TECNO KF6": "Tecno Spark 7",
  "TECNO LH7n": "Tecno Camon 20",
}

const SKIP_ANDROID_MODEL_TOKENS = new Set(
  [
    "wv",
    "mobile",
    "okhttp",
    "android",
    "linux",
    "u",
    "en-us",
    "en_us",
    "zh-cn",
    "zh_cn",
    "arm64",
    "aarch64",
    "x86_64",
    "i686",
    "sdk_gphone",
    "generic",
    "unknown",
  ].map((s) => s.toLowerCase()),
)

function buildLabel(os: string, version: string | null): string {
  if (!version) return os
  return `${os} ${version}`
}

function normalizeModelKey(token: string): string {
  return token.trim().replace(/_/g, " ")
}

/**
 * Pull the device model segment from a typical Android UA:
 * `... Android 14; SM-G973F Build/...` or `... Android 13; Pixel 7) AppleWebKit/...`
 */
export function extractAndroidModelToken(userAgent: string): string | null {
  const ua = userAgent.trim()
  if (!ua || !/Android/i.test(ua)) return null

  const buildMatch = ua.match(
    /Android[^;]*;\s*([^;)]+?)\s+Build\//i,
  )
  if (buildMatch?.[1]) {
    const token = buildMatch[1].trim()
    if (token && !SKIP_ANDROID_MODEL_TOKENS.has(token.toLowerCase())) {
      return token
    }
  }

  const parenMatch = ua.match(/Android[\d.\s]*;\s*([^;)]+)\)/i)
  if (parenMatch?.[1]) {
    let token = parenMatch[1].trim()
    // Drop trailing "Build/..." if somehow included
    token = token.replace(/\s+Build\/.*$/i, "").trim()
    // Sometimes "K" or locale alone — skip junk
    if (
      token &&
      token.length >= 2 &&
      !SKIP_ANDROID_MODEL_TOKENS.has(token.toLowerCase()) &&
      !/^[a-z]{2}[-_][a-z]{2}$/i.test(token)
    ) {
      return token
    }
  }

  return null
}

function brandHeuristic(token: string): string | null {
  const t = token.trim()
  const upper = t.toUpperCase()
  if (upper.startsWith("SM-") || upper.startsWith("SAMSUNG")) {
    return `Samsung (${t})`
  }
  if (/^PIXEL\b/i.test(t)) return t.startsWith("Google") ? t : `Google ${t}`
  if (/^(MI |REDMI|POCO|M2\d{3}|22\d{4}|23\d{4})/i.test(t) || /^XIAOMI/i.test(t)) {
    return t.toLowerCase().includes("xiaomi") || t.toLowerCase().includes("redmi") || t.toLowerCase().includes("poco")
      ? t
      : `Xiaomi (${t})`
  }
  if (/^INFINIX/i.test(t)) return t
  if (/^TECNO/i.test(t)) return t
  if (/^ITEL/i.test(t)) return t
  if (/^ONEPLUS|^GM\d|^IN\d|^LE\d|^NE\d|^CPH\d/i.test(t) && /ONEPLUS|GM|IN2|LE2|NE2/i.test(upper)) {
    if (/^ONEPLUS/i.test(t)) return t
    if (/^CPH/i.test(t)) return `OPPO/OnePlus (${t})`
  }
  if (/^CPH\d/i.test(t)) return `OPPO (${t})`
  if (/^V\d{4}/i.test(t)) return `vivo (${t})`
  if (/^RMX\d/i.test(t)) return `realme (${t})`
  if (/^LM-|^LG-/i.test(t)) return `LG (${t})`
  if (/^HUAWEI|^VOG-|^ANA-|^ELS-/i.test(t)) return `Huawei (${t})`
  if (/^MAR-|ART-|NEN-|NOH-/i.test(t)) return `Huawei/Honor (${t})`
  return null
}

/**
 * Resolve a display device label from an Android model token or Client Hint.
 */
export function resolveAndroidDeviceLabel(modelToken: string | null | undefined): string {
  const raw = (modelToken ?? "").trim()
  if (!raw) return "Android"

  const key = normalizeModelKey(raw)
  const mapped =
    ANDROID_MODEL_NAMES[key] ||
    ANDROID_MODEL_NAMES[key.toUpperCase()] ||
    ANDROID_MODEL_NAMES[raw] ||
    ANDROID_MODEL_NAMES[raw.toUpperCase()]
  if (mapped) return mapped

  const heuristic = brandHeuristic(key)
  if (heuristic) return heuristic

  return `Android (${key})`
}

function preferClientHintModel(
  classDevice: string,
  uaModel: string | null | undefined,
): string {
  const hint = (uaModel ?? "").trim()
  if (!hint || hint === '""' || hint.toLowerCase() === "unknown") {
    return classDevice
  }
  // Android CH model is usually the same token as UA
  if (classDevice === "Android" || classDevice.startsWith("Android (")) {
    return resolveAndroidDeviceLabel(hint)
  }
  // iOS / other: use CH when present (rare on Safari)
  if (/iphone/i.test(hint)) return hint
  if (/ipad/i.test(hint)) return hint
  return hint
}

/**
 * Extract OS family + version + device label from a User-Agent.
 * Prefer mobile matches before desktop (Android contains "Linux").
 */
export function parseVisitorOs(
  userAgent: string,
  options?: ParseVisitorOsOptions,
): VisitorOsInfo {
  const ua = (userAgent ?? "").trim()
  const uaModel = options?.uaModel?.trim() || null

  if (!ua) {
    if (uaModel) {
      return {
        os: "Unknown",
        version: null,
        label: "Unknown",
        device: preferClientHintModel("Unknown", uaModel),
        modelToken: uaModel,
      }
    }
    return {
      os: "Unknown",
      version: null,
      label: "Unknown",
      device: "Unknown",
      modelToken: null,
    }
  }

  // iOS (iPhone / iPad / iPod) — before macOS (iPadOS desktop UA can look like Mac)
  const iosMatch = ua.match(/CPU (?:iPhone )?OS (\d+[_\d]*)/i)
  if (iosMatch?.[1] || /iPhone|iPad|iPod/i.test(ua)) {
    const version = iosMatch?.[1] ? iosMatch[1].replace(/_/g, ".") : null
    let device = "iPhone"
    if (/iPad/i.test(ua)) device = "iPad"
    else if (/iPod/i.test(ua)) device = "iPod"
    else if (/iPhone/i.test(ua)) device = "iPhone"
    return {
      os: "iOS",
      version,
      label: buildLabel("iOS", version),
      device: preferClientHintModel(device, uaModel),
      modelToken: uaModel,
    }
  }

  // Android
  const androidMatch = ua.match(/Android\s+([\d.]+)/i)
  if (androidMatch?.[1] || /Android/i.test(ua)) {
    const version = androidMatch?.[1] ?? null
    const token = uaModel || extractAndroidModelToken(ua)
    return {
      os: "Android",
      version,
      label: buildLabel("Android", version),
      device: resolveAndroidDeviceLabel(token),
      modelToken: token,
    }
  }

  // Windows
  const winNt = ua.match(/Windows NT (\d+\.\d+)/i)
  if (winNt?.[1] || /Windows/i.test(ua)) {
    const nt = winNt?.[1] ?? null
    const mapped = nt ? WINDOWS_NT_LABELS[nt] ?? null : null
    const version = mapped ?? (nt ? `NT ${nt}` : null)
    return {
      os: "Windows",
      version,
      label: buildLabel("Windows", version),
      device: preferClientHintModel("Windows PC", uaModel),
      modelToken: uaModel,
    }
  }

  // macOS
  const macMatch = ua.match(/Mac OS X (\d+[._\d]*)/i)
  if (macMatch?.[1] || /Macintosh|Mac OS X/i.test(ua)) {
    const version = macMatch?.[1] ? macMatch[1].replace(/_/g, ".") : null
    return {
      os: "macOS",
      version,
      label: buildLabel("macOS", version),
      device: preferClientHintModel("Mac", uaModel),
      modelToken: uaModel,
    }
  }

  // Chrome OS before generic Linux
  if (/CrOS/i.test(ua)) {
    return {
      os: "Chrome OS",
      version: null,
      label: "Chrome OS",
      device: preferClientHintModel("Chrome OS", uaModel),
      modelToken: uaModel,
    }
  }

  // Linux (non-Android already handled)
  if (/Linux/i.test(ua)) {
    return {
      os: "Linux",
      version: null,
      label: "Linux",
      device: preferClientHintModel("Linux", uaModel),
      modelToken: uaModel,
    }
  }

  return {
    os: "Unknown",
    version: null,
    label: "Unknown",
    device: preferClientHintModel("Unknown", uaModel),
    modelToken: uaModel,
  }
}
