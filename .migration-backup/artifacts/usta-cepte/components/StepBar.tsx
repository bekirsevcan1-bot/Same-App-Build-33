import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  currentStep: number; // 1-indexed
  totalSteps: number;
  labels: string[];
}

export function StepBar({ currentStep, totalSteps, labels }: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.labelsRow}>
        {labels.map((label, i) => (
          <Text
            key={i}
            style={[
              styles.label,
              {
                color: i + 1 === currentStep ? colors.foreground : colors.mutedForeground,
                fontFamily: i + 1 === currentStep ? 'Inter_600SemiBold' : 'Inter_400Regular',
              },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
      <View style={[styles.track, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: colors.primary,
              width: `${(currentStep / totalSteps) * 100}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.counter, { color: colors.mutedForeground }]}>
        {currentStep}/{totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
  },
  track: {
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  counter: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textAlign: 'right',
  },
});
