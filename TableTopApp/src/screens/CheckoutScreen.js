import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { verifyDiscount, payOrder, confirmCashPayment, cancelCheckout } from '../api/client';

/* Payment step for the pay-before-kitchen flow.
   The order already exists as 'pending_payment'; nothing reaches the
   kitchen until a payment succeeds here. Card and QRPh are simulated for
   the prototype - a real gateway (e.g. PayMongo) slots into payOrder(). */

const METHODS = [
  { id: 'cash', label: 'Cash',       icon: 'cash-outline',       note: 'A waiter collects at your table' },
  { id: 'card', label: 'Card (NFC)', icon: 'card-outline',       note: 'Tap your card on the reader' },
  { id: 'qrph', label: 'QRPh',       icon: 'qr-code-outline',    note: 'Scan with GCash, Maya, or any bank app' },
];

export default function CheckoutScreen({ order, onDone, onCancel }) {
  const [totals, setTotals] = useState(order.totals);
  // phase: verify | method | card | qrph | processing | cash | done
  const [phase, setPhase] = useState(
    order.totals.discount_status === 'pending' ? 'verify' : 'method'
  );
  const [staffCode, setStaffCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  /* --- discount verification (waiter at the table) --- */
  const handleVerify = (approve) => {
    if (approve && !staffCode.trim()) {
      setError('Enter the staff code to verify the ID');
      return;
    }
    run(async () => {
      const res = await verifyDiscount(order.orders_id, approve, staffCode.trim() || undefined);
      setTotals(res.totals);
      setStaffCode('');
      setPhase('method');
    });
  };

  const handleRemoveDiscount = () =>
    run(async () => {
      const res = await verifyDiscount(order.orders_id, false);
      setTotals(res.totals);
      setPhase('method');
    });

  /* --- payment --- */
  const startMethod = (method) => {
    setError('');
    if (method === 'cash') {
      run(async () => {
        await payOrder(order.orders_id, 'cash');
        setPhase('cash');
      });
    } else {
      setPhase(method); // card | qrph simulation panels
    }
  };

  const simulatePay = (method) => {
    setPhase('processing');
    // Prototype: fake gateway latency, then the backend records the payment
    setTimeout(() => {
      run(async () => {
        const res = await payOrder(order.orders_id, method);
        setTotals(res.totals);
        setReceipt({ method });
        setPhase('done');
      }).catch(() => setPhase(method));
    }, 2000);
  };

  const handleConfirmCash = () => {
    if (!staffCode.trim()) {
      setError('Enter the staff code to confirm the cash was received');
      return;
    }
    run(async () => {
      const res = await confirmCashPayment(order.orders_id, staffCode.trim());
      setTotals(res.totals);
      setReceipt({ method: 'cash', confirmed_by: res.confirmed_by });
      setPhase('done');
    });
  };

  const handleBack = () =>
    run(async () => {
      await cancelCheckout(order.orders_id);
      onCancel();
    });

  const money = (n) => `PHP ${Number(n).toFixed(2)}`;

  const totalsBlock = (
    <View style={styles.totalsCard}>
      <Row label="Subtotal" value={money(totals.subtotal)} />
      {totals.discount_status === 'approved' && (
        <Row
          label={`${totals.discount_type} (-${(totals.discount_rate * 100).toFixed(0)}%)`}
          value={`-${money(totals.discount_amount)}`}
          accent
        />
      )}
      {totals.discount_status === 'pending' && (
        <Row label={`${totals.discount_type} (awaiting ID check)`} value="—" />
      )}
      <Row label={`VAT (${(totals.vat_rate * 100).toFixed(0)}%)`} value={money(totals.vat)} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{money(totals.total)}</Text>
      </View>
    </View>
  );

  const staffCodeInput = (placeholder) => (
    <TextInput
      style={styles.codeInput}
      placeholder={placeholder}
      placeholderTextColor={COLORS.grayMedium}
      value={staffCode}
      onChangeText={setStaffCode}
      secureTextEntry
      keyboardType="number-pad"
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Payment</Text>
          <Text style={styles.subtitle}>
            Your order is sent to the kitchen as soon as it's paid
          </Text>
        </View>
        {phase !== 'done' && phase !== 'processing' && (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} disabled={busy}>
            <Ionicons name="arrow-back" size={14} color={COLORS.primary} />
            <Text style={styles.backText}>Back to Cart</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {totalsBlock}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* STEP: waiter verifies the Senior/PWD ID */}
          {phase === 'verify' && (
            <View style={styles.panel}>
              <View style={styles.panelIconRow}>
                <View style={styles.panelIcon}>
                  <Ionicons name="id-card-outline" size={26} color={COLORS.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelTitle}>Waiter ID Verification</Text>
                  <Text style={styles.panelSub}>
                    A waiter has been called to your table to check the{' '}
                    {totals.discount_type} ID. This section is for the waiter.
                  </Text>
                </View>
              </View>

              {staffCodeInput('Staff code...')}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.approveBtn, busy && styles.disabled]}
                  onPress={() => handleVerify(true)}
                  disabled={busy}
                >
                  {busy ? <ActivityIndicator size="small" color={COLORS.white} />
                        : <Text style={styles.btnText}>Approve ID</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.denyBtn, busy && styles.disabled]}
                  onPress={() => handleVerify(false)}
                  disabled={busy}
                >
                  <Text style={styles.btnText}>Deny</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleRemoveDiscount} disabled={busy}>
                <Text style={styles.linkText}>Skip — continue without the discount</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP: pick a payment method */}
          {phase === 'method' && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>How would you like to pay?</Text>
              <View style={styles.methodRow}>
                {METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.methodCard}
                    onPress={() => startMethod(m.id)}
                    disabled={busy}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={m.icon} size={34} color={COLORS.primary} />
                    <Text style={styles.methodLabel}>{m.label}</Text>
                    <Text style={styles.methodNote}>{m.note}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP: card tap simulation */}
          {phase === 'card' && (
            <View style={[styles.panel, styles.centerPanel]}>
              <Ionicons name="card" size={60} color={COLORS.primary} />
              <Text style={styles.panelTitle}>Tap your card on the reader</Text>
              <Text style={styles.panelSub}>Prototype: this simulates an NFC card payment</Text>
              <TouchableOpacity style={styles.payBtn} onPress={() => simulatePay('card')}>
                <Text style={styles.btnText}>Simulate Card Tap — {money(totals.total)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPhase('method')}>
                <Text style={styles.linkText}>Choose another method</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP: QRPh simulation */}
          {phase === 'qrph' && (
            <View style={[styles.panel, styles.centerPanel]}>
              <View style={styles.qrBox}>
                <Ionicons name="qr-code" size={110} color={COLORS.textPrimary} />
              </View>
              <Text style={styles.panelTitle}>Scan to pay with QRPh</Text>
              <Text style={styles.panelSub}>GCash, Maya, or any participating bank app</Text>
              <TouchableOpacity style={styles.payBtn} onPress={() => simulatePay('qrph')}>
                <Text style={styles.btnText}>Simulate Scan & Pay — {money(totals.total)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPhase('method')}>
                <Text style={styles.linkText}>Choose another method</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP: fake gateway processing */}
          {phase === 'processing' && (
            <View style={[styles.panel, styles.centerPanel]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.panelTitle}>Processing payment...</Text>
              <Text style={styles.panelSub}>Contacting the payment gateway</Text>
            </View>
          )}

          {/* STEP: cash - waiter collects then confirms with code */}
          {phase === 'cash' && (
            <View style={styles.panel}>
              <View style={styles.panelIconRow}>
                <View style={styles.panelIcon}>
                  <Ionicons name="walk" size={26} color={COLORS.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelTitle}>Waiter is on the way</Text>
                  <Text style={styles.panelSub}>
                    Please prepare {money(totals.total)} in cash. The waiter will
                    confirm below once the payment is received.
                  </Text>
                </View>
              </View>

              {staffCodeInput('Waiter: staff code to confirm cash...')}
              <TouchableOpacity
                style={[styles.approveBtn, busy && styles.disabled]}
                onPress={handleConfirmCash}
                disabled={busy}
              >
                {busy ? <ActivityIndicator size="small" color={COLORS.white} />
                      : <Text style={styles.btnText}>Confirm Cash Received</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPhase('method')} disabled={busy}>
                <Text style={styles.linkText}>Choose another method</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP: receipt */}
          {phase === 'done' && (
            <View style={[styles.panel, styles.centerPanel]}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={44} color={COLORS.white} />
              </View>
              <Text style={styles.panelTitle}>Payment successful!</Text>
              <Text style={styles.panelSub}>
                Paid {money(totals.total)} via{' '}
                {receipt?.method === 'qrph' ? 'QRPh' : receipt?.method === 'card' ? 'Card' : 'Cash'}
                {receipt?.confirmed_by ? ` (received by ${receipt.confirmed_by})` : ''}.
                {'\n'}Your order has been sent to the kitchen.
              </Text>
              <TouchableOpacity style={styles.payBtn} onPress={onDone}>
                <Text style={styles.btnText}>Track My Order</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, accent }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, accent && { color: COLORS.green }]}>{label}</Text>
      <Text style={[styles.rowValue, accent && { color: COLORS.green }]}>{value}</Text>
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 22,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  totalsCard: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: SIZES.cardRadius,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  panel: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: SIZES.cardRadius,
    padding: 18,
  },
  centerPanel: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 30,
  },
  panelIconRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  panelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  panelSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginTop: 3,
    textAlign: 'center',
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    letterSpacing: 4,
    color: COLORS.textPrimary,
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: COLORS.green,
    borderRadius: SIZES.borderRadius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  denyBtn: {
    flex: 1,
    backgroundColor: COLORS.red,
    borderRadius: SIZES.borderRadius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    paddingVertical: 13,
    paddingHorizontal: 26,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  methodCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: SIZES.cardRadius,
    paddingVertical: 22,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  methodNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
  qrBox: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 18,
    backgroundColor: COLORS.white,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  disabled: {
    opacity: 0.6,
  },
});
