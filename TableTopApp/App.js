import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import MenuScreen from './src/screens/MenuScreen';
import CartScreen from './src/screens/CartScreen';
import OrderStatusScreen from './src/screens/OrderStatusScreen';
import CallWaiterScreen from './src/screens/CallWaiterScreen';
import Sidebar from './src/components/Sidebar';

export default function App() {
  const [table, setTable] = useState(null); // { table_id, table_name } after login
  const [activeScreen, setActiveScreen] = useState('menu');
  const [cartItems, setCartItems] = useState([]);

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

  if (!table) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLogin={setTable} />
      </>
    );
  }

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
        tableName={table.table_name}
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
