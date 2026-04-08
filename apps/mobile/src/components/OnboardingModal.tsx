import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '⬡', iconColor: '#2f81f7',
    title: 'Welcome to PlayARM',
    body: 'A visual simulator for the ARM pipeline — see exactly how your code flows through Fetch → Decode → Execute → Memory → WriteBack.',
    detail: 'Used alongside your ARM architecture textbook to bring concepts to life.',
  },
  {
    icon: '▶', iconColor: '#22c55e',
    title: 'Write, Run, Step',
    body: 'Type ARM assembly in the editor and press Run. Use ⏭ Step to advance one cycle at a time, or ▶ Play to run automatically.',
    detail: 'Tap any line number to set a breakpoint — execution pauses when that line enters Execute.',
  },
  {
    icon: '◉', iconColor: '#a371f7',
    title: 'Explore & Learn',
    body: 'The Learn tab has pre-built programs from your textbook, guided exercises with instant feedback, and a full instruction reference.',
    detail: 'Your progress and programs are saved automatically.',
  },
];

interface OnboardingModalProps { visible: boolean; onDone: () => void }

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: { width: Math.min(width - 48, 360), backgroundColor: c.bg1, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 28, alignItems: 'center', gap: 14 },
    iconCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    icon: { fontSize: 28, fontWeight: '700' },
    title: { color: c.text, fontSize: 20, fontWeight: '900', textAlign: 'center', letterSpacing: 0.3 },
    body: { color: c.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
    detailBox: { backgroundColor: c.bg2, borderRadius: 8, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 10, width: '100%' },
    detail: { color: c.textDim, fontSize: 12, lineHeight: 18, textAlign: 'center' },
    dots: { flexDirection: 'row', gap: 6 },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.border },
    dotActive: { backgroundColor: c.accent, width: 18 },
    btnRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
    skipBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
    skipBtnText: { color: c.textDim, fontSize: 13, fontWeight: '600' },
    nextBtn: { flex: 2, paddingVertical: 12, borderRadius: 8, backgroundColor: c.accentBg, borderWidth: 1, borderColor: c.accentBorder, alignItems: 'center' },
    doneBtn: { backgroundColor: c.accent, borderColor: c.accent },
    nextBtnText: { color: c.accent, fontSize: 13, fontWeight: '800' },
    doneBtnText: { color: '#fff' },
  });
}

export default function OnboardingModal({ visible, onDone }: OnboardingModalProps) {
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [page, setPage] = useState(0);
  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: slide.iconColor + '20', borderColor: slide.iconColor + '40' }]}>
            <Text style={[styles.icon, { color: slide.iconColor }]}>{slide.icon}</Text>
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>
          <View style={styles.detailBox}>
            <Text style={styles.detail}>{slide.detail}</Text>
          </View>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.btnRow}>
            {!isLast && (
              <TouchableOpacity style={styles.skipBtn} onPress={onDone}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, isLast && styles.doneBtn]}
              onPress={() => isLast ? onDone() : setPage(p => p + 1)}
            >
              <Text style={[styles.nextBtnText, isLast && styles.doneBtnText]}>
                {isLast ? 'Get Started →' : 'Next →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
