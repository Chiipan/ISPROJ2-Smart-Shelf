import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';
import { loginTable, loginStaff, loginMember, registerMember } from '../api/client';

const TABS = [
  { id: 'customer', label: 'Customer', icon: 'restaurant-outline' },
  { id: 'waiter',   label: 'Waiter',   icon: 'walk-outline' },
  { id: 'kitchen',  label: 'Kitchen',  icon: 'flame-outline' },
];

const STAFF_ROLES = ['waiter', 'kitchen', 'admin'];

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('customer'); // customer | waiter | kitchen
  // Customer sub-steps: 'table' (tablet credentials) -> 'dine' (guest or member)
  const [step, setStep] = useState('table');
  const [table, setTable] = useState(null); // set after the tablet logs in
  const [showRegister, setShowRegister] = useState(false);

  const [tableName, setTableName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setStep('table');
    setTable(null);
    setShowRegister(false);
    setError('');
    setPassword('');
  };

  const run = async (fn) => {
    setError('');
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(e.message || 'Something went wrong — is the server running?');
    } finally {
      setLoading(false);
    }
  };

  /* Step 1 (customer): the tablet logs in as its table */
  const handleTableLogin = () => {
    if (!tableName.trim() || !password) {
      setError('Table name and password are required');
      return;
    }
    run(async () => {
      const t = await loginTable(tableName.trim(), password);
      setTable(t);
      setPassword('');
      setEmail('');
      setStep('dine');
    });
  };

  /* Step 2 (customer): guest, member sign-in, or member registration */
  const handleGuest = () => onLogin({ kind: 'table', ...table, member: null });

  const handleMemberLogin = () => {
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    run(async () => {
      const member = await loginMember(email.trim(), password);
      onLogin({ kind: 'table', ...table, member });
    });
  };

  const handleRegister = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('All fields are required');
      return;
    }
    run(async () => {
      await registerMember({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
      });
      const member = await loginMember(email.trim(), password);
      onLogin({ kind: 'table', ...table, member });
    });
  };

  /* Waiter / Kitchen tabs: staff account login */
  const handleStaffLogin = () => {
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    run(async () => {
      const staff = await loginStaff(email.trim(), password);
      if (!STAFF_ROLES.includes(staff.role)) {
        throw new Error('This account is not a staff account');
      }
      onLogin({ kind: 'staff', ...staff });
    });
  };

  const passwordField = (
    <>
      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Input password..."
          placeholderTextColor={COLORS.grayMedium}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={COLORS.grayDark}
          />
        </TouchableOpacity>
      </View>
    </>
  );

  const primaryButton = (label, onPress) => (
    <TouchableOpacity
      style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator color={COLORS.white} />
        : <Text style={styles.loginBtnText}>{label}</Text>}
    </TouchableOpacity>
  );

  const renderCustomer = () => {
    if (step === 'table') {
      return (
        <>
          <Text style={styles.title}>Table Login</Text>
          <Text style={styles.subtitle}>Login in the table...</Text>

          <Text style={styles.label}>Table Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Input table name..."
            placeholderTextColor={COLORS.grayMedium}
            value={tableName}
            onChangeText={setTableName}
          />
          {passwordField}
          <View style={{ height: 18 }} />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {primaryButton('Continue', handleTableLogin)}
        </>
      );
    }

    // step === 'dine'
    if (showRegister) {
      return (
        <>
          <Text style={styles.title}>Become a Member</Text>
          <Text style={styles.subtitle}>
            Earn points and get promos on future visits — {table?.table_name}
          </Text>

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Input first name..."
            placeholderTextColor={COLORS.grayMedium}
            value={firstName}
            onChangeText={setFirstName}
          />
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Input last name..."
            placeholderTextColor={COLORS.grayMedium}
            value={lastName}
            onChangeText={setLastName}
          />
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Input email..."
            placeholderTextColor={COLORS.grayMedium}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {passwordField}
          <View style={{ height: 18 }} />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {primaryButton('Create Account & Dine', handleRegister)}
          <TouchableOpacity style={styles.linkRow} onPress={() => { setShowRegister(false); setError(''); }}>
            <Text style={styles.linkText}>Already a member? Sign in</Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <Text style={styles.title}>Welcome to {table?.table_name}!</Text>
        <Text style={styles.subtitle}>How would you like to dine today?</Text>

        <TouchableOpacity
          style={[styles.guestBtn, loading && styles.loginBtnDisabled]}
          onPress={handleGuest}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Ionicons name="person-outline" size={17} color={COLORS.white} />
          <Text style={styles.loginBtnText}>Dine as Guest</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign in as a member</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Input email..."
          placeholderTextColor={COLORS.grayMedium}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {passwordField}
        <View style={{ height: 18 }} />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.memberBtn, loading && styles.loginBtnDisabled]}
          onPress={handleMemberLogin}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={COLORS.primary} />
            : <Text style={styles.memberBtnText}>Sign in as Member</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => { setShowRegister(true); setError(''); }}>
          <Text style={styles.linkText}>New here? Register for points & promos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => switchMode('customer')}>
          <Text style={styles.backText}>← Different table</Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderStaff = (roleLabel) => (
    <>
      <Text style={styles.title}>{roleLabel} Login</Text>
      <Text style={styles.subtitle}>Login with your staff account...</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Input email..."
        placeholderTextColor={COLORS.grayMedium}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {passwordField}

      <TouchableOpacity style={styles.forgotRow}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {primaryButton('Login', handleStaffLogin)}
    </>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {/* Logo row */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Ionicons name="restaurant" size={18} color={COLORS.white} />
          </View>
          <Text style={styles.logoText}>TableTop</Text>
        </View>

        {/* Customer / Waiter / Kitchen tabs - hidden once a table is logged
            in: from there it's the customer-facing guest/member screen */}
        {step === 'table' && (
          <View style={styles.tabsRow}>
            {TABS.map((tab) => {
              const active = mode === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => switchMode(tab.id)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={15}
                    color={active ? COLORS.white : COLORS.textSecondary}
                  />
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {mode === 'customer' && renderCustomer()}
        {mode === 'waiter' && renderStaff('Waiter')}
        {mode === 'kitchen' && renderStaff('Kitchen')}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 32,
    width: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F1F1',
    borderRadius: SIZES.borderRadius,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: SIZES.borderRadius,
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  eyeBtn: {
    paddingHorizontal: 12,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 22,
    marginTop: 8,
  },
  forgotText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    paddingVertical: 13,
    alignItems: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    paddingVertical: 13,
  },
  memberBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  memberBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  linkRow: {
    alignItems: 'center',
    marginTop: 14,
  },
  linkText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  backText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
