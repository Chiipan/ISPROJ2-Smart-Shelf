import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';

const NAV_ITEMS = [
  { id: 'menu',   label: 'Menu',          icon: 'restaurant-outline',  activeIcon: 'restaurant' },
  { id: 'cart',   label: 'Cart',          icon: 'cart-outline',         activeIcon: 'cart',        hasGear: true },
  { id: 'orders', label: 'Order Status',  icon: 'clipboard-outline',    activeIcon: 'clipboard' },
  { id: 'waiter', label: 'Call a Waiter', icon: 'hand-left-outline',    activeIcon: 'hand-left' },
];

export default function Sidebar({ activeScreen, onNavigate }) {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={styles.logoIconCircle}>
          <Ionicons name="restaurant" size={26} color={COLORS.white} />
        </View>
        <Text style={styles.logoText}>TableTop</Text>
        <Text style={styles.logoSub}>Restaurant</Text>
      </View>

      <View style={styles.divider} />

      {/* Nav */}
      <View style={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const active = activeScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => onNavigate(item.id)}
              activeOpacity={0.75}
            >
              <View style={styles.navLeft}>
                <Ionicons
                  name={active ? item.activeIcon : item.icon}
                  size={17}
                  color={active ? COLORS.primary : COLORS.white}
                />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </View>
              {item.hasGear && (
                <Ionicons
                  name="settings-outline"
                  size={12}
                  color={active ? COLORS.primary : 'rgba(255,255,255,0.45)'}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* Bottom */}
      <View style={styles.bottomSection}>
        <View style={styles.divider} />
        <Text style={styles.bottomRestaurant}>Restaurant</Text>
        <Text style={styles.bottomTable}>Table 24</Text>
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
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 3,
  },
  navItemActive: {
    backgroundColor: COLORS.white,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  navLabel: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '500',
    flexShrink: 1,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  bottomSection: {
    paddingHorizontal: 8,
  },
  bottomRestaurant: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 8,
  },
  bottomTable: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 3,
  },
});
