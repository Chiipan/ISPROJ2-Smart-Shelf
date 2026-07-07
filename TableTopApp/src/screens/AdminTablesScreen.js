import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { fetchAllTables, updateTableCapacity } from '../api/client';

export default function AdminTablesScreen() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [edits, setEdits] = useState({}); // table_id -> capacity text
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchAllTables();
      // Numeric sort: 'Table 10' after 'Table 9'
      rows.sort((a, b) =>
        a.table_name.length - b.table_name.length || a.table_name.localeCompare(b.table_name)
      );
      setTables(rows.filter((t) => !t.is_deleted));
    } catch (e) {
      setError(e.message || 'Could not load tables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (table) => {
    const raw = edits[table.table_id];
    const capacity = parseInt(raw, 10);
    if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 100) {
      setError(`Enter a valid seating capacity for ${table.table_name}`);
      return;
    }
    setError('');
    setNotice('');
    setBusyId(table.table_id);
    try {
      await updateTableCapacity(table.table_id, capacity);
      setNotice(`${table.table_name} now seats ${capacity}`);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[table.table_id];
        return next;
      });
      setTables((prev) =>
        prev.map((t) => (t.table_id === table.table_id ? { ...t, capacity } : t))
      );
    } catch (e) {
      setError(e.message || 'Saving capacity failed');
    } finally {
      setBusyId(null);
    }
  };

  const totalSeats = tables.reduce((s, t) => s + (Number(t.capacity) || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tables & Seating</Text>
          <Text style={styles.subtitle}>
            {tables.length} tables — {totalSeats} total seats
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={load}>
          <Ionicons name="refresh" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

          <View style={styles.grid}>
            {tables.map((table) => {
              const busy = busyId === table.table_id;
              const editing = edits[table.table_id] !== undefined;
              return (
                <View key={table.table_id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.tableName}>{table.table_name}</Text>
                    <View style={[styles.badge, table.is_available ? styles.badgeFree : styles.badgeBusy]}>
                      <Text style={[styles.badgeText, { color: table.is_available ? '#388E3C' : '#C62828' }]}>
                        {table.is_available ? 'Available' : 'Occupied'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.capacityRow}>
                    <Ionicons name="people-outline" size={15} color={COLORS.textSecondary} />
                    <Text style={styles.capacityLabel}>Seats</Text>
                    <TextInput
                      style={styles.capacityInput}
                      value={editing ? edits[table.table_id] : String(table.capacity ?? '')}
                      onChangeText={(v) => setEdits((p) => ({ ...p, [table.table_id]: v }))}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      style={[styles.saveBtn, (!editing || busy) && styles.disabled]}
                      onPress={() => handleSave(table)}
                      disabled={!editing || busy}
                    >
                      {busy
                        ? <ActivityIndicator size="small" color={COLORS.white} />
                        : <Text style={styles.saveText}>Save</Text>}
                    </TouchableOpacity>
                  </View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: 250, borderWidth: 1, borderColor: '#ECECEC',
    borderRadius: SIZES.cardRadius, padding: 14,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  tableName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  badgeFree: { backgroundColor: '#E8F5E9' },
  badgeBusy: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  capacityLabel: { fontSize: 13, color: COLORS.textSecondary },
  capacityInput: {
    flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, fontWeight: '700',
    color: COLORS.textPrimary, backgroundColor: '#FAFAFA', textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  saveText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
