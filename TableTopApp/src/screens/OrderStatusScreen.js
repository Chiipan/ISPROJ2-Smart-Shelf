import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { fetchMyOrders } from '../api/client';

// Maps order_details.status values (database) to badge text + colors
const STATUS_STYLE = {
  queued:         { label: 'Pending',   bg: '#FFF3E0', text: '#F5891F' },
  in_progress:    { label: 'Preparing', bg: '#E3F2FD', text: '#1976D2' },
  ready_to_serve: { label: 'Ready',     bg: '#E8F5E9', text: '#388E3C' },
  served:         { label: 'Served',    bg: '#EEEEEE', text: '#616161' },
  cancelled:      { label: 'Cancelled', bg: '#FFEBEE', text: '#C62828' },
};

export default function OrderStatusScreen({ onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await fetchMyOrders());
    } catch (e) {
      setError(e.message || 'Could not load your orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const allItems = orders.flatMap(o => o.items);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pending Orders</Text>
          <Text style={styles.subtitle}>Check the status of your orders</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadOrders}>
            <Ionicons name="refresh" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addMenuBtn} onPress={() => onNavigate('menu')}>
            <Text style={styles.addMenuText}>Add Menu</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Orders */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={COLORS.grayMedium} />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadOrders}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : allItems.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={44} color={COLORS.grayMedium} />
          <Text style={styles.stateText}>No orders yet</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => onNavigate('menu')}>
            <Text style={styles.retryText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {allItems.map(item => {
            const s = STATUS_STYLE[item.status] || STATUS_STYLE.queued;
            return (
              <View key={item.order_details_id} style={styles.orderItem}>
                {/* Thumbnail */}
                <View style={styles.thumb}>
                  <Ionicons name="image-outline" size={26} color="#C0C0C0" />
                </View>

                {/* Details */}
                <View style={styles.details}>
                  <View style={styles.detailsHeader}>
                    <Text style={styles.orderName}>{item.menu_title}</Text>
                    <Text style={styles.orderQty}>Quantity: {item.quantity}</Text>
                  </View>
                  <Text style={styles.orderDesc} numberOfLines={2}>
                    {item.notes ? `Note: ${item.notes}` : item.description}
                  </Text>

                  <View style={styles.orderFooter}>
                    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                      <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
                    </View>
                    <Text style={styles.orderTotal}>PHP {Number(item.total).toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
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
    alignItems: 'center',
    gap: 10,
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    padding: 9,
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginTop: 6,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  orderItem: {
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
  orderName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  orderQty: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  orderDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
