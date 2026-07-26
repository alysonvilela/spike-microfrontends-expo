import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { API_BASE_URL, DEBUG_PAGE_PATH } from "../constants";
import { generateOtt } from "../services/api";
import { clearAll, getUserEmail } from "../services/storage";

type HomeScreenProps = {
  bearerToken: string;
  onOpenWebView: (ottUrl: string) => void;
  onSignOut: () => void;
};

export function HomeScreen({ bearerToken, onOpenWebView, onSignOut }: HomeScreenProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the stored email on mount for display
  useEffect(() => {
    getUserEmail().then(setUserEmail);
  }, []);

  async function handleOpenDebugPage() {
    setError(null);
    setIsGenerating(true);

    try {
      const result = await generateOtt(bearerToken);

      if (result.ok) {
        const targetUrl = `${API_BASE_URL}${DEBUG_PAGE_PATH}`;
        const handshakeUrl = `${API_BASE_URL}/webview/enter?token=${encodeURIComponent(result.token)}&to=${encodeURIComponent(targetUrl)}`;
        onOpenWebView(handshakeUrl);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to generate one-time token");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSignOut() {
    await clearAll();
    onSignOut();
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Shell Home</Text>
        <Text style={styles.subtitle}>
          Signed in as {userEmail ?? "loading..."}
        </Text>

        <Text style={styles.sectionTitle}>WebView Test</Text>
        <Text style={styles.description}>
          Generate a one-time token and open the backend's debug page inside a
          WebView. This proves the OTT handshake and cookie-based session
          persistence work on this device.
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={[styles.button, isGenerating && styles.buttonDisabled]}
          onPress={handleOpenDebugPage}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Open Debug Page</Text>
          )}
        </Pressable>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 20,
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
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    alignItems: "center",
    padding: 8,
  },
  signOutText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "500",
  },
});
