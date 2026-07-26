import Constants from "expo-constants";
import { Platform } from "react-native";

const BACKEND_PORT = 3001;

/**
 * How to reach the backend from a device/simulator.
 *
 * - iOS simulator: localhost works (host is the Mac)
 * - Android emulator: 10.0.2.2 maps to the host machine
 * - Physical device (Expo Go): uses the dev machine's LAN IP from
 *   Constants.expoConfig?.hostUri (e.g. "192.168.1.5:8081")
 */
function resolveApiHost(): string {
  // Physical device via Expo Go — derive LAN IP from the dev server host
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:${BACKEND_PORT}`;
  }

  if (Platform.OS === "android") {
    // Android emulator's alias for the host machine
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }

  // iOS simulator — localhost maps to the host machine
  return `http://localhost:${BACKEND_PORT}`;
}

export const API_BASE_URL = resolveApiHost();

/**
 * The installed native app version from app.json.
 * Used client-side to filter bundled manifest entries by min_app_version.
 * The remote manifest is already filtered server-side via the X-App-Version header.
 */
export const APP_VERSION: string = Constants.expoConfig?.version ?? "1.0.0";

/**
 * Secure store keys
 */
export const STORAGE_KEYS = {
  /** The bearer token returned after email/password sign-in */
  BEARER_TOKEN: "shell_bearer_token",
  /** The authenticated user's email, stored alongside the token for UX */
  USER_EMAIL: "shell_user_email",
  /** Cached manifest JSON from the last successful remote fetch */
  MANIFEST_CACHE: "shell_manifest_cache",
} as const;
