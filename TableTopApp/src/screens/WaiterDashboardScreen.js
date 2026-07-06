import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { fetchOpenTickets, updateItemStatus, fetchPendingCalls, updateCallStatus } from '../api/client';
import { getSocket, joinRoom } from '../api/socket';
import { NEXT_ACTION, ITEM_BADGE, ORDER_BADGE, CALL_LABEL } from '../constants/orderFlow';

export default function WaiterDashboardScreen() {
  const [tickets, setTickets] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState(new Set());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [t, c] = await Promise.all([fetchOpenTickets(), fetchPendingCalls()]);
      setTickets(t);
      setCalls(c);
    } catch (e) {
      setError(e.message || 'Could not load tickets');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + live updates: any order/call event refreshes the board
  useEffect(() => {
    load();

    const socket = getSocket();
    joinRoom('waiter');
    const refresh = () => load(true);
    const events = ['order:new', 'order:status', 'order:item-status', 'waiter:call', 'waiter:call-status'];
    events.forEach((ev) => socket.on(ev, refresh));
    return () => events.forEach((ev) => socket.off(ev, refresh));
  }, [load]);

  const advanceItem = async (item) => {
    const action = NEXT_ACTION[item.status];
    if (!action || busyIds.has(item.order_details_id)) return;
    setBusyIds((prev) => new Set(prev).add(item.order_details_id));
    try {
      await updateItemStatus(item.order_details_id, action.next);
      await load(true);
    } catch (e) {
      setError(e.message || 'Updating item failed');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(item.order_details_id);
        return next;
      });
    }
  };

  const resolveCall = async (call) => {
    try {
      await updateCallStatus(call.waiter_call_id, 'resolved');
      await load(true);
    } catch (e) {
      setError(e.message || 'Resolving call failed');
    }
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Order Tickets</Text>
          <Text style={styles.subtitle}>Live orders from every table — tick items as they move</Text>
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

          {/* Pending customer calls */}
          {calls.length > 0 && (
            <View style={styles.callsPanel}>
              <View style={styles.callsHeader}>
                <Ionicons name="notifications" size={16} color={COLORS.white} />
                <Text style={styles.callsTitle}>
                  {calls.length} table{calls.length > 1 ? 's' : ''} calling
                </Text>
              </View>
              {calls.map((call) => (
                <View key={call.waiter_call_id} style={styles.callRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.callTable}>{call.table_name}</Text>
                    <Text style={styles.callMsg}>
                      {CALL_LABEL[call.request_type] || 'Request'}
                      {call.message ? ` — ${call.message}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.resolveBtn} onPress={() => resolveCall(call)}>
                    <Text style={styles.resolveText}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Ticket grid */}
          {tickets.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="cafe-outline" size={44} color={COLORS.grayMedium} />
              <Text style={styles.stateText}>No open orders — all caught up!</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {tickets.map((ticket) => {
                const ob = ORDER_BADGE[ticket.status] || ORDER_BADGE.placed;
                return (
                  <View key={ticket.orders_id} style={styles.ticket}>
                    {/* Ticket header */}
                    <View style={styles.ticketHeader}>
                      <View>
                        <Text style={styles.ticketTable}>{ticket.table_name}</Text>
                        <Text style={styles.ticketTime}>{formatTime(ticket.order_date)}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: ob.bg }]}>
                        <Text style={[styles.badgeText, { color: ob.text }]}>{ob.label}</Text>
                      </View>
                    </View>

                    {/* Items */}
                    {ticket.items.map((item) => {
                      const ib = ITEM_BADGE[item.status] || ITEM_BADGE.queued;
                      const action = NEXT_ACTION[item.status];
                      const busy = busyIds.has(item.order_details_id);
                      return (
                        <View key={item.order_details_id} style={styles.itemRow}>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>
                              {item.quantity} × {item.menu_title}
                            </Text>
                            {item.notes ? (
                              <Text style={styles.itemNotes}>Note: {item.notes}</Text>
                            ) : null}
                            <View style={[styles.badge, styles.itemBadge, { backgroundColor: ib.bg }]}>
                              <Text style={[styles.badgeText, { color: ib.text }]}>{ib.label}</Text>
                            </View>
                          </View>

                          {action ? (
                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: action.color }, busy && { opacity: 0.6 }]}
                              onPress={() => advanceItem(item)}
                              disabled={busy}
                              activeOpacity={0.8}
                            >
                              {busy ? (
                                <ActivityIndicator size="small" color={COLORS.white} />
                              ) : (
                                <>
                                  <Ionicons name={action.icon} size={13} color={COLORS.white} />
                                  <Text style={styles.actionText}>{action.label}</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <Ionicons name="checkmark-done" size={20} color={COLORS.green} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}
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
    gap: 10,
    paddingVertical: 60,
  },
  stateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
  callsPanel: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.cardRadius,
    padding: 14,
    marginBottom: 18,
  },
  callsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  callsTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 6,
  },
  callTable: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  callMsg: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 1,
  },
  resolveBtn: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  resolveText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  ticket: {
    width: 340,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: SIZES.cardRadius,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 4,
  },
  ticketTable: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ticketTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemNotes: {
    fontSize: 12,
    color: COLORS.primary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 118,
    justifyContent: 'center',
  },
  actionText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
