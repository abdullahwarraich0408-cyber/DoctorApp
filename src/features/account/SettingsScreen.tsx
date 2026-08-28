import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Pressable,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  Lock,
  User,
  Building,
  GraduationCap,
  Banknote,
  FileText,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { mapDoctorProfile } from '../../lib/mappers/doctorPortal';
import { colors, radius, spacing, shadows } from '../../theme';

export function SettingsScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const query = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: () => doctorPortalApi.getProfile(),
  });
  const profile = mapDoctorProfile(query.data?.doctor || query.data);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    specialty: '',
    hospital: '',
    consultationFee: '',
    experience: '',
    languages: '',
    bio: '',
  });
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name,
      phone: profile.phone,
      specialty: profile.specialty,
      hospital: profile.hospital,
      consultationFee: profile.consultationFee,
      experience: profile.experience,
      languages: profile.languages,
      bio: profile.bio,
    });
  }, [profile?.id]);

  const updateMut = useMutation({
    mutationFn: () =>
      doctorPortalApi.updateProfile({
        name: form.name,
        phone: form.phone,
        specialty: form.specialty,
        hospital: form.hospital,
        consultation_fee: form.consultationFee ? Number(form.consultationFee) : undefined,
        experience_years: form.experience ? Number(form.experience) : undefined,
        languages: form.languages,
        bio: form.bio,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
      Alert.alert('Settings Updated', 'Your doctor profile has been saved.');
      navigation.goBack();
    },
    onError: (err: Error) => Alert.alert('Could not update', err.message),
  });

  const passwordMut = useMutation({
    mutationFn: () => {
      if (password.next !== password.confirm) {
        throw new Error('New passwords do not match');
      }
      return doctorPortalApi.updatePassword(password.current, password.next);
    },
    onSuccess: () => {
      setPassword({ current: '', next: '', confirm: '' });
      Alert.alert('Security Updated', 'Password successfully changed.');
    },
    onError: (err: Error) => Alert.alert('Password change failed', err.message),
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            hitSlop={8}>
            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile & Practice Settings</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Professional Credentials Section */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <User size={18} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.cardHeaderTitle}>Professional Credentials</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Dr. Full Name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Specialty / Field</Text>
              <TextInput
                style={styles.textInput}
                value={form.specialty}
                onChangeText={v => setForm(f => ({ ...f, specialty: v }))}
                placeholder="e.g. Consultant Neurologist"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Primary Hospital / Chamber</Text>
              <TextInput
                style={styles.textInput}
                value={form.hospital}
                onChangeText={v => setForm(f => ({ ...f, hospital: v }))}
                placeholder="e.g. City Medical Center"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Years of Experience</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.experience}
                  onChangeText={v => setForm(f => ({ ...f, experience: v }))}
                  placeholder="12"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Consultation Fee (PKR)</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.consultationFee}
                  onChangeText={v => setForm(f => ({ ...f, consultationFee: v }))}
                  placeholder="2000"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Spoken Languages</Text>
              <TextInput
                style={styles.textInput}
                value={form.languages}
                onChangeText={v => setForm(f => ({ ...f, languages: v }))}
                placeholder="English, Urdu"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Clinical Bio / Statement</Text>
              <TextInput
                style={[styles.textInput, styles.bioInput]}
                value={form.bio}
                onChangeText={v => setForm(f => ({ ...f, bio: v }))}
                placeholder="Describe your medical background and practice focus..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>

            <Pressable
              style={styles.saveProfileBtn}
              onPress={() => updateMut.mutate()}
              disabled={updateMut.isPending}>
              <Check size={18} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.saveProfileBtnText}>
                {updateMut.isPending ? 'Saving...' : 'Save Profile Changes'}
              </Text>
            </Pressable>
          </View>

          {/* Security & Password Section */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <Lock size={18} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.cardHeaderTitle}>Account Security</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Current Password</Text>
              <TextInput
                style={styles.textInput}
                value={password.current}
                onChangeText={v => setPassword(p => ({ ...p, current: v }))}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>New Password</Text>
              <TextInput
                style={styles.textInput}
                value={password.next}
                onChangeText={v => setPassword(p => ({ ...p, next: v }))}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.textInput}
                value={password.confirm}
                onChangeText={v => setPassword(p => ({ ...p, confirm: v }))}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            <Pressable
              style={styles.changePasswordBtn}
              onPress={() => passwordMut.mutate()}
              disabled={passwordMut.isPending || !password.next}>
              <Lock size={16} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.changePasswordBtnText}>
                {passwordMut.isPending ? 'Updating...' : 'Update Password'}
              </Text>
            </Pressable>
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
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    ...shadows.cardSoft,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: colors.textPrimary,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  saveProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 44,
    marginTop: 4,
    ...shadows.cardSoft,
  },
  saveProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  changePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: '#C8EDE9',
    borderRadius: radius.md,
    height: 42,
    marginTop: 4,
  },
  changePasswordBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
