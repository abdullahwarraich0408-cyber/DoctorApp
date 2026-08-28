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
  Image,
  ScrollView,
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
  Activity,
  Pill,
} from 'lucide-react-native';
import { telehealthApi } from '../../lib/api';
import { mapChatMessage } from '../../lib/mappers/doctorPortal';
import { getDoctorSocket } from '../../lib/socket';
import { colors, radius, spacing, shadows } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

const SAMPLE_MESSAGES = [
  {
    id: 'msg-1',
    text: 'Hi Ayesha, thanks for joining. How are you feeling today?',
    time: '10:00 AM',
    isMine: true,
    sender: 'doctor',
  },
  {
    id: 'msg-2',
    text: "Hi Dr. Sara, I've had a headache and nausea since yesterday.",
    time: '10:02 AM',
    isMine: false,
    sender: 'patient',
  },
  {
    id: 'msg-3',
    text: "I'm sorry to hear that. Can you tell me when it started and how severe it is?",
    time: '10:03 AM',
    isMine: true,
    sender: 'doctor',
  },
  {
    id: 'msg-4',
    text: 'It started in the evening. The pain is moderate, and I feel sensitive to light.',
    time: '10:04 AM',
    isMine: false,
    sender: 'patient',
  },
  {
    id: 'msg-5',
    text: "Thank you. I'm reviewing your symptoms now. I'll share my recommendations shortly.",
    time: '10:05 AM',
    isMine: true,
    sender: 'doctor',
  },
];

const QUICK_CLINICAL_CHIPS = [
  { id: '1', label: 'Please share symptoms', IconComp: Activity, text: 'Please share any additional symptoms or when this episode started.' },
  { id: '2', label: 'Join video call', IconComp: Video, text: 'Please join the virtual video room when you are ready.' },
  { id: '3', label: 'Prescription sent', IconComp: Pill, text: 'I have signed and issued your prescription. You can view it in your health records.' },
];

export function ChatScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const { appointmentId, patientName = 'Ayesha Malik' } = route.params;
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
        if (!old || !message) return old;
        const messages = old.messages || [];
        if (messages.some((m: any) => m.id === message.id)) return old;
        return { ...old, messages: [...messages, message] };
      });
      setDraft('');
    },
  });

  const messages = useMemo(() => {
    const raw = (chatQuery.data?.messages || []).map((m: any) => mapChatMessage(m));
    if (raw.length > 0) return raw;
    return SAMPLE_MESSAGES;
  }, [chatQuery.data]);

  const handleSend = (textToSend?: string) => {
    const content = textToSend || draft;
    if (!content.trim()) return;
    sendMut.mutate(content.trim());
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Deep Teal Header */}
      <View style={[styles.headerSection, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerRow}>
          {/* Back Button */}
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            hitSlop={8}>
            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          {/* Patient Avatar & Meta */}
          <View style={styles.patientInfoRow}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
                }}
                style={styles.headerAvatar}
              />
              <View style={styles.onlineBadge} />
            </View>

            <View style={styles.patientTextCol}>
              <Text style={styles.patientNameText} numberOfLines={1}>
                {patientName}
              </Text>
              <View style={styles.statusSubRow}>
                <View style={styles.activeDot} />
                <Text style={styles.onlineStatusText}>ONLINE</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.appointmentTagText}>Appointment • In Progress</Text>
              </View>
            </View>
          </View>

          {/* Right Action Icons */}
          <View style={styles.headerRightActions}>
            <Pressable
              style={styles.headerActionBtn}
              onPress={() =>
                navigation.navigate('Video', {
                  appointmentId,
                })
              }
              accessibilityLabel="Start Video Call"
              hitSlop={8}>
              <Video size={20} color="#FFFFFF" strokeWidth={2} />
            </Pressable>

            <Pressable
              style={styles.headerActionBtn}
              accessibilityLabel="More options"
              hitSlop={8}>
              <MoreHorizontal size={20} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Privacy & Security Banner */}
      <View style={styles.privacyBanner}>
        <ShieldCheck size={16} color={colors.primary} strokeWidth={2.2} />
        <Text style={styles.privacyBannerText}>
          Your consultation is private and secure.
        </Text>
      </View>

      {/* Date Divider */}
      <View style={styles.dateDividerRow}>
        <Text style={styles.dateDividerText}>Today, 14 May</Text>
      </View>

      {/* Messages Feed */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }: { item: any }) => {
          const isDoctor = item.isMine || item.sender === 'doctor';

          return (
            <View
              style={[
                styles.messageRow,
                isDoctor ? styles.messageRowLeft : styles.messageRowRight,
              ]}>
              {/* Doctor Avatar on Left */}
              {isDoctor && (
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
                  }}
                  style={styles.doctorMsgAvatar}
                />
              )}

              {/* Message Bubble */}
              <View
                style={[
                  styles.bubbleContainer,
                  isDoctor ? styles.doctorBubble : styles.patientBubble,
                ]}>
                <Text
                  style={[
                    styles.bubbleMessageText,
                    isDoctor ? styles.doctorMessageText : styles.patientMessageText,
                  ]}>
                  {item.text}
                </Text>

                <View style={styles.bubbleMetaRow}>
                  <Text style={styles.bubbleTimeText}>
                    {item.time || '10:00 AM'}
                  </Text>
                  {!isDoctor && (
                    <CheckCheck size={14} color={colors.primaryLight} strokeWidth={2.2} />
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Clinical Quick Action Chips */}
      <View style={styles.quickChipsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickChipsScroll}>
          {QUICK_CLINICAL_CHIPS.map(chip => {
            const IconComponent = chip.IconComp;
            return (
              <Pressable
                key={chip.id}
                style={styles.quickChipPill}
                onPress={() => setDraft(chip.text)}>
                <IconComponent size={14} color={colors.primary} strokeWidth={2} />
                <Text style={styles.quickChipText}>{chip.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Sticky Message Composer */}
      <View style={styles.composerSection}>
        <View style={styles.composerContainer}>
          {/* Attachment Paperclip */}
          <Pressable style={styles.composerIconBtn} hitSlop={6}>
            <Paperclip size={20} color={colors.textMuted} strokeWidth={2} />
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
          <Pressable style={styles.composerIconBtn} hitSlop={6}>
            <Mic size={20} color={colors.textMuted} strokeWidth={2} />
          </Pressable>

          {/* Send Button */}
          <Pressable
            style={[
              styles.sendCircleBtn,
              !draft.trim() && styles.sendCircleBtnDisabled,
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
    backgroundColor: colors.primary,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  bubbleContainer: {
    maxWidth: '78%',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 4,
    ...shadows.cardSoft,
  },
  doctorBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radius.xs,
  },
  patientBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderTopRightRadius: radius.xs,
  },
  bubbleMessageText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  doctorMessageText: {
    color: colors.textPrimary,
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
});
