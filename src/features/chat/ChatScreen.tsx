import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Video,
  MoreHorizontal,
  ShieldCheck,
  CheckCheck,
  Paperclip,
  Mic,
  ArrowUp,
  Lock,
} from 'lucide-react-native';
import { telehealthApi } from '../../lib/api';
import { mapChatMessage } from '../../lib/mappers/doctorPortal';
import { getDoctorSocket } from '../../lib/socket';
import { colors, radius, spacing, shadows } from '../../theme';
import GreenGradientHeader from '../../components/GreenGradientHeader';
import type { RootStackParamList } from '../../navigation/types';

function formatMessageTime(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function ChatScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const bottomInset = Math.max(insets.bottom, 8);
  const { appointmentId, patientName = 'Patient' } = route.params;
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const chatQuery = useQuery({
    queryKey: ['appointment-chat', appointmentId],
    queryFn: () => telehealthApi.getChat(appointmentId),
    refetchInterval: 8000,
  });

  useEffect(() => {
    const socket = getDoctorSocket();
    if (!socket) return undefined;
    const join = () => socket.emit('join-chat', { appointmentId });
    const onNew = ({ appointmentId: id, message }: any) => {
      if (id !== appointmentId || !message) return;
      queryClient.setQueryData(['appointment-chat', appointmentId], (old: any) => {
        if (!old) return old;
        const messages = old.messages || [];
        if (messages.some((m: any) => m.id === message.id)) return old;
        return { ...old, messages: [...messages, message] };
      });
    };
    if (socket.connected) join();
    else socket.on('connect', join);
    socket.on('new-message', onNew);
    telehealthApi.markRead(appointmentId).catch(() => undefined);
    return () => {
      socket.emit('leave-chat', { appointmentId });
      socket.off('connect', join);
      socket.off('new-message', onNew);
    };
  }, [appointmentId, queryClient]);

  const sendMut = useMutation({
    mutationFn: (message: string) =>
      telehealthApi.sendMessage(appointmentId, { message, message_type: 'text' }),
    onSuccess: data => {
      const message = data?.message ?? data;
      queryClient.setQueryData(['appointment-chat', appointmentId], (old: any) => {
        const base = old || { messages: [] };
        const messages = base.messages || [];
        if (!message) return base;
        if (messages.some((m: any) => m.id === message.id)) return base;
        return { ...base, messages: [...messages, message] };
      });
      setDraft('');
    },
  });

  const messages = useMemo(() => {
    return (chatQuery.data?.messages || []).map((m: any) => mapChatMessage(m));
  }, [chatQuery.data]);

  const handleSend = (textToSend?: string) => {
    const content = textToSend || draft;
    if (!content.trim()) return;
    sendMut.mutate(content.trim());
  };

  const patientInitial = (patientName || 'P').charAt(0).toUpperCase();
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header Section */}
      <GreenGradientHeader style={[styles.headerSection, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerRow}>
          {/* Back Button */}
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            hitSlop={8}>
            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          {/* Patient Avatar & Meta */}
          <View style={styles.patientInfoRow}>
            <View style={styles.avatarContainer}>
              <View style={[styles.headerAvatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{patientInitial}</Text>
              </View>
              <View style={styles.onlineBadge} />
            </View>

            <View style={styles.patientTextCol}>
              <Text style={styles.patientNameText} numberOfLines={1}>
                {patientName}
              </Text>
              <View style={styles.statusSubRow}>
                <View style={styles.activeDot} />
                <Text style={styles.onlineStatusText}>CHAT</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.appointmentTagText}>Secure consultation</Text>
              </View>
            </View>
          </View>

          {/* Right Action Icons */}
          <View style={styles.headerRightActions}>
            <Pressable
              style={({ pressed }) => [styles.headerActionBtn, pressed && styles.btnPressed]}
              onPress={() =>
                navigation.navigate('Video', {
                  appointmentId,
                })
              }
              accessibilityLabel="Start Video Call"
              hitSlop={8}>
              <Video size={19} color="#FFFFFF" strokeWidth={2} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.headerActionBtn, pressed && styles.btnPressed]}
              accessibilityLabel="More options"
              hitSlop={8}>
              <MoreHorizontal size={19} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </GreenGradientHeader>

      {/* Privacy & Security Banner */}
      <View style={styles.privacyBanner}>
        <ShieldCheck size={16} color={colors.primary} strokeWidth={2.2} />
        <Text style={styles.privacyBannerText}>
          Your consultation is private and secure.
        </Text>
      </View>

      {/* Date Divider */}
      <View style={styles.dateDividerRow}>
        <Text style={styles.dateDividerText}>{todayLabel}</Text>
      </View>

      {/* Messages Feed */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={[
          styles.messagesList,
          messages.length === 0 && styles.messagesListEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Lock size={22} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.emptyChatTitle}>No messages yet</Text>
            <Text style={styles.emptyChatSub}>
              Start the conversation with {patientName}. Messages are end-to-end secured.
            </Text>
          </View>
        }
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }: { item: any }) => {
          const isDoctor = item.isMine || item.sender === 'doctor';

          return (
            <View
              style={[
                styles.messageRow,
                isDoctor ? styles.messageRowRight : styles.messageRowLeft,
              ]}>
              {!isDoctor && (
                <View style={[styles.avatarImgSmall, styles.avatarFallback]}>
                  <Text style={styles.avatarInitialSmall}>{patientInitial}</Text>
                </View>
              )}

              <View
                style={[
                  styles.bubbleContainer,
                  isDoctor ? styles.doctorBubble : styles.patientBubble,
                  { maxWidth: isSmallScreen ? '85%' : '76%' },
                ]}>
                <Text
                  style={[
                    styles.bubbleMessageText,
                    isDoctor ? styles.doctorMessageText : styles.patientMessageText,
                  ]}>
                  {item.text}
                </Text>

                <View style={styles.bubbleMetaRow}>
                  <Text
                    style={[
                      styles.bubbleTimeText,
                      isDoctor && styles.doctorTimeText,
                    ]}>
                    {item.time || formatMessageTime(item.createdAt) || ''}
                  </Text>
                  {isDoctor && (
                    <CheckCheck size={13} color="#E0F2FE" strokeWidth={2.2} />
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Sticky Message Composer */}
      <View style={[styles.composerSection, { paddingBottom: bottomInset }]}>
        <View style={styles.composerContainer}>
          {/* Attachment Paperclip */}
          <Pressable style={({ pressed }) => [styles.composerIconBtn, pressed && styles.btnPressed]} hitSlop={6}>
            <Paperclip size={19} color={colors.textMuted} strokeWidth={2} />
          </Pressable>

          {/* Message Text Input */}
          <TextInput
            style={styles.composerInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            multiline
          />

          {/* Mic Button */}
          <Pressable style={({ pressed }) => [styles.composerIconBtn, pressed && styles.btnPressed]} hitSlop={6}>
            <Mic size={19} color={colors.textMuted} strokeWidth={2} />
          </Pressable>

          {/* Send Button */}
          <Pressable
            style={({ pressed }) => [
              styles.sendCircleBtn,
              !draft.trim() && styles.sendCircleBtnDisabled,
              pressed && draft.trim() ? styles.btnPressed : null,
            ]}
            disabled={!draft.trim() || sendMut.isPending}
            onPress={() => handleSend()}>
            <ArrowUp size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* HIPAA Compliance Microcopy */}
        <View style={styles.encryptionFooterRow}>
          <Lock size={10} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.encryptionFooterText}>
            Messages are encrypted and HIPAA compliant
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* Header Section */
  headerSection: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarContainer: {
    position: 'relative',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarFallback: {
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  avatarInitialSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  patientTextCol: {
    flex: 1,
    gap: 1,
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.mint,
  },
  onlineStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mint,
    letterSpacing: 0.2,
  },
  dotSeparator: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  appointmentTagText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Privacy Banner */
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.aqua,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D4EFEF',
  },
  privacyBannerText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '500',
  },

  /* Date Divider */
  dateDividerRow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateDividerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },

  /* Messages List */
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  messagesListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyChat: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 8,
  },
  emptyChatTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  emptyChatSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  doctorMsgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  avatarImgSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  bubbleContainer: {
    borderRadius: radius.lg,
    paddingVertical: 9,
    paddingHorizontal: 13,
    gap: 3,
    ...shadows.cardSoft,
  },
  doctorBubble: {
    backgroundColor: colors.primary,
    borderTopRightRadius: radius.xs,
  },
  patientBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radius.xs,
  },
  bubbleMessageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  doctorMessageText: {
    color: '#FFFFFF',
  },
  patientMessageText: {
    color: colors.textPrimary,
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  bubbleTimeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  doctorTimeText: {
    color: '#E0F2FE',
  },

  /* Quick Action Chips */
  quickChipsSection: {
    paddingVertical: 6,
  },
  quickChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  quickChipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.cardSoft,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },

  /* Composer */
  composerSection: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    gap: 6,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  composerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    maxHeight: 90,
  },
  sendCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.cardSoft,
  },
  sendCircleBtnDisabled: {
    opacity: 0.4,
  },
  encryptionFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 2,
  },
  encryptionFooterText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
});
