import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Video,
  MessageSquare,
  Bell,
  CheckCheck,
  ChevronRight,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { formatDate } from '../../lib/mappers/doctorPortal';
import { colors, radius, spacing, shadows } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type NotificationItem = {
  id: string;
  type: 'appointment' | 'video' | 'chat' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  appointmentId?: string;
};

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'appointment',
    title: 'New Appointment Request',
    message: 'Tariq Mehmood booked a video consultation for today at 04:30 PM.',
    time: '10 mins ago',
    read: false,
    appointmentId: '1',
  },
  {
    id: '2',
    type: 'chat',
    title: 'New Message from Patient',
    message: 'Ayesha Khan: "Doctor, can I take the medicine after dinner?"',
    time: '25 mins ago',
    read: false,
    appointmentId: '2',
  },
  {
    id: '3',
    type: 'video',
    title: 'Consultation Starting Soon',
    message: 'Your video consultation with Zainab Malik starts in 15 minutes.',
    time: '1 hour ago',
    read: true,
    appointmentId: '3',
  },
  {
    id: '4',
    type: 'system',
    title: 'Schedule Updated',
    message: 'Your weekly availability for HealthCare Clinic was saved successfully.',
    time: '3 hours ago',
    read: true,
  },
];

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );

  const query = useQuery({
    queryKey: ['doctor-notifications'],
    queryFn: () => doctorPortalApi.getNotifications(),
  });

  const markAllMut = useMutation({
    mutationFn: () => doctorPortalApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-notifications'] });
    },
  });

  const markItemMut = useMutation({
    mutationFn: (id: string) => doctorPortalApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-notifications'] });
    },
  });

  const notifications: NotificationItem[] = useMemo(() => {
    const raw = query.data?.notifications || query.data?.inbox || query.data;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((item: any) => ({
        id: String(item.id),
        type: item.type || (item.data?.appointment_id ? 'appointment' : 'system'),
        title: item.title || 'Notification',
        message: item.message || item.body || '',
        time: formatDate(item.created_at || item.createdAt) || 'Just now',
        read: Boolean(item.is_read || item.read),
        appointmentId: item.data?.appointment_id || item.appointment_id,
      }));
    }
    return DEFAULT_NOTIFICATIONS;
  }, [query.data]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'appointment':
        return <Calendar size={18} color={colors.primary} strokeWidth={2} />;
      case 'video':
        return <Video size={18} color={colors.primary} strokeWidth={2} />;
      case 'chat':
        return <MessageSquare size={18} color={colors.primary} strokeWidth={2} />;
      default:
        return <Bell size={18} color={colors.primary} strokeWidth={2} />;
    }
  };

  const handleNotificationPress = (item: NotificationItem) => {
    if (!item.read) {
      markItemMut.mutate(item.id);
    }
    if (item.appointmentId) {
      navigation.navigate('AppointmentDetail', { appointmentId: item.appointmentId });
    }
  };

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

          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSub}>{unreadCount} unread alert{unreadCount > 1 ? 's' : ''}</Text>
            )}
          </View>

          {unreadCount > 0 && (
            <Pressable
              style={styles.markAllBtn}
              onPress={() => markAllMut.mutate()}
              hitSlop={8}>
              <CheckCheck size={16} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }>
        {notifications.map(item => (
          <Pressable
            key={item.id}
            style={[styles.card, !item.read && styles.cardUnread]}
            onPress={() => handleNotificationPress(item)}>
            <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
              {getNotificationIcon(item.type)}
            </View>

            <View style={styles.contentCol}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, !item.read && styles.titleUnread]}>
                  {item.title}
                </Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>

              <Text style={styles.message} numberOfLines={2}>
                {item.message}
              </Text>

              <Text style={styles.time}>{item.time}</Text>
            </View>

            <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        ))}
      </ScrollView>
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
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    gap: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 10,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.cardSoft,
  },
  cardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.primary,
    borderLeftWidth: 3.5,
    borderLeftColor: colors.primary,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: {
    backgroundColor: colors.aqua,
  },
  contentCol: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  titleUnread: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  message: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  time: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
