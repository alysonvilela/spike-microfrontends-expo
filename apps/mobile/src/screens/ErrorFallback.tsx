import { Pressable, StyleSheet, Text, View } from "react-native";

type ErrorFallbackProps = {
  errorDescription: string;
  onRetry?: () => void;
  onGoBack?: () => void;
};

export function ErrorFallback({ errorDescription, onRetry, onGoBack }: ErrorFallbackProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>WebView Error</Text>
        <Text style={styles.description}>{errorDescription}</Text>

        <View style={styles.actions}>
          {onRetry && (
            <Pressable style={styles.button} onPress={onRetry}>
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
          )}

          {onGoBack && (
            <Pressable style={styles.secondaryButton} onPress={onGoBack}>
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </Pressable>
          )}
        </View>
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
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    width: "100%",
    gap: 8,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
});
