import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { checkoutOrder, fetchDiscounts } from '../api/client';

const VAT = 0.05;

export default function CartScreen({ cartItems, onRemove, onUpdateQty, onNavigate, onCheckout }) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  // Senior/PWD discount selection
  const [discountOn, setDiscountOn] = useState(false);
  const [discountTypes, setDiscountTypes] = useState([]);
  const [discountTypeId, setDiscountTypeId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set()); // discount holder's items

  useEffect(() => {
    if (discountOn && discountTypes.length === 0) {
      fetchDiscounts()
        .then((rows) => {
          setDiscountTypes(rows);
          if (rows.length > 0) setDiscountTypeId(rows[0].discount_id);
        })
        .catch(() => setError('Could not load discount types'));
    }
  }, [discountOn]);

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeDiscount = discountTypes.find((d) => d.discount_id === discountTypeId);
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountableTotal = cartItems
    .filter((i) => discountOn && selectedIds.has(i.id))
    .reduce((sum, i) => sum + i.price * i.quantity, 0);
  const estDiscount = activeDiscount && discountOn
    ? discountableTotal * Number(activeDiscount.rate)
    : 0;
  const estTotal = (subtotal - estDiscount) * (1 + VAT);

  const handleCheckout = async () => {
    if (cartItems.length === 0 || checkingOut) return;
    if (discountOn && selectedIds.size === 0) {
      setError("Select the discount holder's items first");
      return;
    }
    setError('');
    setCheckingOut(true);
    try {
      const discount = discountOn && activeDiscount
        ? { discount_id: activeDiscount.discount_id, menu_item_ids: [...selectedIds] }
        : null;
      const order = await checkoutOrder(cartItems, discount);
      onCheckout(order);
    } catch (e) {
      setError(e.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cart</Text>
          <Text style={styles.subtitle}>Check your current list of orders</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[styles.placeBtn, (checkingOut || cartItems.length === 0) && styles.btnDisabled]}
            onPress={handleCheckout}
            disabled={checkingOut || cartItems.length === 0}
          >
            {checkingOut
              ? <ActivityIndicator size="small" color={COLORS.white} />
              : <Text style={styles.placeBtnText}>Proceed to Payment</Text>}
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
          <>
            {cartItems.map(item => (
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

                  {/* Discount holder's item checkbox */}
                  {discountOn && (
                    <TouchableOpacity
                      style={styles.holderRow}
                      onPress={() => toggleSelected(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={selectedIds.has(item.id) ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={selectedIds.has(item.id) ? COLORS.primary : COLORS.grayMedium}
                      />
                      <Text style={styles.holderText}>Ordered by the discount holder</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {/* Senior/PWD discount panel */}
            <View style={styles.discountPanel}>
              <TouchableOpacity
                style={styles.discountToggle}
                onPress={() => setDiscountOn(v => !v)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={discountOn ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={discountOn ? COLORS.primary : COLORS.grayMedium}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.discountTitle}>Senior Citizen / PWD discount</Text>
                  <Text style={styles.discountSub}>
                    A waiter will come to your table to verify the ID before it applies
                  </Text>
                </View>
              </TouchableOpacity>

              {discountOn && (
                <View style={styles.discountTypes}>
                  {discountTypes.map((d) => {
                    const active = d.discount_id === discountTypeId;
                    return (
                      <TouchableOpacity
                        key={d.discount_id}
                        style={[styles.typeChip, active && styles.typeChipActive]}
                        onPress={() => setDiscountTypeId(d.discount_id)}
                      >
                        <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                          {d.discount_type} ({(Number(d.rate) * 100).toFixed(0)}%)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Summary */}
      <View style={styles.summary}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Text style={styles.vatText}>Subtotal: PHP {subtotal.toFixed(2)}</Text>
        {discountOn && estDiscount > 0 && (
          <Text style={styles.discountText}>
            {activeDiscount?.discount_type} discount (after ID check): -PHP {estDiscount.toFixed(2)}
          </Text>
        )}
        <Text style={styles.vatText}>Vat: {(VAT * 100).toFixed(0)}%</Text>
        <Text style={styles.totalText}>Total Sale: PHP {estTotal.toFixed(2)}</Text>
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
  btnDisabled: {
    opacity: 0.6,
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
  holderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  holderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  discountPanel: {
    borderWidth: 1,
    borderColor: '#F0D9C8',
    backgroundColor: '#FFFAF5',
    borderRadius: SIZES.cardRadius,
    padding: 14,
    marginBottom: 14,
  },
  discountToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  discountTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  discountSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  discountTypes: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  typeChip: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  typeChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: COLORS.white,
  },
  summary: {
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 13,
    marginBottom: 8,
  },
  vatText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  discountText: {
    fontSize: 13,
    color: COLORS.green,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
