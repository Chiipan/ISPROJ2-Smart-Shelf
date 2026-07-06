import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import MenuScreen from './src/screens/MenuScreen';
import CartScreen from './src/screens/CartScreen';
import OrderStatusScreen from './src/screens/OrderStatusScreen';
import CallWaiterScreen from './src/screens/CallWaiterScreen';
import WaiterDashboardScreen from './src/screens/WaiterDashboardScreen';
import TableBoardScreen from './src/screens/TableBoardScreen';
import KitchenScreen from './src/screens/KitchenScreen';
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

  const handleLogin = (nextSession) => {
    setActiveScreen(nextSession.kind === 'staff' ? 'tables' : 'menu');
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

  const handleOrderPlaced = () => {
    setCartItems([]);
    setActiveScreen('orders');
  };

  if (!session) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  // Staff layouts: kitchen gets its placeholder KDS, everyone else
  // (waiter, admin) gets the waiter dashboard (Tables + Tickets)
  if (session.kind === 'staff') {
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
            onOrderPlaced={handleOrderPlaced}
          />
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
