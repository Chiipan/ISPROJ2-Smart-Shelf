import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, CATEGORY_COLORS } from '../theme';

export default function MenuCard({ item, onAddToCart }) {
  const badgeColor = CATEGORY_COLORS[item.category] || COLORS.primary;

  return (
    <View style={styles.card}>
      {/* Photo from DB (menu_item.food_pic) or gray placeholder */}
      {item.image ? (
        <Image source={item.image} style={styles.itemImage} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={30} color="#C0C0C0" />
        </View>
      )}

      <View style={styles.body}>
        {/* Column labels */}
        <View style={styles.labelRow}>
          <Text style={styles.colLabel}>Menu</Text>
        </View>

        {/* Category badge */}
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{item.category}</Text>
        </View>

        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>PHP {item.price}</Text>
        <Text style={styles.itemDesc} numberOfLines={3}>{item.description}</Text>

        {/* Real-time inventory: sold-out dishes can't be ordered */}
        {item.available === false ? (
          <View style={styles.soldOutBtn}>
            <Ionicons name="close-circle-outline" size={14} color={COLORS.grayDark} />
            <Text style={styles.soldOutText}>Out of Stock</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => onAddToCart && onAddToCart(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={14} color={COLORS.white} />
            <Text style={styles.addBtnText}>Add to Cart</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 210,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cardRadius,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: {
    height: 120,
    width: '100%',
  },
  body: {
    padding: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  colLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 7,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
  },
  itemDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 8,
    gap: 4,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  soldOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEEEEE',
    borderRadius: 6,
    paddingVertical: 8,
    gap: 4,
  },
  soldOutText: {
    color: COLORS.grayDark,
    fontSize: 11,
    fontWeight: '700',
  },
});
