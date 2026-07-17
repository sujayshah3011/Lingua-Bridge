import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppLogo } from "@/components/AppLogo";
import { useApp } from "@/context/AppContext";

type Tab = "signin" | "signup";

const FEATURES = [
  { icon: "globe" as const, label: "Translate" },
  { icon: "mic" as const, label: "Voice" },
  { icon: "message-square" as const, label: "Conversation" },
];

function useSpringScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  return { scale, pressIn, pressOut };
}

function SpringPressable({
  children,
  style,
  onPress,
  disabled,
  ...props
}: React.ComponentProps<typeof Pressable> & { children: React.ReactNode }) {
  const { scale, pressIn, pressOut } = useSpringScale();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      style={style as any}
      {...props}
    >
      {/* style is applied on both layers: the outer Pressable needs it to
          participate correctly in a parent flex row (e.g. flex: 1 to split
          width with a sibling tab), while the inner Animated.View needs it
          too so its own children (icon + label, etc.) still lay out per
          flexDirection/alignItems as authored. Only the transform belongs
          on the inner view alone. */}
      <Animated.View style={[style as any, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

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
        colors={["#FFF8F0", "#FFEDE0", "#FFE0CC"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
        >
          {/* ── Hero ── */}
          <View style={styles.hero}>
            <View style={styles.logoOuter}>
              <View style={styles.logoInner}>
                <AppLogo size={32} color="#FF6B00" strokeWidth={18} />
              </View>
            </View>
            <Text style={styles.appName}>BhaashAI</Text>
            <Text style={styles.devanagari}>भाषा-AI</Text>
            <Text style={styles.tagline}>
              Real-time translation across all 22 official Indian languages
            </Text>

            <View style={styles.chipsRow}>
              {FEATURES.map((f) => (
                <View key={f.icon} style={styles.chip}>
                  <Feather name={f.icon} size={13} color="#D4764A" />
                  <Text style={styles.chipText}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>
            {/* Tab switcher */}
            <View style={styles.tabRow}>
              <SpringPressable
                onPress={() => switchTab("signin")}
                style={[
                  styles.tab,
                  activeTab === "signin" && styles.tabActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "signin" && styles.tabTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </SpringPressable>
              <SpringPressable
                onPress={() => switchTab("signup")}
                style={[
                  styles.tab,
                  activeTab === "signup" && styles.tabActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "signup" && styles.tabTextActive,
                  ]}
                >
                  Sign Up
                </Text>
              </SpringPressable>
            </View>

            {/* ── SIGN IN ── */}
            {activeTab === "signin" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#B8A9A0"
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

                <View style={styles.pwWrap}>
                  <TextInput
                    ref={passwordRef}
                    style={styles.pwInput}
                    placeholder="Password"
                    placeholderTextColor="#B8A9A0"
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
                  <Pressable
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((p) => !p)}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#B8A9A0"
                    />
                  </Pressable>
                </View>

                <Pressable
                  style={styles.forgotBtn}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>

                {error && <ErrorBox message={error} />}

                <SpringPressable
                  onPress={handleEmailSignIn}
                  disabled={loading}
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign In</Text>
                  )}
                </SpringPressable>

                <Divider />

                <SpringPressable
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  style={styles.googleBtn}
                >
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </SpringPressable>

                {__DEV__ && (
                  <Pressable
                    onPress={() => {
                      setEmail("test@bhaashai.app");
                      setPassword("Test@123456");
                      setActiveTab("signin");
                    }}
                    style={styles.devBtn}
                  >
                    <Text style={styles.devBtnText}>Dev: Fill Test Credentials</Text>
                  </Pressable>
                )}
              </>
            )}

            {/* ── SIGN UP ── */}
            {activeTab === "signup" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor="#B8A9A0"
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
                  placeholderTextColor="#B8A9A0"
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

                <View style={styles.pwWrap}>
                  <TextInput
                    ref={passwordRef}
                    style={styles.pwInput}
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor="#B8A9A0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    returnKeyType="next"
                    textContentType="password"
                    onSubmitEditing={handleEmailSignUp}
                  />
                  <Pressable
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((p) => !p)}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#B8A9A0"
                    />
                  </Pressable>
                </View>

                <View style={styles.pwWrap}>
                  <TextInput
                    style={styles.pwInput}
                    placeholder="Confirm password"
                    placeholderTextColor="#B8A9A0"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    textContentType="newPassword"
                    onSubmitEditing={handleEmailSignUp}
                  />
                  <Pressable
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirmPassword((p) => !p)}
                  >
                    <Feather
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#B8A9A0"
                    />
                  </Pressable>
                </View>

                {error && <ErrorBox message={error} />}

                <SpringPressable
                  onPress={handleEmailSignUp}
                  disabled={loading}
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Create Account</Text>
                  )}
                </SpringPressable>

                <View style={styles.freeCreditsRow}>
                  <Feather name="zap" size={14} color="#84A98C" />
                  <Text style={styles.freeCreditsText}>
                    ₹100 free credits on signup — no subscription
                  </Text>
                </View>

                <Divider />

                <SpringPressable
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  style={styles.googleBtn}
                >
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </SpringPressable>
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
      <Feather name="alert-circle" size={14} color="#D4764A" />
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 24,
  },

  /* ── Hero ── */
  hero: {
    alignItems: "center",
    paddingTop: 12,
    gap: 8,
  },
  logoOuter: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
  },
  logoInner: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#0D1B2A",
    letterSpacing: -0.5,
  },
  devanagari: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#D4764A",
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#4A5568",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFF0E0",
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#D4764A",
  },

  /* ── Card ── */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: "#F0E4D8",
    shadowColor: "#D4764A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },

  /* ── Tabs ── */
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#FFF0E0",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#D4764A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#B8A9A0",
  },
  tabTextActive: {
    color: "#0D1B2A",
    fontFamily: "Inter_600SemiBold",
  },

  /* ── Inputs ── */
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#F0E4D8",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: "#FFF8F3",
    color: "#0D1B2A",
    marginBottom: 12,
    fontFamily: "Inter_400Regular",
  },
  pwWrap: {
    position: "relative",
    marginBottom: 12,
  },
  pwInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#F0E4D8",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 15,
    backgroundColor: "#FFF8F3",
    color: "#0D1B2A",
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    height: 50,
    justifyContent: "center",
  },

  /* ── Forgot ── */
  forgotBtn: { alignSelf: "flex-end", marginBottom: 16, marginTop: -4 },
  forgotText: { fontSize: 13, color: "#D4764A", fontFamily: "Inter_500Medium" },

  /* ── Error ── */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF0E0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: "#B8653F",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  /* ── Primary Button ── */
  primaryBtn: {
    height: 52,
    backgroundColor: "#FF6B00",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },

  /* ── Free Credits ── */
  freeCreditsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 4,
  },
  freeCreditsText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#84A98C",
  },

  /* ── Divider ── */
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F0E4D8",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#B8A9A0",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  /* ── Google Button ── */
  googleBtn: {
    height: 50,
    backgroundColor: "#FFF8F3",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0E4D8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#D4764A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#202124",
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },

  /* ── Dev ── */
  devBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#84A98C",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  devBtnText: {
    color: "#84A98C",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  /* ── Terms ── */
  terms: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#B8A9A0",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 16,
  },
});
