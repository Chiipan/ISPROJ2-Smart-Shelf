import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';

const VAT = 0.05;

export default function CartScreen({ cartItems, onRemove, onUpdateQty, onNavigate }) {
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + subtotal * VAT;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cart</Text>
          <Text style={styles.subtitle}>Check your current list of orders</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.placeBtn}>
            <Text style={styles.placeBtnText}>Place Order</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addMenuBtn} onPress={() => onNavigate('menu')}>
            <Text style={styles.addMenuText}>Add Menu</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Items */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {cartItems.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={50} color={COLORS.grayMedium} />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => onNavigate('menu')}>
              <Text style={styles.browseBtnText}>Browse Menu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          cartItems.map(item => (
            <View key={item.id} style={styles.cartItem}>
              {/* Thumbnail */}
              <View style={styles.thumb}>
                <Ionicons name="image-outline" size={26} color="#C0C0C0" />
              </View>

              {/* Details */}
              <View style={styles.details}>
                <View style={styles.detailsHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemTotal}>PHP {(item.price * item.quantity).toFixed(2)}</Text>
                </View>
                <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>

                {/* Qty + Remove */}
                <View style={styles.itemFooter}>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onUpdateQty(item.id, -1)}
                    >
                      <Text style={styles.qtyBtnText}>{'<'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onUpdateQty(item.id, 1)}
                    >
                      <Text style={styles.qtyBtnText}>{'>'}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => onRemove(item.id)}>
                    <Text style={styles.removeText}>Remove Order {'>'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.vatText}>Vat: {(VAT * 100).toFixed(0)}%</Text>
        <Text style={styles.totalText}>Total Sale: PHP {total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  placeBtn: {
    backgroundColor: COLORS.green,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  placeBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  addMenuBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  addMenuText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.grayDark,
    marginTop: 12,
    marginBottom: 20,
  },
  browseBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  browseBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  cartItem: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: SIZES.cardRadius,
    marginBottom: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  thumb: {
    width: 110,
    backgroundColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  details: {
    flex: 1,
    padding: 14,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCDCDC',
    borderRadius: 6,
    overflow: 'hidden',
  },
  qtyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  qtyValue: {
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#DCDCDC',
    paddingVertical: 6,
  },
  removeText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  summary: {
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  vatText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
