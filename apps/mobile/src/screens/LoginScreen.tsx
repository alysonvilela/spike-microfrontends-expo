import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { signIn, signUp, type SignInResult } from "../services/api";
import { saveBearerToken, saveUserEmail } from "../services/storage";

type LoginScreenProps = {
  onLoginSuccess: (token: string, email: string) => void;
};

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }
    if (mode === "sign-up" && !name.trim()) {
      setError("Please enter your name");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result: SignInResult =
        mode === "sign-in"
          ? await signIn(email.trim(), password)
          : await signUp(name.trim(), email.trim(), password);

      if (result.ok) {
        await Promise.all([
          saveBearerToken(result.token),
          saveUserEmail(result.user.email),
        ]);
        onLoginSuccess(result.token, result.user.email);
      } else {
        setError(result.error);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  const toggleMode = () => {
    setMode(mode === "sign-in" ? "sign-up" : "sign-in");
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Microfrontends Shell</Text>
        <Text style={styles.subtitle}>
          {mode === "sign-in" ? "Sign in to continue" : "Create your account"}
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {mode === "sign-up" && (
          <>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#999"
              autoCapitalize="words"
              textContentType="name"
              editable={!isLoading}
            />
          </>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!isLoading}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor="#999"
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          editable={!isLoading}
          onSubmitEditing={handleSubmit}
        />

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {mode === "sign-in" ? "Sign In" : "Create Account"}
            </Text>
          )}
        </Pressable>

        <Pressable style={styles.toggleLink} onPress={toggleMode}>
          <Text style={styles.toggleLinkText}>
            {mode === "sign-in"
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: "#1a1a1a",
    backgroundColor: "#fafafa",
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  toggleLink: {
    alignItems: "center",
    padding: 12,
    marginTop: 4,
  },
  toggleLinkText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
  },
});
