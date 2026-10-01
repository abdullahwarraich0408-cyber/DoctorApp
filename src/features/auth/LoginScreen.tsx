import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
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
  User,
  Building,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth/AuthContext';
import { partnerAuthApi } from '../../lib/api';
import { ApiError } from '../../lib/api/client';
import { colors, radius, shadows } from '../../theme';
import GreenGradientHeader from '../../components/GreenGradientHeader';
import { getStatusBarTopInset } from '../../theme/tabScreenHeader';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'resetsent';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const topInset = getStatusBarTopInset(insets.top);
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

  const clearError = () => {
    if (errorMessage) setErrorMessage(null);
  };

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
    try {
      await partnerAuthApi.forgotPassword(email.trim());
      setMode('resetsent');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not send reset email. Please try again.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Dynamic Teal Gradient Top Header — identical gradient and style to DoctorApp Home/Tab screens */}
      <GreenGradientHeader style={[styles.headerHero, { paddingTop: topInset + 10 }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandIconWrap}>
            <Stethoscope size={20} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View style={styles.brandTextCol}>
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
      </GreenGradientHeader>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 8, 16) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

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
                    size={16}
                    color={emailFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="doctor@medzoos.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={text => {
                      setEmail(text);
                      clearError();
                    }}
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
                    size={16}
                    color={passwordFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="••••••••••••"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={text => {
                      setPassword(text);
                      clearError();
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={16} color={colors.textMuted} strokeWidth={2} />
                    ) : (
                      <Eye size={16} color={colors.textMuted} strokeWidth={2} />
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

                <Pressable
                  onPress={() => {
                    setMode('forgot');
                    clearError();
                  }}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>

              {/* Space-efficient Inline Error Alert inside the card */}
              {errorMessage ? (
                <View style={styles.inlineErrorBox}>
                  <AlertCircle size={14} color={colors.danger} strokeWidth={2.4} />
                  <Text style={styles.inlineErrorText} numberOfLines={2}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

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
                    <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.2} />
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
                      setEmail('daniyal@medzoos.com');
                      setPassword('password123');
                      clearError();
                      handleSignIn('daniyal@medzoos.com', 'password123');
                    }}>
                    <View style={styles.demoDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.demoBtnName}>Dr. Daniyal</Text>
                      <Text style={styles.demoBtnSub}>Cardiology • 4 Appointments</Text>
                    </View>
                    <ArrowRight size={13} color={colors.primary} strokeWidth={2.2} />
                  </Pressable>

                  <Pressable
                    style={styles.demoBtn}
                    onPress={() => {
                      setEmail('doctor@medzoos.com');
                      setPassword('password123');
                      clearError();
                      handleSignIn('doctor@medzoos.com', 'password123');
                    }}>
                    <View style={styles.demoDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.demoBtnName}>Dr. Ayesha Khan</Text>
                      <Text style={styles.demoBtnSub}>Neurology • 3 Appointments</Text>
                    </View>
                    <ArrowRight size={13} color={colors.primary} strokeWidth={2.2} />
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
                    size={16}
                    color={nameFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Dr. Sara Khan"
                    placeholderTextColor={colors.textMuted}
                    value={fullName}
                    onChangeText={text => {
                      setFullName(text);
                      clearError();
                    }}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Primary Medical Specialty</Text>
                <View style={styles.inputFieldWrap}>
                  <Building size={16} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Consultant Neurologist"
                    placeholderTextColor={colors.textMuted}
                    value={specialty}
                    onChangeText={text => {
                      setSpecialty(text);
                      clearError();
                    }}
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
                    size={16}
                    color={emailFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="doctor@hospital.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={text => {
                      setEmail(text);
                      clearError();
                    }}
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
                    size={16}
                    color={passwordFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="At least 6 characters"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={text => {
                      setPassword(text);
                      clearError();
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={16} color={colors.textMuted} strokeWidth={2} />
                    ) : (
                      <Eye size={16} color={colors.textMuted} strokeWidth={2} />
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
                    size={16}
                    color={confirmFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={text => {
                      setConfirmPassword(text);
                      clearError();
                    }}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={8}>
                    {showConfirmPassword ? (
                      <EyeOff size={16} color={colors.textMuted} strokeWidth={2} />
                    ) : (
                      <Eye size={16} color={colors.textMuted} strokeWidth={2} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Space-efficient Inline Error Alert */}
              {errorMessage ? (
                <View style={styles.inlineErrorBox}>
                  <AlertCircle size={14} color={colors.danger} strokeWidth={2.4} />
                  <Text style={styles.inlineErrorText} numberOfLines={2}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              <Pressable
                style={styles.primaryActionBtn}
                onPress={handleSignUp}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryActionBtnText}>Create Doctor Account</Text>
                    <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.2} />
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
                    size={16}
                    color={emailFocused ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="doctor@medzoos.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={text => {
                      setEmail(text);
                      clearError();
                    }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Space-efficient Inline Error Alert */}
              {errorMessage ? (
                <View style={styles.inlineErrorBox}>
                  <AlertCircle size={14} color={colors.danger} strokeWidth={2.4} />
                  <Text style={styles.inlineErrorText} numberOfLines={2}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              <Pressable
                style={styles.primaryActionBtn}
                onPress={handleResetPassword}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryActionBtnText}>Send Recovery Link</Text>
                    <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.2} />
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.backToSignBtn}
                onPress={() => {
                  setMode('signin');
                  clearError();
                }}>
                <Text style={styles.backToSignBtnText}>&lt; Back to Sign In</Text>
              </Pressable>
            </View>
          )}

          {/* RESET SENT CONFIRMATION */}
          {mode === 'resetsent' && (
            <View style={styles.formCard}>
              <View style={styles.sentIconWrap}>
                <ShieldCheck size={32} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.sentTitle}>Recovery Email Sent</Text>
              <Text style={styles.sentDesc}>
                Please check your inbox. We have sent password reset instructions to{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{email}</Text>.
              </Text>

              <Pressable
                style={styles.primaryActionBtn}
                onPress={() => {
                  setMode('signin');
                  clearError();
                }}>
                <Text style={styles.primaryActionBtnText}>Back to Sign In</Text>
              </Pressable>
            </View>
          )}

          {/* Compliance & Security Tag */}
          <View style={styles.securityFooter}>
            <ShieldCheck size={13} color={colors.textMuted} strokeWidth={2} />
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    gap: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextCol: {
    gap: 1,
  },
  brandName: {
    fontSize: 15,
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
    backgroundColor: 'rgba(221, 246, 242, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.35,
    marginTop: 2,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 16,
    letterSpacing: -0.1,
    fontWeight: '400',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 42, 46, 0.35)',
    borderRadius: radius.md,
    padding: 3,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.cardSoft,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  tabBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },

  inlineErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
    lineHeight: 14,
  },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.card,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  inputFieldFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
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
    fontWeight: '600',
    color: colors.primary,
  },

  primaryActionBtn: {
    height: 42,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
    ...shadows.cardSoft,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Demo Logins Section */
  demoSection: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 6,
  },
  demoSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  demoBtnsRow: {
    gap: 6,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.aqua,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#B4E8E1',
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  demoBtnName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  demoBtnSub: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#B4E8E1',
  },
  sentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sentDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 10,
  },

  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 4,
    paddingBottom: 4,
  },
  securityFooterText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
