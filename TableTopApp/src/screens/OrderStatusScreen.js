import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { PENDING_ORDERS } from '../data/mockData';

const STATUS_STYLE = {
  Pending:   { bg: '#FFF3E0', text: '#F5891F' },
  Preparing: { bg: '#E3F2FD', text: '#1976D2' },
  Ready:     { bg: '#E8F5E9', text: '#388E3C' },
};

export default function OrderStatusScreen({ onNavigate }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pending Orders</Text>
          <Text style={styles.subtitle}>Check the status of your orders</Text>
        </View>
        <TouchableOpacity style={styles.addMenuBtn} onPress={() => onNavigate('menu')}>
          <Text style={styles.addMenuText}>Add Menu</Text>
        </TouchableOpacity>
      </View>

      {/* Orders */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {PENDING_ORDERS.map(order => {
          const s = STATUS_STYLE[order.status] || STATUS_STYLE.Pending;
          return (
            <View key={order.id} style={styles.orderItem}>
              {/* Thumbnail */}
              <View style={styles.thumb}>
                <Ionicons name="image-outline" size={26} color="#C0C0C0" />
              </View>

              {/* Details */}
              <View style={styles.details}>
                <View style={styles.detailsHeader}>
                  <Text style={styles.orderName}>{order.name}</Text>
                  <Text style={styles.orderQty}>Quantity: {order.quantity}</Text>
                </View>
                <Text style={styles.orderDesc} numberOfLines={2}>{order.description}</Text>

                {/* Status + Remove */}
                <View style={styles.orderFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusText, { color: s.text }]}>{order.status}</Text>
                  </View>
                  <TouchableOpacity>
                    <Text style={styles.removeText}>Remove Order {'>'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  removeText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
