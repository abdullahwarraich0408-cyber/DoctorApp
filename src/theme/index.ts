export * from './colors';
export * from './spacing';
export * from './radius';
export * from './tabScreenHeader';

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: '#10233F' },
  h2: { fontSize: 22, fontWeight: '700' as const, color: '#10233F' },
  h3: { fontSize: 18, fontWeight: '600' as const, color: '#10233F' },
  bodyLarge: { fontSize: 16, fontWeight: '500' as const, color: '#10233F' },
  body: { fontSize: 14, fontWeight: '400' as const, color: '#56657A' },
  caption: { fontSize: 12, fontWeight: '500' as const, color: '#8491A5' },
  
  // Legacy aliases
  logo: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.3 },
  title: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.35 },
  subtitle: { fontSize: 14, fontWeight: '600' as const },
  label: { fontSize: 11, fontWeight: '600' as const },
  tab: { fontSize: 10, fontWeight: '600' as const },
  display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.8 },
  greeting: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  section: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2 },
  metric: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.5 },
};

/** Clean, subtle healthcare shadows */
export const shadows = {
  card: {
    shadowColor: '#10233F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardSoft: {
    shadowColor: '#10233F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardElevated: {
    shadowColor: '#10233F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  fab: {
    shadowColor: '#006D72',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
};

export { TAB_BAR_CLEARANCE, getTabBarOccupiedHeight } from './layout';

export { useResponsiveLayout, BREAKPOINTS, scaleByWidth } from './responsive';
