import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { fetchAdminInventory, adjustInventory } from '../api/client';
import { getSocket, joinRoom } from '../api/socket';

const STATUS_BADGE = {
  ok:  { label: 'In Stock',     bg: '#E8F5E9', text: '#388E3C' },
  low: { label: 'Low Stock',    bg: '#FFF3E0', text: '#F5891F' },
  out: { label: 'Out of Stock', bg: '#FFEBEE', text: '#C62828' },
};

export default function AdminInventoryScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [amounts, setAmounts] = useState({}); // inventory_id -> input text
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      setItems(await fetchAdminInventory());
    } catch (e) {
      setError(e.message || 'Could not load inventory');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Live: order deductions refresh the stock levels
  useEffect(() => {
    load();
    const socket = getSocket();
    joinRoom('admin');
    const refresh = () => load(true);
    socket.on('inventory:update', refresh);
    socket.on('inventory:low', refresh);
    return () => {
      socket.off('inventory:update', refresh);
      socket.off('inventory:low', refresh);
    };
  }, [load]);

  const handleAdjust = async (item, sign) => {
    const raw = Number(amounts[item.inventory_id]);
    if (!Number.isFinite(raw) || raw <= 0) {
      setError(`Enter a valid amount for ${item.item_name}`);
      return;
    }
    setError('');
    setNotice('');
    setBusyId(item.inventory_id);
    try {
      const res = await adjustInventory(
        item.inventory_id,
        sign * raw,
        sign > 0 ? 'restock' : 'adjustment'
      );
      setItems(res.inventory);
      setAmounts((prev) => ({ ...prev, [item.inventory_id]: '' }));
      if (res.menu_changes.length > 0) {
        setNotice(
          res.menu_changes
            .map((m) => `${m.menu_title} is now ${m.status}`)
            .join(' · ')
        );
      }
    } catch (e) {
      setError(e.message || 'Adjusting stock failed');
    } finally {
      setBusyId(null);
    }
  };

  const lowCount = items.filter((i) => i.stock_status !== 'ok').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>
            {items.length} ingredients{lowCount > 0 ? ` — ${lowCount} need attention` : ' — all healthy'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => load()}>
          <Ionicons name="refresh" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

          {items.map((item) => {
            const badge = STATUS_BADGE[item.stock_status];
            const busy = busyId === item.inventory_id;
            return (
              <View
                key={item.inventory_id}
                style={[styles.row, item.stock_status === 'out' && styles.rowOut]}
              >
                {/* Ingredient + usage */}
                <View style={styles.infoCol}>
                  <Text style={styles.itemName}>{item.item_name}</Text>
                  <Text style={styles.usedBy} numberOfLines={1}>
                    {item.used_by ? `Used by: ${item.used_by}` : 'Not in any recipe yet'}
                  </Text>
                </View>

                {/* Stock numbers */}
                <View style={styles.stockCol}>
                  <Text style={styles.stockQty}>
                    {Number(item.quantity_in_stock)} {item.unit_of_measure}
                  </Text>
                  <Text style={styles.reorder}>reorder at {Number(item.reorder_level)}</Text>
                </View>

                {/* Status badge */}
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>

                {/* Adjust controls */}
                <View style={styles.adjustCol}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="Qty"
                    placeholderTextColor={COLORS.grayMedium}
                    value={amounts[item.inventory_id] || ''}
                    onChangeText={(v) => setAmounts((p) => ({ ...p, [item.inventory_id]: v }))}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={[styles.addBtn, busy && styles.disabled]}
                    onPress={() => handleAdjust(item, +1)}
                    disabled={busy}
                  >
                    {busy
                      ? <ActivityIndicator size="small" color={COLORS.white} />
                      : <Ionicons name="add" size={16} color={COLORS.white} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.minusBtn, busy && styles.disabled]}
                    onPress={() => handleAdjust(item, -1)}
                    disabled={busy}
                  >
                    <Ionicons name="remove" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <Text style={styles.hint}>
            + restocks, − records spoilage/adjustment. Dishes flip to "unavailable" on every
            tablet the moment an ingredient can't cover one more serving, and come back on restock.
          </Text>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#ECECEC',
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  refreshBtn: {
    borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadius, padding: 9,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.red, fontSize: 13, marginBottom: 10, textAlign: 'center' },
  noticeText: { color: COLORS.green, fontSize: 13, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  scroll: { flex: 1, paddingHorizontal: 22, paddingTop: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#ECECEC', borderRadius: SIZES.cardRadius,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  rowOut: { borderColor: '#F5C6C6', backgroundColor: '#FFFBFA' },
  infoCol: { flex: 2, minWidth: 140 },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  usedBy: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  stockCol: { flex: 1, minWidth: 90 },
  stockQty: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  reorder: { fontSize: 11, color: COLORS.textSecondary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  adjustCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amountInput: {
    width: 64, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 7, fontSize: 13,
    color: COLORS.textPrimary, backgroundColor: '#FAFAFA', textAlign: 'center',
  },
  addBtn: { backgroundColor: COLORS.green, borderRadius: 6, padding: 7 },
  minusBtn: { backgroundColor: COLORS.red, borderRadius: 6, padding: 7 },
  disabled: { opacity: 0.5 },
  hint: { fontSize: 12, color: COLORS.grayDark, fontStyle: 'italic', marginTop: 6, lineHeight: 17 },
});
