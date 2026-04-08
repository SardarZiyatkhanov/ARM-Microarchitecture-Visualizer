import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const REGISTER_ROWS = [
  { reg: 'R0',       role: 'Argument 1 / Return value',       preserved: 'caller' },
  { reg: 'R1',       role: 'Argument 2',                      preserved: 'caller' },
  { reg: 'R2',       role: 'Argument 3',                      preserved: 'caller' },
  { reg: 'R3',       role: 'Argument 4',                      preserved: 'caller' },
  { reg: 'R4–R11',   role: 'General purpose (callee-saved)',  preserved: 'callee' },
  { reg: 'R12 (IP)', role: 'Intra-procedure scratch',         preserved: 'none' },
  { reg: 'SP (R13)', role: 'Stack pointer',                   preserved: 'callee' },
  { reg: 'LR (R14)', role: 'Link register (return address)',  preserved: 'callee' },
  { reg: 'PC (R15)', role: 'Program counter',                 preserved: 'na' },
];

const CALL_STEPS = [
  { label: 'Caller', text: 'Place args in R0–R3' },
  { label: 'Caller', text: 'Execute BL label → PC = label, LR = return addr' },
  { label: 'Callee', text: 'Prologue: PUSH {LR} (save callee regs if used)' },
  { label: 'Callee', text: 'Execute body, put return value in R0' },
  { label: 'Callee', text: 'Epilogue: POP {LR}' },
  { label: 'Callee', text: 'BX LR → PC = LR (return to caller)' },
  { label: 'Caller', text: 'Read return value from R0' },
];

const PRESERVED_COLOR: Record<string, string> = {
  caller: '#f97316',
  callee: '#22c55e',
  none:   '#484f58',
  na:     '#484f58',
};

const PRESERVED_LABEL: Record<string, string> = {
  caller: 'caller-saved',
  callee: 'callee-saved',
  none:   'not preserved',
  na:     '—',
};

const STEP_COLOR: Record<string, string> = {
  Caller: '#2f81f7',
  Callee: '#22c55e',
};

export default function CallingConventionViz() {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>ARM Calling Convention</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Register roles */}
        <Text style={styles.sectionTitle}>Register Roles</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: 70 }]}>Reg</Text>
            <Text style={[styles.th, { flex: 1 }]}>Role</Text>
            <Text style={[styles.th, { width: 90 }]}>Preserved?</Text>
          </View>
          {REGISTER_ROWS.map((row) => (
            <View key={row.reg} style={styles.tableRow}>
              <Text style={[styles.regCell, { width: 70 }]}>{row.reg}</Text>
              <Text style={[styles.roleCell, { flex: 1 }]}>{row.role}</Text>
              <Text style={[styles.preservedCell, { width: 90, color: PRESERVED_COLOR[row.preserved] }]}>
                {PRESERVED_LABEL[row.preserved]}
              </Text>
            </View>
          ))}
        </View>

        {/* Call sequence */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Call Sequence</Text>
        <View style={styles.timeline}>
          {CALL_STEPS.map((step, i) => (
            <View key={i} style={styles.timelineStep}>
              <View style={styles.stepLeft}>
                <View style={[styles.stepDot, { backgroundColor: STEP_COLOR[step.label] }]} />
                {i < CALL_STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepRight}>
                <Text style={[styles.stepLabel, { color: STEP_COLOR[step.label] }]}>{step.label}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161b22',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
    overflow: 'hidden',
  },
  titleRow: {
    backgroundColor: '#0d1117',
    borderBottomWidth: 1,
    borderColor: '#30363d',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    color: '#f0f6fc',
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, gap: 8 },
  sectionTitle: {
    color: '#8b949e',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Table
  table: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0a0c10',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
    gap: 8,
  },
  th: {
    color: '#484f58',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 8,
    alignItems: 'flex-start',
  },
  regCell: {
    color: '#79c0ff',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  roleCell: {
    color: '#c9d1d9',
    fontSize: 11,
    lineHeight: 15,
  },
  preservedCell: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
  },

  // Timeline
  timeline: { gap: 0 },
  timelineStep: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 40,
  },
  stepLeft: {
    alignItems: 'center',
    width: 14,
    paddingTop: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#21262d',
    marginTop: 2,
  },
  stepRight: {
    flex: 1,
    paddingBottom: 10,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  stepText: {
    color: '#c9d1d9',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
});
