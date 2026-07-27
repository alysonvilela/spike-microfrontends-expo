import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Manifest as ManifestType } from "manifest";
import { API_BASE_URL, APP_VERSION } from "../constants";
import { startManifestLoad } from "../services/manifest";
import { generateOtt, signOut } from "../services/api";
import { clearAll, getUserEmail } from "../services/storage";

type HomeScreenProps = {
  bearerToken: string;
  onOpenWebView: (handshakeUrl: string, appName: string) => void;
  onSignOut: () => void;
};

export function HomeScreen({
  bearerToken,
  onOpenWebView,
  onSignOut,
}: HomeScreenProps) {
  const [manifest, setManifest] = useState<ManifestType | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [openingAppId, setOpeningAppId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserEmail().then(setUserEmail);
  }, []);

  // Load the bundled manifest immediately, start background refresh
  useEffect(() => {
    const initial = startManifestLoad(bearerToken, setManifest);
    setManifest(initial);
  }, [bearerToken]);

  async function handleOpenApp(appId: string, entryUrl: string, appName: string) {
    setError(null);
    setOpeningAppId(appId);

    try {
      const result = await generateOtt(bearerToken);

      if (result.ok) {
        const handshakeUrl = `${API_BASE_URL}/webview/enter?token=${encodeURIComponent(result.token)}&to=${encodeURIComponent(entryUrl)}`;
        onOpenWebView(handshakeUrl, appName);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to generate one-time token");
    } finally {
      setOpeningAppId(null);
    }
  }

  async function handleSignOut() {
    await signOut(bearerToken);
    await clearAll();
    onSignOut();
  }

  const apps = manifest?.apps ?? [];
  const isSingleApp = apps.length === 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Shell Home</Text>
        <Text style={styles.subtitle}>
          Signed in as {userEmail ?? "loading..."}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Available Apps</Text>
      <Text style={styles.description}>
        App version {APP_VERSION}. Tap an app to open it via authenticated
        WebView.
      </Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {apps.map((app) => (
        <View key={app.id} style={styles.appCard}>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>{app.name}</Text>
            <Text style={styles.appUrl} numberOfLines={1}>
              {app.entry}
            </Text>
          </View>
          <Pressable
            style={[
              styles.openButton,
              openingAppId === app.id && styles.buttonDisabled,
            ]}
            onPress={() => handleOpenApp(app.id, app.entry, app.name)}
            disabled={openingAppId === app.id}
          >
            {openingAppId === app.id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.openButtonText}>Open</Text>
            )}
          </Pressable>
        </View>
      ))}

      {apps.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No apps available for this device. Your app version ({APP_VERSION})
            may be too old.
          </Text>
        </View>
      )}

      {!isSingleApp && apps.length > 0 && (
        <Text style={styles.appCount}>
          {apps.length} app{apps.length !== 1 ? "s" : ""} available
        </Text>
      )}

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#888",
    marginBottom: 16,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
  },
  appCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  appInfo: {
    flex: 1,
    marginRight: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  appUrl: {
    fontSize: 12,
    color: "#888",
  },
  openButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  openButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
  appCount: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  signOutButton: {
    alignItems: "center",
    padding: 12,
    marginTop: 8,
  },
  signOutText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "500",
  },
});
