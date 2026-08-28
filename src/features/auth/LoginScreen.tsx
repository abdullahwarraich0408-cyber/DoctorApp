import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  User,
  Phone,
  Building,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth/AuthContext';
import { ApiError } from '../../lib/api/client';
import { colors, radius, spacing, shadows } from '../../theme';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'resetsent';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async (userEmail?: string, userPass?: string) => {
    setErrorMessage(null);
    const targetEmail = (userEmail || email).trim();
    const targetPassword = userPass || password;

    if (!targetEmail || !targetPassword) {
      setErrorMessage('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(targetEmail, targetPassword);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not sign in with provided credentials.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setErrorMessage(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill out all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not register account.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setMode('resetsent');
    }, 800);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Deep Teal Top Header Banner */}
      <View style={[styles.headerHero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandIconWrap}>
            <Stethoscope size={22} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View style={{ gap: 1 }}>
            <Text style={styles.brandName}>MEDZOOS</Text>
            <Text style={styles.brandSub}>DOCTOR PORTAL</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <ShieldCheck size={12} color={colors.mint} strokeWidth={2.4} />
            <Text style={styles.verifiedBadgeText}>Verified MD</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>
          {mode === 'signin'
            ? 'Clinical Workspace Sign In'
            : mode === 'signup'
            ? 'Join Doctor Network'
            : mode === 'forgot'
            ? 'Reset Password'
            : 'Check Your Email'}
        </Text>
        <Text style={styles.heroSubtitle}>
          {mode === 'signin'
            ? 'Sign in to manage consultations, e-prescriptions & patient records'
            : mode === 'signup'
            ? 'Create your verified doctor practice profile'
            : mode === 'forgot'
            ? 'We will send a secure recovery link to your inbox'
            : 'A password recovery link has been dispatched to your email'}
        </Text>

        {/* Mode Switcher Tabs */}
        {(mode === 'signin' || mode === 'signup') && (
          <View style={styles.tabSwitcher}>
            <Pressable
              style={[styles.tabBtn, mode === 'signin' && styles.tabBtnActive]}
              onPress={() => {
                setMode('signin');
                setErrorMessage(null);
              }}>
              <Text
                style={[
                  styles.tabBtnText,
                  mode === 'signin' && styles.tabBtnTextActive,
                ]}>
                Sign In
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, mode === 'signup' && styles.tabBtnActive]}
              onPress={() => {
                setMode('signup');
                setErrorMessage(null);
              }}>
              <Text
                style={[
                  styles.tabBtnText,
                  mode === 'signup' && styles.tabBtnTextActive,
                ]}>
                Register
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Error Alert Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={colors.danger} strokeWidth={2.2} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Doctor Email Address</Text>
                <View
                  style={[
                    styles.inputFieldWrap,
                    emailFocused && styles.inputFieldFocused,
                  ]}>
                  <Mail
                    size={18}
                    color={emailFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="doctor@medzoos.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View
                  style={[
                    styles.inputFieldWrap,
                    passwordFocused && styles.inputFieldFocused,
                  ]}>
                  <Lock
                    size={18}
                    color={passwordFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="••••••••••••"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textMuted} strokeWidth={2} />
                    ) : (
                      <Eye size={18} color={colors.textMuted} strokeWidth={2} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Options Row */}
              <View style={styles.optionsRow}>
                <Pressable
                  style={styles.rememberRow}
                  onPress={() => setRememberMe(!rememberMe)}>
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxActive,
                    ]}>
                    {rememberMe && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </Pressable>

                <Pressable onPress={() => setMode('forgot')}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>

              {/* Sign In CTA Button */}
              <Pressable
                style={styles.primaryActionBtn}
                onPress={() => handleSignIn()}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryActionBtnText}>Sign In to Workspace</Text>
                    <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.2} />
                  </>
                )}
              </Pressable>

              {/* Quick 1-Tap Doctor Demo Logins */}
              <View style={styles.demoSection}>
                <Text style={styles.demoSectionLabel}>QUICK DEMO DOCTOR ACCOUNTS</Text>
                <View style={styles.demoBtnsRow}>
                  <Pressable
                    style={styles.demoBtn}
                    onPress={() => {
                      setEmail('doctor@medzoos.com');
                      setPassword('password123');
                      handleSignIn('doctor@medzoos.com', 'password123');
                    }}>
                    <View style={styles.demoDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.demoBtnName}>Dr. Ayesha Khan</Text>
                      <Text style={styles.demoBtnSub}>Neurology • 3 Appointments</Text>
                    </View>
                    <ArrowRight size={14} color={colors.primary} strokeWidth={2} />
                  </Pressable>

                  <Pressable
                    style={styles.demoBtn}
                    onPress={() => {
                      setEmail('doctor123@gmail.com');
                      setPassword('password123');
                      handleSignIn('doctor123@gmail.com', 'password123');
                    }}>
                    <View style={styles.demoDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.demoBtnName}>Dr. Abdullah Warraich</Text>
                      <Text style={styles.demoBtnSub}>Diabetology • 3 Appointments</Text>
                    </View>
                    <ArrowRight size={14} color={colors.primary} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View
                  style={[
                    styles.inputFieldWrap,
                    nameFocused && styles.inputFieldFocused,
                  ]}>
                  <User
                    size={18}
                    color={nameFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Dr. Sara Khan"
                    placeholderTextColor={colors.textMuted}
                    value={fullName}
                    onChangeText={setFullName}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Primary Medical Specialty</Text>
                <View style={styles.inputFieldWrap}>
                  <Building size={18} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Consultant Neurologist"
                    placeholderTextColor={colors.textMuted}
                    value={specialty}
                    onChangeText={setSpecialty}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Work Email</Text>
                <View
                  style={[
                    styles.inputFieldWrap,
                    emailFocused && styles.inputFieldFocused,
                  ]}>
                  <Mail
                    size={18}
                    color={emailFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="doctor@hospital.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View
                  style={[
                    styles.inputFieldWrap,
                    passwordFocused && styles.inputFieldFocused,
                  ]}>
                  <Lock
                    size={18}
                    color={passwordFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="At least 6 characters"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textMuted} strokeWidth={2} />
                    ) : (
                      <Eye size={18} color={colors.textMuted} strokeWidth={2} />
                    )}
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View
                  style={[
                    styles.inputFieldWrap,
                    confirmFocused && styles.inputFieldFocused,
                  ]}>
                  <Lock
                    size={18}
                    color={confirmFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={8}>
                    {showConfirmPassword ? (
                      <EyeOff size={18} color={colors.textMuted} strokeWidth={2} />
                    ) : (
                      <Eye size={18} color={colors.textMuted} strokeWidth={2} />
                    )}
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={styles.primaryActionBtn}
                onPress={handleSignUp}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryActionBtnText}>Create Doctor Account</Text>
                    <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.2} />
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Registered Email</Text>
                <View
                  style={[
                    styles.inputFieldWrap,
                    emailFocused && styles.inputFieldFocused,
                  ]}>
                  <Mail
                    size={18}
                    color={emailFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="doctor@medzoos.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <Pressable
                style={styles.primaryActionBtn}
                onPress={handleResetPassword}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryActionBtnText}>Send Recovery Link</Text>
                    <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.2} />
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.backToSignBtn}
                onPress={() => setMode('signin')}>
                <Text style={styles.backToSignBtnText}>&lt; Back to Sign In</Text>
              </Pressable>
            </View>
          )}

          {/* RESET SENT CONFIRMATION */}
          {mode === 'resetsent' && (
            <View style={styles.formCard}>
              <View style={styles.sentIconWrap}>
                <ShieldCheck size={36} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.sentTitle}>Recovery Email Sent</Text>
              <Text style={styles.sentDesc}>
                Please check your inbox. We have sent password reset instructions to{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{email}</Text>.
              </Text>

              <Pressable
                style={styles.primaryActionBtn}
                onPress={() => setMode('signin')}>
                <Text style={styles.primaryActionBtnText}>Back to Sign In</Text>
              </Pressable>
            </View>
          )}

          {/* Compliance & Security Tag */}
          <View style={styles.securityFooter}>
            <ShieldCheck size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.securityFooterText}>
              256-Bit Encrypted Healthcare Provider Authentication
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerHero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  brandSub: {
    fontSize: 9,
    color: colors.mint,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  verifiedBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(221, 246, 242, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(221, 246, 242, 0.3)',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mint,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 17,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 78, 82, 0.85)',
    borderRadius: radius.md,
    padding: 3,
    marginTop: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
    lineHeight: 16,
  },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
    ...shadows.card,
  },
  inputGroup: {
    gap: 5,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 46,
    gap: 10,
  },
  inputFieldFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rememberText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  primaryActionBtn: {
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    ...shadows.cardSoft,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Demo Logins Section */
  demoSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    gap: 8,
  },
  demoSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  demoBtnsRow: {
    gap: 8,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.aqua,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#C8EDE9',
  },
  demoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  demoBtnName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  demoBtnSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  backToSignBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backToSignBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  sentIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 10,
  },
  sentTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sentDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  securityFooterText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
