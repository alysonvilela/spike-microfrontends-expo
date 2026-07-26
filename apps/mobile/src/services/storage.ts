import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "../constants";

/**
 * Persist the bearer token to SecureStore.
 */
export async function saveBearerToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.BEARER_TOKEN, token);
}

/**
 * Retrieve the stored bearer token, or null if none exists.
 */
export async function getBearerToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.BEARER_TOKEN);
}

/**
 * Remove the bearer token (sign-out).
 */
export async function clearBearerToken(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.BEARER_TOKEN);
}

/**
 * Persist the user's email for display purposes.
 */
export async function saveUserEmail(email: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.USER_EMAIL, email);
}

/**
 * Retrieve the stored user email.
 */
export async function getUserEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.USER_EMAIL);
}

/**
 * Persist the last fetched manifest JSON for cold-start cache.
 */
export async function saveManifestCache(manifestJson: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.MANIFEST_CACHE, manifestJson);
}

/**
 * Retrieve the cached manifest JSON, or null if none exists.
 */
export async function getManifestCache(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.MANIFEST_CACHE);
}

/**
 * Clear all shell-related SecureStore entries (full sign-out).
 */
export async function clearAll(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(STORAGE_KEYS.BEARER_TOKEN),
    SecureStore.deleteItemAsync(STORAGE_KEYS.USER_EMAIL),
    SecureStore.deleteItemAsync(STORAGE_KEYS.MANIFEST_CACHE),
  ]);
}
