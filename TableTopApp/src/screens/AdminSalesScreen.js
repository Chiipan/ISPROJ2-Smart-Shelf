import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { fetchAdminSales, fetchAdminItems } from '../api/client';
import { getSocket, joinRoom } from '../api/socket';

const METHOD_LABEL = { cash: 'Cash', card: 'Card', qrph: 'QRPh', gcash: 'GCash', maya: 'Maya', other: 'Other' };

export default function AdminSalesScreen() {
  const [sales, setSales] = useState(null);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [s, i] = await Promise.all([fetchAdminSales(7), fetchAdminItems()]);
      setSales(s);
      setItems(i);
    } catch (e) {
      setError(e.message || 'Could not load the sales report');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Live: every new payment refreshes the report
  useEffect(() => {
    load();
    const socket = getSocket();
    joinRoom('admin');
    const refresh = () => load(true);
    socket.on('sales:new', refresh);
    return () => socket.off('sales:new', refresh);
  }, [load]);

  const money = (n) => `PHP ${Number(n).toFixed(2)}`;
  const weekTotal = sales ? sales.daily.reduce((s, d) => s + Number(d.gross_sales), 0) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sales Report</Text>
          <Text style={styles.subtitle}>Live sales, payment mix, and item movers</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => load()}>
          <Ionicons name="refresh" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Headline cards */}
          <View style={styles.cardsRow}>
            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={22} color={COLORS.primary} />
              <Text style={styles.statValue}>{money(sales.today.gross_sales)}</Text>
              <Text style={styles.statLabel}>Sales today</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="receipt-outline" size={22} color={COLORS.primary} />
              <Text style={styles.statValue}>{sales.today.orders_count}</Text>
              <Text style={styles.statLabel}>Orders today</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
              <Text style={styles.statValue}>{money(weekTotal)}</Text>
              <Text style={styles.statLabel}>Last {sales.days} days</Text>
            </View>
          </View>

          <View style={styles.columns}>
            {/* Fast / slow movers */}
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Ionicons name="trending-up" size={16} color={COLORS.green} />
                <Text style={styles.panelTitle}>Fast Moving Items</Text>
              </View>
              {items.fast_movers.length === 0 ? (
                <Text style={styles.emptyText}>No sales yet</Text>
              ) : items.fast_movers.map((it, idx) => (
                <View key={it.menu_item_id} style={styles.moverRow}>
                  <Text style={styles.moverRank}>{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.moverName}>{it.menu_title}</Text>
                    <Text style={styles.moverSub}>{it.category_name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.moverQty}>{it.total_qty_sold} sold</Text>
                    <Text style={styles.moverRev}>{money(it.total_revenue)}</Text>
                  </View>
                </View>
              ))}

              <View style={[styles.panelHeader, { marginTop: 18 }]}>
                <Ionicons name="trending-down" size={16} color={COLORS.red} />
                <Text style={styles.panelTitle}>Slow Moving Items</Text>
              </View>
              {items.slow_movers.map((it) => (
                <View key={it.menu_item_id} style={styles.moverRow}>
                  <Ionicons name="alert-circle-outline" size={15} color={COLORS.grayMedium} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.moverName}>{it.menu_title}</Text>
                    <Text style={styles.moverSub}>{it.category_name}</Text>
                  </View>
                  <Text style={styles.moverQtySlow}>{it.total_qty_sold} sold</Text>
                </View>
              ))}
            </View>

            {/* Daily sales + payment mix */}
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Ionicons name="bar-chart-outline" size={16} color={COLORS.primary} />
                <Text style={styles.panelTitle}>Daily Sales (last {sales.days} days)</Text>
              </View>
              {sales.daily.length === 0 ? (
                <Text style={styles.emptyText}>No sales in this period</Text>
              ) : sales.daily.map((d) => (
                <View key={d.sales_date} style={styles.dailyRow}>
                  <Text style={styles.dailyDate}>
                    {new Date(d.sales_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.dailyOrders}>{d.orders_count} orders</Text>
                  <Text style={styles.dailyGross}>{money(d.gross_sales)}</Text>
                </View>
              ))}

              <View style={[styles.panelHeader, { marginTop: 18 }]}>
                <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
                <Text style={styles.panelTitle}>Payment Methods</Text>
              </View>
              {sales.by_method.map((m) => (
                <View key={m.payment_method} style={styles.dailyRow}>
                  <Text style={styles.dailyDate}>{METHOD_LABEL[m.payment_method] || m.payment_method}</Text>
                  <Text style={styles.dailyOrders}>{m.payments_count}×</Text>
                  <Text style={styles.dailyGross}>{money(m.total_amount)}</Text>
                </View>
              ))}
            </View>
          </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errorText: { color: COLORS.red, fontSize: 13, textAlign: 'center' },
  retryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 22, paddingVertical: 10,
  },
  retryText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  scroll: { flex: 1, paddingHorizontal: 22, paddingTop: 16 },
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, borderWidth: 1, borderColor: '#ECECEC', borderRadius: SIZES.cardRadius,
    padding: 16, alignItems: 'center', gap: 6, backgroundColor: '#FFFDFB',
  },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  columns: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  panel: {
    flex: 1, minWidth: 340, borderWidth: 1, borderColor: '#ECECEC',
    borderRadius: SIZES.cardRadius, padding: 16,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  panelTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  emptyText: { fontSize: 13, color: COLORS.grayMedium, fontStyle: 'italic' },
  moverRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  moverRank: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary,
    color: COLORS.white, fontSize: 12, fontWeight: '700',
    textAlign: 'center', lineHeight: 22, overflow: 'hidden',
  },
  moverName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  moverSub: { fontSize: 11, color: COLORS.textSecondary },
  moverQty: { fontSize: 13, fontWeight: '700', color: COLORS.green },
  moverQtySlow: { fontSize: 13, fontWeight: '700', color: COLORS.grayDark },
  moverRev: { fontSize: 11, color: COLORS.textSecondary },
  dailyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  dailyDate: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600', flex: 1 },
  dailyOrders: { fontSize: 12, color: COLORS.textSecondary, flex: 1, textAlign: 'center' },
  dailyGross: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
});
