import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Users,
  CalendarClock,
  Calendar,
  ChevronRight,
  XCircle,
  Phone,
  Clock,
  Droplet,
  FileText,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { mapPatient, formatDate } from '../../lib/mappers/doctorPortal';
import { colors, radius, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import TabScreenHeader from '../../components/TabScreenHeader';
import type { RootStackParamList } from '../../navigation/types';

interface PatientItem {
  id: string;
  name: string;
  age?: number | string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  lastVisit: string;
  totalVisits: number;
  condition: string;
  phone?: string;
  email?: string;
}

export function PatientsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'repeat' | 'recent'>('all');

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

    const appts = Array.isArray(apptsQuery.data)
      ? apptsQuery.data
      : apptsQuery.data?.appointments || [];

    // Map customer details from appointments for rich clinical data
    const apptsMap = new Map<string, any>();
    for (const a of appts) {
      const pid = a.customer_id || a.customer?.id;
      if (pid && !apptsMap.has(pid)) {
        apptsMap.set(pid, a);
      }
    }

    return raw.map((item: any) => {
      const linkedAppt = apptsMap.get(item.id);
      const profile = linkedAppt?.customer?.profile_data || {};
      const age = item.age || profile.age || null;
      const gender = item.gender || profile.gender || null;
      const bloodGroup = item.bloodGroup || profile.bloodGroup || profile.blood_group || null;
      const condition =
        linkedAppt?.reason ||
        item.condition ||
        'General Medical Consultation';

      return {
        id: item.id,
        name: item.name || 'Patient',
        age,
        gender,
        bloodGroup,
        lastVisit: item.lastVisit || (linkedAppt?.appointment_date ? formatDate(linkedAppt.appointment_date) : 'Recently'),
        totalVisits: item.appointmentsCount || 1,
        condition: condition && condition !== 'Clinical relationship' ? condition : 'General Medical Consultation',
        phone: item.phone || linkedAppt?.customer?.phone || '',
        email: item.email || linkedAppt?.customer?.email || '',
      };
    });
  }, [query.data, apptsQuery.data]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = allPatients;

    if (filterMode === 'repeat') {
      list = list.filter(p => p.totalVisits > 1);
    }

    if (!term) return list;

    return list.filter((p: PatientItem) => {
      return (
        p.name.toLowerCase().includes(term) ||
        (p.phone && p.phone.includes(term)) ||
        (p.email && p.email.toLowerCase().includes(term)) ||
        p.condition.toLowerCase().includes(term)
      );
    });
  }, [allPatients, search, filterMode]);

  // Practice Metrics
  const totalPatientsCount = allPatients.length;
  const totalVisitsCount = useMemo(
    () => allPatients.reduce((sum, p) => sum + (p.totalVisits || 1), 0),
    [allPatients],
  );
  const activeVisitsCount = useMemo(() => {
    const appts = Array.isArray(apptsQuery.data)
      ? apptsQuery.data
      : apptsQuery.data?.appointments || [];
    return appts.filter((a: any) => a.status === 'confirmed' || a.status === 'pending' || a.status === 'in_progress').length;
  }, [apptsQuery.data]);

  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([query.refetch(), apptsQuery.refetch()]);
    } finally {
      setPullRefreshing(false);
    }
  }, [query, apptsQuery]);


  return (
    <View style={styles.root}>
      <TabScreenHeader
        title="Patients Directory"
        right={
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{totalPatientsCount} Registered</Text>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        {/* Practice Overview Metrics Card */}
        <View style={styles.metricsCard}>
          {/* Column 1: Total Patients */}
          <View style={styles.metricCol}>
            <View style={styles.metricIconBox}>
              <Users size={16} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.metricNumber}>{totalPatientsCount}</Text>
            <Text style={styles.metricLabel}>Total Patients{'\n'}Roster</Text>
          </View>

          <View style={styles.metricDivider} />

          {/* Column 2: Total Consultations */}
          <View style={styles.metricCol}>
            <View style={styles.metricIconBox}>
              <CalendarClock size={16} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.metricNumber}>{totalVisitsCount}</Text>
            <Text style={styles.metricLabel}>Total Visits{'\n'}Conducted</Text>
          </View>

          <View style={styles.metricDivider} />

          {/* Column 3: Active In-Queue */}
          <View style={styles.metricCol}>
            <View style={[styles.metricIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Clock size={16} color={colors.primaryDark} strokeWidth={2.2} />
            </View>
            <Text style={[styles.metricNumber, { color: colors.primaryDark }]}>{activeVisitsCount}</Text>
            <Text style={styles.metricLabel}>Active Visits{'\n'}In Queue</Text>
          </View>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color={colors.primary} strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients by name, phone or condition..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <XCircle size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Quick Chips */}
        <View style={styles.filtersRow}>
          <Pressable
            style={[styles.filterChip, filterMode === 'all' && styles.filterChipActive]}
            onPress={() => setFilterMode('all')}>
            <Text style={[styles.filterChipText, filterMode === 'all' && styles.filterChipTextActive]}>
              All ({allPatients.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, filterMode === 'repeat' && styles.filterChipActive]}
            onPress={() => setFilterMode('repeat')}>
            <Text style={[styles.filterChipText, filterMode === 'repeat' && styles.filterChipTextActive]}>
              Repeat Patients
            </Text>
          </Pressable>
        </View>

        {/* Patient Cards List */}
        <View style={styles.patientsList}>
          {filteredPatients.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Users size={32} color={colors.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>No patients found</Text>
              <Text style={styles.emptySub}>
                {search
                  ? 'No patient matches your search criteria.'
                  : 'Patients who book consultations with you will appear in your directory.'}
              </Text>
            </View>
          ) : (
            filteredPatients.map((patient: PatientItem) => {
              const initial = (patient.name || 'P').trim().charAt(0).toUpperCase();
              const hasBlood = Boolean(patient.bloodGroup && patient.bloodGroup !== '—' && patient.bloodGroup !== '-');

              return (
                <Pressable
                  key={patient.id}
                  style={({ pressed }) => [
                    styles.patientCard,
                    pressed && styles.patientCardPressed,
                  ]}
                  onPress={() =>
                    navigation.navigate('PatientDetail', {
                      patientId: patient.id,
                    })
                  }>
                  {/* Card Top Row: Avatar + Name & Demographics + Record CTA */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.avatarWrapper}>
                      <View style={styles.patientAvatar}>
                        <Text style={styles.patientAvatarInitial}>{initial}</Text>
                      </View>
                      <View style={styles.avatarOnlineDot} />
                    </View>

                    {/* Patient Name & Demographics */}
                    <View style={styles.patientMainInfo}>
                      <Text style={styles.patientName} numberOfLines={1}>
                        {patient.name}
                      </Text>

                      <View style={styles.demographicsRow}>
                        <Text style={styles.demographicsText}>
                          {[
                            patient.age ? `${patient.age} Y` : null,
                            patient.gender || null,
                          ]
                            .filter(Boolean)
                            .join(' • ') || 'Patient'}
                        </Text>

                        {hasBlood && (
                          <View style={styles.bloodChip}>
                            <Droplet size={9} color={colors.danger} strokeWidth={2.4} />
                            <Text style={styles.bloodChipText}>{patient.bloodGroup}</Text>
                          </View>
                        )}

                        <View style={styles.visitCountTag}>
                          <Text style={styles.visitCountText}>
                            {patient.totalVisits} {patient.totalVisits === 1 ? 'Visit' : 'Visits'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Record Button */}
                    <View style={styles.viewRecordBtn}>
                      <Text style={styles.viewRecordText}>Record</Text>
                      <ChevronRight size={13} color={colors.primary} strokeWidth={2.4} />
                    </View>
                  </View>

                  {/* Condition / Reason Pill */}
                  <View style={styles.conditionBox}>
                    <FileText size={11} color={colors.primaryDark} strokeWidth={2} />
                    <Text style={styles.conditionText} numberOfLines={1}>
                      {patient.condition}
                    </Text>
                  </View>

                  {/* Card Footer: Phone + Last Visit Date */}
                  <View style={styles.cardFooterRow}>
                    <View style={styles.phoneCol}>
                      {patient.phone ? (
                        <View style={styles.phoneBadge}>
                          <Phone size={11} color={colors.primary} strokeWidth={2} />
                          <Text style={styles.phoneText}>{patient.phone}</Text>
                        </View>
                      ) : (
                        <Text style={styles.noPhoneText}>No contact on file</Text>
                      )}
                    </View>

                    <View style={styles.lastVisitWrap}>
                      <Calendar size={11} color={colors.textMuted} strokeWidth={2} />
                      <Text style={styles.lastVisitText}>Last: {patient.lastVisit}</Text>
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
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.cardSoft,
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
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 13,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },

  /* Search Bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#D4EFEF',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    ...shadows.cardSoft,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  /* Filter Chips */
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.aqua,
    borderColor: '#B4E8E1',
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },

  /* Patient Cards */
  patientsList: {
    gap: 12,
  },
  patientCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.cardSoft,
  },
  patientCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
    borderColor: '#B4E8E1',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.aqua,
    borderWidth: 1.5,
    borderColor: '#B4E8E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarInitial: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  patientMainInfo: {
    flex: 1,
    gap: 3,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  demographicsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  demographicsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bloodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.xs,
  },
  bloodChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
  },
  visitCountTag: {
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  visitCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  viewRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.aqua,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#C8EDE9',
  },
  viewRecordText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Condition Callout */
  conditionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },

  /* Footer Meta Row */
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  phoneCol: {
    flex: 1,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  noPhoneText: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  lastVisitWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastVisitText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    ...shadows.cardSoft,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
