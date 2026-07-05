import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { callWaiter } from '../api/client';

export default function CallWaiterScreen() {
  const [called, setCalled] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleCall = async () => {
    setError('');
    setSending(true);
    try {
      await callWaiter();
      setCalled(true);
    } catch (e) {
      setError(e.message || 'Could not reach the server');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, called && styles.iconCircleSuccess]}>
          <Ionicons
            name={called ? 'checkmark-circle' : 'hand-left'}
            size={52}
            color={COLORS.white}
          />
        </View>

        <Text style={styles.title}>
          {called ? 'Waiter Called!' : 'Call a Waiter'}
        </Text>
        <Text style={styles.subtitle}>
          {called
            ? 'A waiter has been notified and will be with you shortly. Thank you for your patience.'
            : 'Tap the button below to alert a nearby waiter for assistance at your table.'}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!called ? (
          <TouchableOpacity
            style={[styles.callBtn, sending && { opacity: 0.7 }]}
            onPress={handleCall}
            activeOpacity={0.85}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="notifications" size={18} color={COLORS.white} />
                <Text style={styles.callBtnText}>Call Waiter Now</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.resetBtn} onPress={() => setCalled(false)}>
            <Text style={styles.resetBtnText}>Send Another Alert</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F7',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    width: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconCircleSuccess: {
    backgroundColor: COLORS.green,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 30,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    paddingVertical: 14,
    paddingHorizontal: 36,
    gap: 8,
  },
  callBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  resetBtn: {
    paddingVertical: 10,
  },
  resetBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
