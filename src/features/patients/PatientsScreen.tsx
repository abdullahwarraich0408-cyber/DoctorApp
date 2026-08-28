import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  RefreshControl,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Filter,
  Users,
  CalendarClock,
  AlertCircle,
  AlertTriangle,
  Calendar,
  ChevronRight,
  UserPlus,
  XCircle,
  Phone,
  Clock,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { mapPatient } from '../../lib/mappers/doctorPortal';
import { colors, radius, spacing, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

interface PatientItem {
  id: string;
  name: string;
  age: number;
  gender: string;
  lastVisit: string;
  totalVisits: number;
  conditions: string[];
  avatar: string;
  phone?: string;
  email?: string;
}

export function PatientsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['doctor-patients'],
    queryFn: () => doctorPortalApi.getPatients(),
  });

  const apptsQuery = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => doctorPortalApi.getAppointments(),
  });

  const allPatients: PatientItem[] = useMemo(() => {
    const raw = (
      Array.isArray(query.data) ? query.data : query.data?.patients || []
    ).map(mapPatient);

    return raw.map((item: any, idx: number) => ({
      id: item.id || `pat-${idx + 1}`,
      name: item.name || 'Patient',
      age: item.age || 32,
      gender: item.gender || (idx % 2 === 0 ? 'Female' : 'Male'),
      lastVisit: item.lastVisit || 'Recently',
      totalVisits: item.appointmentsCount || 1,
      conditions: item.condition
        ? item.condition.split(',').map((c: string) => c.trim())
        : ['Consultation Patient'],
      avatar:
        idx % 2 === 0
          ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      phone: item.phone,
      email: item.email,
    }));
  }, [query.data]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allPatients;

    return allPatients.filter((p: PatientItem) => {
      return (
        p.name.toLowerCase().includes(term) ||
        (p.phone && p.phone.includes(term)) ||
        (p.email && p.email.toLowerCase().includes(term)) ||
        p.conditions.some((c: string) => c.toLowerCase().includes(term))
      );
    });
  }, [allPatients, search]);

  // Dynamic Metrics
  const totalPatientsCount = allPatients.length;
  const totalVisitsCount = useMemo(
    () => allPatients.reduce((sum, p) => sum + (p.totalVisits || 1), 0),
    [allPatients],
  );
  const activeFollowupsCount = useMemo(() => {
    const appts = Array.isArray(apptsQuery.data)
      ? apptsQuery.data
      : apptsQuery.data?.appointments || [];
    return appts.filter((a: any) => a.status === 'confirmed' || a.status === 'pending').length;
  }, [apptsQuery.data]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Top Header with Deep Teal Background */}
      <View style={[styles.headerSection, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Patients Directory</Text>

          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{totalPatientsCount} Registered</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching || apptsQuery.isRefetching}
            onRefresh={() => {
              query.refetch();
              apptsQuery.refetch();
            }}
            tintColor={colors.primary}
          />
        }>
        {/* Patient Overview Metrics Card (3 Dynamic Columns) */}
        <View style={styles.metricsCard}>
          {/* Column 1: Total Patients */}
          <View style={styles.metricCol}>
            <View style={[styles.metricIconBox, { backgroundColor: colors.aqua }]}>
              <Users size={16} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.metricNumber}>{totalPatientsCount}</Text>
            <Text style={styles.metricLabel}>Total Patients{'\n'}Roster</Text>
          </View>

          <View style={styles.metricDivider} />

          {/* Column 2: Total Consultations */}
          <View style={styles.metricCol}>
            <View style={[styles.metricIconBox, { backgroundColor: colors.aqua }]}>
              <CalendarClock size={16} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.metricNumber}>{totalVisitsCount}</Text>
            <Text style={styles.metricLabel}>Total Visits{'\n'}Conducted</Text>
          </View>

          <View style={styles.metricDivider} />

          {/* Column 3: Active In-Queue */}
          <View style={styles.metricCol}>
            <View style={[styles.metricIconBox, { backgroundColor: colors.mint }]}>
              <Clock size={16} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.metricNumber, { color: colors.primary }]}>{activeFollowupsCount}</Text>
            <Text style={styles.metricLabel}>Active Visits{'\n'}In Queue</Text>
          </View>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients by name, phone or condition..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={6}>
              <XCircle size={16} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {/* Patient Cards List */}
        <View style={styles.patientsList}>
          {filteredPatients.length === 0 ? (
            <View style={styles.emptyCard}>
              <Users size={44} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No patients found</Text>
              <Text style={styles.emptySub}>
                {search
                  ? 'No patient matched your search criteria.'
                  : 'Patients who book consultations with you will appear here.'}
              </Text>
            </View>
          ) : (
            filteredPatients.map((patient: PatientItem) => {
              return (
                <Pressable
                  key={patient.id}
                  style={styles.patientCard}
                  onPress={() =>
                    navigation.navigate('PatientDetail', {
                      patientId: patient.id,
                    })
                  }>
                  <View style={styles.patientRowContent}>
                    {/* Patient Avatar */}
                    <Image source={{ uri: patient.avatar }} style={styles.patientAvatar} />

                    {/* Patient Main Info */}
                    <View style={styles.patientInfoCol}>
                      <Text style={styles.patientName}>{patient.name}</Text>
                      <Text style={styles.patientDemographics}>
                        {patient.gender} • {patient.totalVisits} visit{patient.totalVisits > 1 ? 's' : ''}
                      </Text>

                      {patient.phone ? (
                        <View style={styles.phoneRow}>
                          <Phone size={11} color={colors.textMuted} strokeWidth={2} />
                          <Text style={styles.phoneText}>{patient.phone}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Action Arrow & Visit Date */}
                    <View style={styles.patientRightMeta}>
                      <Text style={styles.lastVisitDate}>{patient.lastVisit}</Text>
                      <View style={styles.viewRecordBtn}>
                        <Text style={styles.viewRecordText}>Record</Text>
                        <ChevronRight size={14} color={colors.primary} strokeWidth={2.2} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSection: {
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerBadge: {
    backgroundColor: 'rgba(221, 246, 242, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(221, 246, 242, 0.3)',
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mint,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: TAB_BAR_CLEARANCE + 30,
    gap: 12,
  },

  /* Metrics Card */
  metricsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 12,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },

  /* Search Bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    ...shadows.cardSoft,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },

  /* Patient Cards */
  patientsList: {
    gap: 10,
  },
  patientCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.cardSoft,
  },
  patientRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientInfoCol: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  patientDemographics: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  phoneText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  patientRightMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  lastVisitDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  viewRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.aqua,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  viewRecordText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 30,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    ...shadows.cardSoft,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
