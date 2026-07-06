import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { fetchTableBoard, updateItemStatus, updateCallStatus } from '../api/client';
import { getSocket, joinRoom } from '../api/socket';
import { NEXT_ACTION, ITEM_BADGE, CALL_LABEL } from '../constants/orderFlow';

// Every table in the restaurant, always visible. A table with a pending
// customer call gets a highlighted border and the concern baked into its
// card, above the table's current order items.
export default function TableBoardScreen() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState(new Set());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      setTables(await fetchTableBoard());
    } catch (e) {
      setError(e.message || 'Could not load the table board');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + live refresh on any order or call event
  useEffect(() => {
    load();

    const socket = getSocket();
    joinRoom('waiter');
    const refresh = () => load(true);
    const events = ['order:new', 'order:status', 'order:item-status', 'waiter:call', 'waiter:call-status'];
    events.forEach((ev) => socket.on(ev, refresh));
    return () => events.forEach((ev) => socket.off(ev, refresh));
  }, [load]);

  const withBusy = async (id, fn) => {
    if (busyIds.has(id)) return;
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      await fn();
      await load(true);
    } catch (e) {
      setError(e.message || 'Update failed');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const advanceItem = (item) => {
    const action = NEXT_ACTION[item.status];
    if (action) withBusy(item.order_details_id, () => updateItemStatus(item.order_details_id, action.next));
  };

  const resolveCall = (call) =>
    withBusy(call.waiter_call_id, () => updateCallStatus(call.waiter_call_id, 'resolved'));

  const callingCount = tables.filter((t) => t.calls.length > 0).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Table Board</Text>
          <Text style={styles.subtitle}>
            {tables.length} tables — {tables.filter((t) => t.occupied).length} occupied
            {callingCount > 0 ? ` — ${callingCount} calling` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => load()}>
          <Ionicons name="refresh" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.grid}>
            {tables.map((table) => {
              const calling = table.calls.length > 0;
              return (
                <View
                  key={table.table_id}
                  style={[
                    styles.card,
                    table.occupied && styles.cardOccupied,
                    calling && styles.cardCalling,
                  ]}
                >
                  {/* Card header: table name + status */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.tableName}>{table.table_name}</Text>
                    <View style={[styles.stateBadge, table.occupied ? styles.stateOccupied : styles.stateFree]}>
                      <Text style={[styles.stateText, { color: table.occupied ? '#C62828' : '#388E3C' }]}>
                        {table.occupied ? 'Occupied' : 'Available'}
                      </Text>
                    </View>
                  </View>

                  {/* Capacity */}
                  <View style={styles.seatsRow}>
                    <Ionicons name="people-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.seatsText}>Seats {table.capacity ?? '—'}</Text>
                  </View>

                  {/* Concerns (pending calls) baked into the ticket */}
                  {table.calls.map((call) => {
                    const busy = busyIds.has(call.waiter_call_id);
                    return (
                      <View key={call.waiter_call_id} style={styles.concernRow}>
                        <Ionicons name="alert-circle" size={15} color={COLORS.red} />
                        <Text style={styles.concernText} numberOfLines={2}>
                          {call.message || CALL_LABEL[call.request_type] || 'Request'}
                        </Text>
                        <TouchableOpacity
                          style={[styles.concernResolve, busy && { opacity: 0.5 }]}
                          onPress={() => resolveCall(call)}
                          disabled={busy}
                        >
                          <Ionicons name="checkmark" size={14} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  {/* Current order items */}
                  {table.items.length > 0 ? (
                    <View style={styles.itemsBlock}>
                      {table.items.map((item) => {
                        const ib = ITEM_BADGE[item.status] || ITEM_BADGE.queued;
                        const action = NEXT_ACTION[item.status];
                        const busy = busyIds.has(item.order_details_id);
                        return (
                          <View key={item.order_details_id} style={styles.itemRow}>
                            <View style={styles.itemInfo}>
                              <Text style={styles.itemName} numberOfLines={1}>
                                {item.quantity} × {item.menu_title}
                              </Text>
                              {item.notes ? (
                                <Text style={styles.itemNotes} numberOfLines={1}>{item.notes}</Text>
                              ) : null}
                            </View>
                            <View style={[styles.itemBadge, { backgroundColor: ib.bg }]}>
                              <Text style={[styles.itemBadgeText, { color: ib.text }]}>{ib.label}</Text>
                            </View>
                            {action ? (
                              <TouchableOpacity
                                style={[styles.advanceBtn, { backgroundColor: action.color }, busy && { opacity: 0.5 }]}
                                onPress={() => advanceItem(item)}
                                disabled={busy}
                              >
                                <Ionicons name={action.icon} size={13} color={COLORS.white} />
                              </TouchableOpacity>
                            ) : (
                              <Ionicons name="checkmark-done" size={16} color={COLORS.green} />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.noOrders}>No active orders</Text>
                  )}
                </View>
              );
            })}
          </View>
          <View style={{ height: 24 }} />
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
  refreshBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    padding: 9,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: COLORS.red,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: 250,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: SIZES.cardRadius,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  cardOccupied: {
    borderColor: '#F0D9C8',
    backgroundColor: '#FFFDFB',
  },
  // A calling table jumps out: thick red border
  cardCalling: {
    borderWidth: 2,
    borderColor: COLORS.red,
    backgroundColor: '#FFFBFA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stateBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  stateOccupied: {
    backgroundColor: '#FFEBEE',
  },
  stateFree: {
    backgroundColor: '#E8F5E9',
  },
  stateText: {
    fontSize: 10,
    fontWeight: '700',
  },
  seatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  seatsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  concernRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginBottom: 6,
  },
  concernText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#C62828',
  },
  concernResolve: {
    backgroundColor: COLORS.red,
    borderRadius: 5,
    padding: 4,
  },
  itemsBlock: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 2,
    paddingTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemNotes: {
    fontSize: 11,
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  itemBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  itemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  advanceBtn: {
    borderRadius: 5,
    padding: 5,
  },
  noOrders: {
    fontSize: 12,
    color: COLORS.grayMedium,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
