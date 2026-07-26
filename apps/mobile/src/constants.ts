import { Platform } from "react-native";

/**
 * How to reach the backend from a device/simulator.
 *
 * - iOS simulator: localhost works (host is the Mac)
 * - Android emulator: 10.0.2.2 maps to the host machine
 * - Physical device: must use the machine's LAN IP
 *
 * Set EXPO_PUBLIC_API_BASE_URL in a .env file to override at build time
 * (Metro replaces the string at bundle time, but TS won't validate it).
 */
function resolveApiHost(): string {
  if (Platform.OS === "android") {
    // Android emulator's alias for the host machine
    return "http://10.0.2.2:3001";
  }

  // iOS simulator and others
  return "http://localhost:3001";
}

export const API_BASE_URL = resolveApiHost();

/**
 * The debug page served by the backend — the WebView test target.
 * This page is only reachable with a valid session (bearer token or cookie).
 */
export const DEBUG_PAGE_PATH = "/debug";

/**
 * Secure store keys
 */
export const STORAGE_KEYS = {
  /** The bearer token returned after email/password sign-in */
  BEARER_TOKEN: "shell_bearer_token",
  /** The authenticated user's email, stored alongside the token for UX */
  USER_EMAIL: "shell_user_email",
} as const;
