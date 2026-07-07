import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import MenuScreen from './src/screens/MenuScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrderStatusScreen from './src/screens/OrderStatusScreen';
import CallWaiterScreen from './src/screens/CallWaiterScreen';
import WaiterDashboardScreen from './src/screens/WaiterDashboardScreen';
import TableBoardScreen from './src/screens/TableBoardScreen';
import KitchenScreen from './src/screens/KitchenScreen';
import AdminSalesScreen from './src/screens/AdminSalesScreen';
import AdminInventoryScreen from './src/screens/AdminInventoryScreen';
import AdminTablesScreen from './src/screens/AdminTablesScreen';
import Sidebar from './src/components/Sidebar';
import WaiterSidebar from './src/components/WaiterSidebar';
import { logout } from './src/api/client';

export default function App() {
  // null before login, then either
  //   { kind: 'table', table_id, table_name, member } - customer tablet
  //   { kind: 'staff', user_id, name, role }          - waiter/kitchen staff
  const [session, setSession] = useState(null);
  const [activeScreen, setActiveScreen] = useState('menu');
  const [cartItems, setCartItems] = useState([]);
  // The 'pending_payment' order being paid on the checkout screen
  const [checkout, setCheckout] = useState(null);

  const handleLogin = (nextSession) => {
    const initial =
      nextSession.kind !== 'staff' ? 'menu'
      : nextSession.role === 'admin' ? 'sales'
      : nextSession.role === 'kitchen' ? 'kds'
      : 'tables';
    setActiveScreen(initial);
    setSession(nextSession);
  };

  const handleLogout = () => {
    logout();
    setCartItems([]);
    setSession(null);
  };

  const addToCart = (item) => {
    setCartItems(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(c => c.id !== id));
  };

  const updateQty = (id, delta) => {
    setCartItems(prev =>
      prev.map(c =>
        c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c
      )
    );
  };

  // Cart -> checkout: the order now exists as 'pending_payment'
  const handleCheckoutStarted = (order) => {
    setCheckout(order);
    setActiveScreen('checkout');
  };

  // Payment done: order fired to the kitchen, cart empties
  const handlePaid = () => {
    setCheckout(null);
    setCartItems([]);
    setActiveScreen('orders');
  };

  // Checkout abandoned (order cancelled server-side); cart is kept
  const handleCheckoutCancelled = () => {
    setCheckout(null);
    setActiveScreen('cart');
  };

  if (!session) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  // Staff layouts: admin gets the owner dashboard, kitchen its placeholder
  // KDS, everyone else (waiter) the waiter dashboard (Tables + Tickets)
  if (session.kind === 'staff') {
    if (session.role === 'admin') {
      const adminScreens = {
        sales: <AdminSalesScreen />,
        inventory: <AdminInventoryScreen />,
        admintables: <AdminTablesScreen />,
      };
      return (
        <View style={styles.root}>
          <StatusBar style="light" />
          <WaiterSidebar
            activeScreen={activeScreen}
            onNavigate={setActiveScreen}
            waiterName={session.name}
            onLogout={handleLogout}
            roleLabel="Admin"
            navItems={[
              { id: 'sales',       label: 'Sales',     icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
              { id: 'inventory',   label: 'Inventory', icon: 'cube-outline',      activeIcon: 'cube' },
              { id: 'admintables', label: 'Tables',    icon: 'grid-outline',      activeIcon: 'grid' },
            ]}
          />
          <View style={styles.content}>
            {adminScreens[activeScreen] || <AdminSalesScreen />}
          </View>
        </View>
      );
    }

    if (session.role === 'kitchen') {
      return (
        <View style={styles.root}>
          <StatusBar style="light" />
          <WaiterSidebar
            activeScreen="kds"
            onNavigate={() => {}}
            waiterName={session.name}
            onLogout={handleLogout}
            roleLabel="Kitchen"
            navItems={[{ id: 'kds', label: 'Kitchen', icon: 'flame-outline', activeIcon: 'flame' }]}
          />
          <View style={styles.content}>
            <KitchenScreen />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <WaiterSidebar
          activeScreen={activeScreen}
          onNavigate={setActiveScreen}
          waiterName={session.name}
          onLogout={handleLogout}
        />
        <View style={styles.content}>
          {activeScreen === 'tickets' ? <WaiterDashboardScreen /> : <TableBoardScreen />}
        </View>
      </View>
    );
  }

  // Customer tablet layout
  const renderScreen = () => {
    switch (activeScreen) {
      case 'menu':
        return <MenuScreen onAddToCart={addToCart} />;
      case 'cart':
        return (
          <CartScreen
            cartItems={cartItems}
            onRemove={removeFromCart}
            onUpdateQty={updateQty}
            onNavigate={setActiveScreen}
            onCheckout={handleCheckoutStarted}
          />
        );
      case 'checkout':
        return checkout ? (
          <CheckoutScreen
            order={checkout}
            onDone={handlePaid}
            onCancel={handleCheckoutCancelled}
          />
        ) : (
          <MenuScreen onAddToCart={addToCart} />
        );
      case 'orders':
        return <OrderStatusScreen onNavigate={setActiveScreen} />;
      case 'waiter':
        return <CallWaiterScreen />;
      default:
        return <MenuScreen onAddToCart={addToCart} />;
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Sidebar
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        tableName={session.table_name}
        memberName={session.member?.name}
        cartCount={cartItems.reduce((n, c) => n + c.quantity, 0)}
      />
      <View style={styles.content}>{renderScreen()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F7F7F7',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
});
