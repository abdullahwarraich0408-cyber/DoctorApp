import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Image,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  Camera,
  FileText,
  Banknote,
  Bell,
  Lock,
  MapPin,
  HelpCircle,
  ShieldCheck,
  FileCode,
  LogOut,
  ChevronDown,
  ChevronRight,
  CalendarClock,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { mapDoctorProfile } from '../../lib/mappers/doctorPortal';
import { useAuth } from '../../lib/auth/AuthContext';
import {
  pickDoctorPhoto,
  resolveMediaUrl,
  uploadDoctorPhoto,
} from '../../lib/media/doctorPhoto';
import { colors, radius, spacing, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import TabScreenHeader from '../../components/TabScreenHeader';
import type { RootStackParamList } from '../../navigation/types';

export function AccountScreen() {
  const { logout, partner } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const [notificationsExpanded, setNotificationsExpanded] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const profileQuery = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: () => doctorPortalApi.getProfile(),
  });

  const profile = mapDoctorProfile(profileQuery.data?.doctor || profileQuery.data);

  useEffect(() => {
    if (!profile?.notifications) return;
    setPushEnabled(Boolean(profile.notifications.push));
    setRemindersEnabled(Boolean(profile.notifications.reminders));
  }, [profile?.notifications?.push, profile?.notifications?.reminders]);

  const photoMut = useMutation({
    mutationFn: async () => {
      const file = await pickDoctorPhoto();
      if (!file) return null;
      const url = await uploadDoctorPhoto(file);
      await doctorPortalApi.updateProfile({ photo_url: url });
      return url;
    },
    onSuccess: url => {
      if (!url) return;
      queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
      Alert.alert('Profile photo updated');
    },
    onError: (err: Error) =>
      Alert.alert('Photo update failed', err.message),
  });

  const notifMut = useMutation({
    mutationFn: (prefs: { push: boolean; reminders: boolean }) =>
      doctorPortalApi.updateProfile({
        notification_preferences: {
          ...(profile?.notifications || {}),
          push: prefs.push,
          reminders: prefs.reminders,
          email: prefs.push,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
    },
    onError: (err: Error) => {
      Alert.alert('Could not update notifications', err.message);
      if (profile?.notifications) {
        setPushEnabled(Boolean(profile.notifications.push));
        setRemindersEnabled(Boolean(profile.notifications.reminders));
      }
    },
  });

  const displayName = profile?.name || partner?.name || 'Doctor';
  const specialty = profile?.specialty || partner?.specialty || '';
  const experience = profile?.experience
    ? `${profile.experience} Years Experience`
    : '';
  const avatarUrl = resolveMediaUrl(profile?.photoUrl || '') || null;

  return (
    <View style={styles.root}>

      {/* Deep Teal Header */}
      <TabScreenHeader title="Account & Profile" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Doctor Hero Card */}
        <View style={styles.doctorHeroCard}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.doctorAvatarImg} />
            ) : (
              <View style={[styles.doctorAvatarImg, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Pressable
              style={styles.cameraIconBtn}
              onPress={() => photoMut.mutate()}
              disabled={photoMut.isPending}
              accessibilityLabel="Change profile photo">
              <Camera size={14} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.doctorMetaCol}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.doctorNameText}>{displayName}</Text>
              <BadgeCheck size={16} color={colors.primaryLight} strokeWidth={2.5} />
            </View>

            <Text style={styles.specialtyText}>{specialty || 'Specialty not set'}</Text>
            <Text style={styles.credentialsText}>
              {[experience, profile?.hospital].filter(Boolean).join(' • ') || 'Complete your profile'}
            </Text>

            <Pressable
              style={styles.editProfilePillBtn}
              onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.editProfilePillText}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Section: Professional Practice */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>Practice & Preferences</Text>

          <View style={styles.settingsGroupCard}>
            {/* Professional Information */}
            <Pressable
              style={styles.settingsItemRow}
              onPress={() => navigation.navigate('Settings')}>
              <View style={styles.settingsItemIconWrap}>
                <FileText size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.settingsItemTextCol}>
                <Text style={styles.settingsItemTitle}>Professional Information</Text>
                <Text style={styles.settingsItemSub}>Degrees, experience & license</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>

            <View style={styles.itemDivider} />

            {/* Consultation Charges */}
            <Pressable
              style={styles.settingsItemRow}
              onPress={() => navigation.navigate('Schedule')}>
              <View style={styles.settingsItemIconWrap}>
                <Banknote size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.settingsItemTextCol}>
                <Text style={styles.settingsItemTitle}>Consultation Charges</Text>
                <Text style={styles.settingsItemSub}>Fee structures & visit prices</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>

            <View style={styles.itemDivider} />

            {/* Notification Preferences */}
            <Pressable
              style={styles.settingsItemRow}
              onPress={() => setNotificationsExpanded(!notificationsExpanded)}>
              <View style={styles.settingsItemIconWrap}>
                <Bell size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.settingsItemTextCol}>
                <Text style={styles.settingsItemTitle}>Notification Preferences</Text>
                <Text style={styles.settingsItemSub}>Alerts, sounds & appointment reminders</Text>
              </View>
              <ChevronDown
                size={18}
                color={colors.textMuted}
                strokeWidth={2}
                style={{
                  transform: [{ rotate: notificationsExpanded ? '180deg' : '0deg' }],
                }}
              />
            </Pressable>

            {/* Expandable Notification Toggles */}
            {notificationsExpanded && (
              <View style={styles.notificationTogglesWrap}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Push Notifications</Text>
                  <Switch
                    value={pushEnabled}
                    onValueChange={value => {
                      setPushEnabled(value);
                      notifMut.mutate({ push: value, reminders: remindersEnabled });
                    }}
                    trackColor={{ false: '#CBD5E1', true: colors.primaryLight }}
                    thumbColor={pushEnabled ? colors.primary : '#FFFFFF'}
                  />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Appointment Reminders</Text>
                  <Switch
                    value={remindersEnabled}
                    onValueChange={value => {
                      setRemindersEnabled(value);
                      notifMut.mutate({ push: pushEnabled, reminders: value });
                    }}
                    trackColor={{ false: '#CBD5E1', true: colors.primaryLight }}
                    thumbColor={remindersEnabled ? colors.primary : '#FFFFFF'}
                  />
                </View>
              </View>
            )}

            <View style={styles.itemDivider} />

            {/* Security */}
            <Pressable
              style={styles.settingsItemRow}
              onPress={() => navigation.navigate('Settings')}>
              <View style={styles.settingsItemIconWrap}>
                <Lock size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.settingsItemTextCol}>
                <Text style={styles.settingsItemTitle}>Security</Text>
                <Text style={styles.settingsItemSub}>Password & two-factor authentication</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>

            <View style={styles.itemDivider} />

            <Pressable
              style={styles.settingsItemRow}
              onPress={() => navigation.navigate('FollowUps')}>
              <View style={styles.settingsItemIconWrap}>
                <CalendarClock size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.settingsItemTextCol}>
                <Text style={styles.settingsItemTitle}>Follow-ups</Text>
                <Text style={styles.settingsItemSub}>Upcoming, overdue & booked recommendations</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>

            <View style={styles.itemDivider} />

            {/* Practice Locations */}
            <Pressable
              style={styles.settingsItemRow}
              onPress={() => navigation.navigate('Schedule')}>
              <View style={styles.settingsItemIconWrap}>
                <MapPin size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.settingsItemTextCol}>
                <Text style={styles.settingsItemTitle}>Practice Locations</Text>
                <Text style={styles.settingsItemSub}>Clinics & consultation chambers</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Section: Support & Legal */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>Support & Policies</Text>

          <View style={styles.settingsGroupCard}>
            {/* Help & Support */}
            <Pressable
              style={styles.settingsItemRow}
              onPress={() => Alert.alert('Help & Support', 'Doctor Care Desk: +92 42 111 222 333\nEmail: support@medcare.com')}>
              <View style={styles.settingsItemIconWrap}>
                <HelpCircle size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.settingsItemTextCol}>
                <Text style={styles.settingsItemTitle}>Help & Support</Text>
                <Text style={styles.settingsItemSub}>24/7 Physician concierge desk</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>

            <View style={styles.itemDivider} />

            {/* Privacy Policy */}
            <Pressable
              style={styles.settingsItemRow}
              onPress={() => Alert.alert('Privacy Policy', 'HIPAA & GDPR-compliant doctor patient confidentiality policy.')}>
              <View style={styles.settingsItemIconWrap}>
                <ShieldCheck size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.settingsItemTextCol}>
                <Text style={styles.settingsItemTitle}>Privacy Policy</Text>
                <Text style={styles.settingsItemSub}>HIPAA compliance & data privacy</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>

            <View style={styles.itemDivider} />

            {/* Terms & Conditions */}
            <Pressable
              style={styles.settingsItemRow}
              onPress={() => Alert.alert('Terms & Conditions', 'Doctor practice partner terms and service level agreements.')}>
              <View style={styles.settingsItemIconWrap}>
                <FileCode size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.settingsItemTextCol}>
                <Text style={styles.settingsItemTitle}>Terms & Conditions</Text>
                <Text style={styles.settingsItemSub}>Provider service agreements</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert('Sign Out', 'Are you sure you want to log out of your doctor portal?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: logout },
            ])
          }>
          <LogOut size={18} color={colors.danger} strokeWidth={2.2} />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>

        {/* App Version Microcopy */}
        <Text style={styles.appVersionText}>medDoctor v1.4.0 • Build 8084</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: TAB_BAR_CLEARANCE + 40,
    gap: 16,
  },

  /* Doctor Hero Card */
  doctorHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...shadows.card,
  },
  avatarWrap: {
    position: 'relative',
  },
  doctorAvatarImg: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarFallback: {
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  cameraIconBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorMetaCol: {
    flex: 1,
    gap: 2,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  doctorNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  specialtyText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  credentialsText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  editProfilePillBtn: {
    backgroundColor: colors.aqua,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#C8EDE9',
  },
  editProfilePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Sections */
  sectionBlock: {
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  settingsGroupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    ...shadows.cardSoft,
  },
  settingsItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  settingsItemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsItemTextCol: {
    flex: 1,
    gap: 1,
  },
  settingsItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingsItemSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  notificationTogglesWrap: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },

  /* Logout Button */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: radius.md,
    height: 44,
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  appVersionText: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -4,
  },
});
