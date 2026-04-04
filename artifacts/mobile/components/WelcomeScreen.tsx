import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";

type Tab = "signin" | "signup";

const FEATURES = [
  { icon: "globe" as const, label: "Translate" },
  { icon: "mic" as const, label: "Voice" },
  { icon: "message-square" as const, label: "Conversation" },
];

export function WelcomeScreen() {
  const { signIn, signInWithEmail, signUpWithEmail, sendPasswordReset } = useApp();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<Tab>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setError(null);
  };

  const handleEmailSignIn = async () => {
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!password) { setError("Please enter your password."); return; }
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setError(null);
    setLoading(true);
    try {
      await signUpWithEmail(email.trim().toLowerCase(), password, name.trim());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email above, then tap Forgot Password.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim().toLowerCase());
      Alert.alert("Email Sent", "Check your inbox for a password reset link.", [{ text: "OK" }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      if (err?.message === "EXPO_GO_LIMITATION") {
        Alert.alert(
          "Google Sign-In Unavailable",
          "Use Email/Password sign-in below, or open the\nReplit web preview tab where Google Sign-In works.",
          [{ text: "OK" }]
        );
      } else {
        setError("Could not sign in with Google. Please try again.");
        if (__DEV__) console.error("[AUTH] Google sign-in error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#FF6B00", "#7C2D8F", "#0A1628"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Top hero section ── */}
      <View style={[styles.top, { paddingTop: insets.top + 32 }]}>
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Feather name="globe" size={36} color="#FF6B00" />
          </View>
          <Text style={styles.logoText}>BhaashAI</Text>
          <Text style={styles.devanagari}>भाषा-AI</Text>
        </View>

        <Text style={styles.tagline}>
          Real-time translation across all 22{"\n"}official Indian languages
        </Text>

        <View style={styles.chips}>
          {FEATURES.map((f) => (
            <View key={f.icon} style={styles.chip}>
              <Feather name={f.icon} size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.chipText}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Bottom card ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.cardWrapper}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.cardScroll,
            { paddingBottom: insets.bottom + 32 },
          ]}
        >
          <View style={styles.card}>
            {/* Tab switcher */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "signin" && styles.tabActive]}
                onPress={() => switchTab("signin")}
              >
                <Text style={[styles.tabText, activeTab === "signin" && styles.tabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "signup" && styles.tabActive]}
                onPress={() => switchTab("signup")}
              >
                <Text style={[styles.tabText, activeTab === "signup" && styles.tabTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── SIGN IN TAB ── */}
            {activeTab === "signin" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                  textContentType="emailAddress"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />

                <View style={styles.passwordWrap}>
                  <TextInput
                    ref={passwordRef}
                    style={styles.inputPassword}
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    returnKeyType="done"
                    textContentType="password"
                    onSubmitEditing={handleEmailSignIn}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((p) => !p)}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.forgotWrap}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>

                {error && <ErrorBox message={error} />}

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={handleEmailSignIn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                <Divider />

                <GoogleButton onPress={handleGoogleSignIn} loading={loading} />

                {__DEV__ && (
                  <TouchableOpacity
                    onPress={() => {
                      setEmail("test@bhaashai.app");
                      setPassword("Test@123456");
                      setActiveTab("signin");
                    }}
                    style={styles.devBtn}
                  >
                    <Text style={styles.devBtnText}>Dev: Fill Test Credentials</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ── SIGN UP TAB ── */}
            {activeTab === "signup" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="name"
                  returnKeyType="next"
                  textContentType="name"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />

                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                  textContentType="emailAddress"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />

                <View style={styles.passwordWrap}>
                  <TextInput
                    ref={passwordRef}
                    style={styles.inputPassword}
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    returnKeyType="next"
                    textContentType="password"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((p) => !p)}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordWrap}>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.inputPassword}
                    placeholder="Confirm password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    textContentType="newPassword"
                    onSubmitEditing={handleEmailSignUp}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirmPassword((p) => !p)}
                  >
                    <Feather
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>

                {error && <ErrorBox message={error} />}

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={handleEmailSignUp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Create Account</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.freeCredits}>
                  ₹100 free credits on signup — no subscription
                </Text>

                <Divider />

                <GoogleButton onPress={handleGoogleSignIn} loading={loading} />
              </>
            )}

            <Text style={styles.terms}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function Divider() {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function GoogleButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <TouchableOpacity style={styles.googleBtn} onPress={onPress} disabled={loading}>
      <View style={styles.googleIcon}>
        <Text style={styles.googleIconText}>G</Text>
      </View>
      <Text style={styles.googleBtnText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A1628" },

  top: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  logoWrap: { alignItems: "center", marginBottom: 16 },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logoText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  devanagari: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  chips: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },

  cardWrapper: { flex: 1 },
  cardScroll: { flexGrow: 1, justifyContent: "flex-end" },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },

  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#FF6B00",
    shadowColor: "#FF6B00",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tabText: { fontSize: 14, color: "#6B7280", fontFamily: "Inter_500Medium" },
  tabTextActive: { color: "#FFF", fontFamily: "Inter_700Bold" },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
    color: "#111",
    marginBottom: 12,
    fontFamily: "Inter_400Regular",
  },
  passwordWrap: {
    position: "relative",
    marginBottom: 12,
  },
  inputPassword: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
    color: "#111",
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    height: 50,
    justifyContent: "center",
  },

  forgotWrap: { alignSelf: "flex-end", marginBottom: 16, marginTop: -4 },
  forgotText: { fontSize: 13, color: "#FF6B00", fontFamily: "Inter_500Medium" },

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  errorText: { color: "#DC2626", fontSize: 13, fontFamily: "Inter_400Regular" },

  primaryBtn: {
    height: 52,
    backgroundColor: "#FF6B00",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },

  freeCredits: {
    fontSize: 13,
    color: "#16A34A",
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { marginHorizontal: 12, color: "#9CA3AF", fontSize: 13, fontFamily: "Inter_400Regular" },

  googleBtn: {
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  googleBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#202124" },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },

  devBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#6366F1",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  devBtnText: { color: "#6366F1", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  terms: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 16,
    marginBottom: 4,
  },
});
