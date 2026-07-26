import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { getBearerToken } from "./src/services/storage";
import { ErrorFallback } from "./src/screens/ErrorFallback";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { WebViewScreen } from "./src/screens/WebViewScreen";

/**
 * The root navigator for the shell app.
 *
 * Screen states:
 * - "loading"   — checking SecureStore for an existing session
 * - "login"     — no stored token, show the sign-in form
 * - "home"      — authenticated, show home with OTT launch button
 * - "webview"   — WebView open with the OTT handshake URL
 * - "error"     — a fatal error occurred during app init
 */
type Screen =
  | { name: "loading" }
  | { name: "login" }
  | { name: "home"; bearerToken: string }
  | { name: "webview"; handshakeUrl: string; appName: string }
  | { name: "error"; message: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "loading" });
  // Keep the bearer token at the app level so it survives WebView -> Home
  // navigation without re-reading from SecureStore
  const [bearerToken, setBearerToken] = useState<string | null>(null);

  useEffect(() => {
    getBearerToken()
      .then((token) => {
        if (token) {
          setBearerToken(token);
          setScreen({ name: "home", bearerToken: token });
        } else {
          setScreen({ name: "login" });
        }
      })
      .catch(() => {
        setScreen({ name: "login" });
      });
  }, []);

  const handleLoginSuccess = useCallback((token: string) => {
    setBearerToken(token);
    setScreen({ name: "home", bearerToken: token });
  }, []);

  const handleOpenWebView = useCallback((handshakeUrl: string, appName: string) => {
    setScreen({ name: "webview", handshakeUrl, appName });
  }, []);

  const handleWebViewClose = useCallback(() => {
    // Bearer token is kept in the closure via the bearerToken state.
    // Navigate back to home with it.
    if (bearerToken) {
      setScreen({ name: "home", bearerToken });
    } else {
      // Token was lost (sign-out while WebView was open) — go to login
      setScreen({ name: "login" });
    }
  }, [bearerToken]);

  const handleSignOut = useCallback(() => {
    setBearerToken(null);
    setScreen({ name: "login" });
  }, []);

  // ---- Render the active screen ----
  const renderScreen = () => {
    switch (screen.name) {
      case "loading":
        return null;
      case "login":
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
      case "home":
        return (
          <HomeScreen
            bearerToken={screen.bearerToken}
            onOpenWebView={handleOpenWebView}
            onSignOut={handleSignOut}
          />
        );
      case "webview":
        return (
          <WebViewScreen
            handshakeUrl={screen.handshakeUrl}
            appName={screen.appName}
            onClose={handleWebViewClose}
          />
        );
      case "error":
        return <ErrorFallback errorDescription={screen.message} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
});
