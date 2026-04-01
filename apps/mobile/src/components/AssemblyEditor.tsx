import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import type { ParseError } from '@playarm/core';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AssemblyEditorProps {
  code: string;
  errors: ParseError[];
  onRun: (code: string) => void;
}

export default function AssemblyEditor({ code, errors, onRun }: AssemblyEditorProps) {
  const [draft, setDraft] = useState(code);
  const [open, setOpen] = useState(true);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };

  const handleRun = () => {
    onRun(draft);
  };

  const errorCount = errors.length;

  return (
    <View style={styles.container}>
      {/* Header row */}
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Assembly Editor</Text>
          {errorCount > 0 && (
            <View style={styles.errorBadge}>
              <Text style={styles.errorBadgeText}>{errorCount} error{errorCount > 1 ? 's' : ''}</Text>
            </View>
          )}
          {errorCount === 0 && draft.trim().length > 0 && (
            <View style={styles.okBadge}>
              <Text style={styles.okBadgeText}>OK</Text>
            </View>
          )}
        </View>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            placeholder="Enter ARM assembly here..."
            placeholderTextColor="#484f58"
            textAlignVertical="top"
            scrollEnabled
          />

          {/* Errors */}
          {errors.map((err, i) => (
            <View key={i} style={styles.errorRow}>
              <Text style={styles.errorText}>
                Line {err.line}: {err.message}
              </Text>
            </View>
          ))}

          {/* Run button */}
          <TouchableOpacity style={styles.runBtn} onPress={handleRun} activeOpacity={0.8}>
            <Text style={styles.runBtnText}>▶  Run</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161b22',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0d1117',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#f0f6fc',
    fontWeight: 'bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chevron: {
    color: '#8b949e',
    fontSize: 10,
  },
  errorBadge: {
    backgroundColor: 'rgba(248,81,73,0.15)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(248,81,73,0.4)',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  errorBadgeText: {
    color: '#f85149',
    fontSize: 11,
    fontWeight: '600',
  },
  okBadge: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  okBadgeText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    padding: 12,
    gap: 8,
  },
  input: {
    backgroundColor: '#0d1117',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
    color: '#e6edf3',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
    padding: 10,
    minHeight: 140,
    maxHeight: 220,
  },
  errorRow: {
    backgroundColor: 'rgba(248,81,73,0.08)',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#f85149',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  errorText: {
    color: '#f85149',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  runBtn: {
    backgroundColor: 'rgba(47,129,247,0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(47,129,247,0.4)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  runBtnText: {
    color: '#2f81f7',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
