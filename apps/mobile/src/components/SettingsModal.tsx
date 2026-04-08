import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Switch, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

const SETTINGS_KEY = 'playarm_settings';

export interface AppSettings {
  defaultFormat: 'hex' | 'dec' | 'bin';
  defaultSpeed: 'slow' | 'normal' | 'fast';
  hapticsEnabled: boolean;
  editorFontSize: 12 | 13 | 15;
  showOnboarding: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultFormat: 'hex', defaultSpeed: 'normal', hapticsEnabled: true,
  editorFontSize: 13, showOnboarding: true,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s)).catch(() => {});
}

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: { backgroundColor: c.bg1, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderColor: c.border, maxHeight: '80%' },
    sheetHandle: { width: 36, height: 4, backgroundColor: c.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.borderSubtle },
    sheetTitle: { color: c.text, fontSize: 16, fontWeight: '800' },
    closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.bg3, alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { color: c.textMuted, fontSize: 12 },
    content: { padding: 20, gap: 20, paddingBottom: 40 },
    group: { gap: 8 },
    groupLabel: { color: c.textDim, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    groupBody: { backgroundColor: c.bg2, borderRadius: 10, borderWidth: 1, borderColor: c.border, padding: 12, gap: 8 },
    segmented: { flexDirection: 'row', backgroundColor: c.bg1, borderRadius: 7, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
    segBtnActive: { backgroundColor: c.accentBg },
    segBtnText: { color: c.textDim, fontSize: 12, fontWeight: '700' },
    segBtnTextActive: { color: c.accent },
    settingHint: { color: c.textDim, fontSize: 11 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    switchLabel: { color: c.textBody, fontSize: 13, fontWeight: '600' },
    resetBtn: { paddingVertical: 8, alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg1 },
    resetBtnText: { color: c.accent, fontSize: 12, fontWeight: '600' },
    appInfo: { alignItems: 'center', gap: 2, paddingTop: 8 },
    appInfoText: { color: c.border, fontSize: 11 },
    appInfoVersion: { color: c.borderSubtle, fontSize: 10, fontFamily: 'monospace' },
  });
}

interface SettingsModalProps {
  visible: boolean; onClose: () => void; settings: AppSettings; onSettingsChange: (s: AppSettings) => void;
}

export default function SettingsModal({ visible, onClose, settings, onSettingsChange }: SettingsModalProps) {
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const next = { ...settings, [key]: value };
    onSettingsChange(next);
    saveSettings(next);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Settings</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <SettingGroup label="DEFAULT NUMBER FORMAT" styles={styles}>
            <View style={styles.segmented}>
              {(['hex', 'dec', 'bin'] as const).map(f => (
                <TouchableOpacity key={f} style={[styles.segBtn, settings.defaultFormat === f && styles.segBtnActive]} onPress={() => update('defaultFormat', f)}>
                  <Text style={[styles.segBtnText, settings.defaultFormat === f && styles.segBtnTextActive]}>{f.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.settingHint}>
              {settings.defaultFormat === 'hex' ? 'Values shown as 0xFF' : settings.defaultFormat === 'dec' ? 'Values shown as 255' : 'Values shown as 11111111 (32 bits)'}
            </Text>
          </SettingGroup>

          <SettingGroup label="DEFAULT PLAYBACK SPEED" styles={styles}>
            <View style={styles.segmented}>
              {([{ key: 'slow', label: '🐢 Slow' }, { key: 'normal', label: '▷ Normal' }, { key: 'fast', label: '⚡ Fast' }] as const).map(s => (
                <TouchableOpacity key={s.key} style={[styles.segBtn, settings.defaultSpeed === s.key && styles.segBtnActive]} onPress={() => update('defaultSpeed', s.key)}>
                  <Text style={[styles.segBtnText, settings.defaultSpeed === s.key && styles.segBtnTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingGroup>

          <SettingGroup label="EDITOR FONT SIZE" styles={styles}>
            <View style={styles.segmented}>
              {([12, 13, 15] as const).map(sz => (
                <TouchableOpacity key={sz} style={[styles.segBtn, settings.editorFontSize === sz && styles.segBtnActive]} onPress={() => update('editorFontSize', sz)}>
                  <Text style={[styles.segBtnText, settings.editorFontSize === sz && styles.segBtnTextActive]}>{sz}px</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.settingHint}>Controls assembly editor font size</Text>
          </SettingGroup>

          <SettingGroup label="HAPTIC FEEDBACK" styles={styles}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{settings.hapticsEnabled ? 'Enabled' : 'Disabled'}</Text>
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={v => update('hapticsEnabled', v)}
                trackColor={{ false: c.border, true: c.accentBorder }}
                thumbColor={settings.hapticsEnabled ? c.accent : c.textDim}
              />
            </View>
            <Text style={styles.settingHint}>Light vibration on step · success pulse on exercise complete</Text>
          </SettingGroup>

          <SettingGroup label="ONBOARDING" styles={styles}>
            <TouchableOpacity style={styles.resetBtn} onPress={() => update('showOnboarding', true)}>
              <Text style={styles.resetBtnText}>Show intro tutorial again</Text>
            </TouchableOpacity>
          </SettingGroup>

          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>PlayARM · ARM Pipeline Simulator</Text>
            <Text style={styles.appInfoVersion}>v1.0.0</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function SettingGroup({ label, children, styles }: { label: string; children: React.ReactNode; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}
