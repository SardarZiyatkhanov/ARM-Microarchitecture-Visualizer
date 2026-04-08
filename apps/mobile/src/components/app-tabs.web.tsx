import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <WebNavBar>
          <TabTrigger name="home" href="/" asChild>
            <NavTab>Simulator</NavTab>
          </TabTrigger>
          <TabTrigger name="learn" href="/explore" asChild>
            <NavTab>Learn</NavTab>
          </TabTrigger>
        </WebNavBar>
      </TabList>
    </Tabs>
  );
}

function NavTab({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.navTab, isFocused && styles.navTabActive]}>
        <Text style={[styles.navTabText, isFocused && styles.navTabTextActive]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

function WebNavBar(props: TabListProps) {
  return (
    <View style={styles.navBar}>
      <View style={styles.navInner}>
        {/* Brand */}
        <Text style={styles.brand}>PlayARM</Text>

        {/* Tab buttons */}
        <View style={styles.tabs}>
          {props.children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0d1117',
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    zIndex: 100,
  },
  navInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 0,
    height: 48,
    gap: 8,
  },
  brand: {
    color: '#f0f6fc',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginRight: 'auto',
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
  },
  navTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navTabActive: {
    backgroundColor: 'rgba(47,129,247,0.12)',
    borderColor: 'rgba(47,129,247,0.3)',
  },
  navTabText: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: '600',
  },
  navTabTextActive: {
    color: '#2f81f7',
  },
  pressed: {
    opacity: 0.7,
  },
});
