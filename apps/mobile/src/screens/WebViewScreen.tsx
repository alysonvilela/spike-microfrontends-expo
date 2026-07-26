import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { ErrorFallback } from "./ErrorFallback";

type WebViewScreenProps = {
  /** The fully constructed /webview/enter URL to load */
  handshakeUrl: string;
  /** Called when the user wants to close the WebView and go back to Home */
  onClose: () => void;
};

type WebViewState = "loading" | "success" | "error";

/**
 * A full-screen WebView that performs the OTT handshake and displays the
 * resulting authenticated page.
 *
 * Cookie settings:
 * - `sharedCookiesEnabled` — shares the WKWebView cookie store with other
 *   system components on iOS. Required for the session cookie set by the
 *   302 redirect to survive.
 * - `thirdPartyCookiesEnabled` — needed on iOS to accept cookies set during
 *   a cross-origin redirect chain.
 *
 * Error handling:
 * - `onError` — a full-load failure (bad URL, DNS, SSL).
 * - `onHttpError` — an HTTP-level error (4xx, 5xx from the server).
 * Both render the `ErrorFallback` component instead of a blank/white page.
 */
export function WebViewScreen({ handshakeUrl, onClose }: WebViewScreenProps) {
  const webViewRef = useRef<WebView>(null);
  const [state, setState] = useState<WebViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleError = useCallback((event: { nativeEvent: { description: string } }) => {
    setState("error");
    setErrorMessage(event.nativeEvent.description);
  }, []);

  const handleHttpError = useCallback(
    (event: { nativeEvent: { statusCode: number; description: string } }) => {
      setState("error");
      setErrorMessage(
        `HTTP ${event.nativeEvent.statusCode}: ${event.nativeEvent.description}`,
      );
    },
    [],
  );

  const handleNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    // If we navigated away from the handshake URL and got a successful
    // page load, consider it success. The handshake redirects to the
    // debug page which is a normal HTML page.
    if (!nav.loading && nav.url !== handshakeUrl && nav.url !== "about:blank") {
      setState("success");
    }
  }, [handshakeUrl]);

  const handleRetry = useCallback(() => {
    setState("loading");
    setErrorMessage(null);
    webViewRef.current?.reload();
  }, []);

  // ---- Error state ----
  if (state === "error" && errorMessage) {
    return (
      <ErrorFallback
        errorDescription={errorMessage}
        onRetry={handleRetry}
        onGoBack={onClose}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
        <Text style={styles.headerTitle}>WebView</Text>
        {state === "loading" && (
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        )}
        {state === "success" && (
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeText}>Connected</Text>
          </View>
        )}
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: handshakeUrl }}
        style={styles.webView}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onError={handleError}
        onHttpError={handleHttpError}
        onNavigationStateChange={handleNavigationStateChange}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Handshake in progress...</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fafafa",
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  closeButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginRight: 60,
  },
  loadingSpinner: {
    width: 60,
    alignItems: "flex-end",
  },
  successBadge: {
    width: 60,
    alignItems: "flex-end",
  },
  successBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    overflow: "hidden",
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
});
