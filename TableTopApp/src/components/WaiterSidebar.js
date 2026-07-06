import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';

// Same orange sidebar as the customer app, but for staff dashboards.
// navItems/roleLabel are props so the kitchen module can reuse it.
const DEFAULT_NAV = [
  { id: 'tables',  label: 'Tables',  icon: 'grid-outline',    activeIcon: 'grid' },
  { id: 'tickets', label: 'Tickets', icon: 'receipt-outline', activeIcon: 'receipt' },
];

export default function WaiterSidebar({
  activeScreen,
  onNavigate,
  waiterName,
  onLogout,
  roleLabel = 'Waiter',
  navItems = DEFAULT_NAV,
}) {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={styles.logoIconCircle}>
          <Ionicons name="restaurant" size={26} color={COLORS.white} />
        </View>
        <Text style={styles.logoText}>TableTop</Text>
        <Text style={styles.logoSub}>{roleLabel}</Text>
      </View>

      <View style={styles.divider} />

      {/* Nav */}
      <View style={styles.navSection}>
        {navItems.map((item) => {
          const active = activeScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => onNavigate(item.id)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={17}
                color={active ? COLORS.primary : COLORS.white}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* Bottom: waiter identity + logout */}
      <View style={styles.bottomSection}>
        <View style={styles.divider} />
        <Text style={styles.bottomRole}>On shift</Text>
        <Text style={styles.bottomName}>{waiterName}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.75}>
          <Ionicons name="log-out-outline" size={14} color={COLORS.white} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZES.sidebarWidth,
    backgroundColor: COLORS.primary,
    paddingTop: 36,
    paddingBottom: 20,
  },
  logoSection: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 14,
  },
  logoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  logoText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  logoSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 12,
    marginVertical: 6,
  },
  navSection: {
    paddingHorizontal: 8,
    marginTop: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 3,
  },
  navItemActive: {
    backgroundColor: COLORS.white,
  },
  navLabel: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '500',
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  bottomSection: {
    paddingHorizontal: 8,
  },
  bottomRole: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 8,
  },
  bottomName: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 6,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
});
