import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function AuthScreen() {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Email and password are required.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMessage(friendlyError(e.code));
    }
  }

  function switchMode() {
    setMode((m) => (m === "login" ? "register" : "login"));
    setStatus("idle");
    setErrorMessage("");
  }

  const isLogin = mode === "login";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>
        {isLogin ? "Welcome Back" : "Create Account"}
      </Text>
      <Text style={styles.subtitle}>
        {isLogin
          ? "Sign in to continue."
          : "Fill in your details to get started."}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {status === "error" && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
      {status === "success" && (
        <Text style={styles.successText}>
          {isLogin ? "Logged in successfully!" : "Account created!"}
        </Text>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleSubmit}
        disabled={status === "loading"}
      >
        {status === "loading" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {isLogin ? "Log In" : "Register"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.switchButton} onPress={switchMode}>
        <Text style={styles.switchText}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Text style={styles.switchLink}>
            {isLogin ? "Register" : "Log In"}
          </Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

function friendlyError(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    default:
      return "Something went wrong. Please try again.";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f9fc",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dde3ef",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1a1a2e",
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: "#4a6cf7",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  switchButton: {
    marginTop: 20,
    alignItems: "center",
  },
  switchText: {
    color: "#666",
    fontSize: 14,
  },
  switchLink: {
    color: "#4a6cf7",
    fontWeight: "600",
  },
  errorText: {
    color: "#e53e3e",
    fontSize: 13,
    marginBottom: 10,
  },
  successText: {
    color: "#38a169",
    fontSize: 13,
    marginBottom: 10,
  },
});
