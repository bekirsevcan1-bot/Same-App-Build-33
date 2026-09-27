import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Category } from '@/constants/categories';

interface Props {
  category: Category;
  selected?: boolean;
  onPress: () => void;
  size?: 'sm' | 'lg';
}

export function CategoryItem({ category, selected = false, onPress, size = 'lg' }: Props) {
  const colors = useColors();
  const isLg = size === 'lg';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.container,
        isLg ? styles.containerLg : styles.containerSm,
        {
          backgroundColor: selected ? category.color + '22' : colors.card,
          borderColor: selected ? category.color : colors.border,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          isLg ? styles.iconWrapLg : styles.iconWrapSm,
          { backgroundColor: selected ? category.color + '33' : category.bgColor },
        ]}
      >
        <Feather
          name={category.icon as any}
          size={isLg ? 22 : 16}
          color={category.color}
        />
      </View>
      <Text
        style={[
          styles.label,
          isLg ? styles.labelLg : styles.labelSm,
          { color: selected ? category.color : colors.foreground },
        ]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  containerLg: {
    width: 80,
    height: 80,
    gap: 6,
    padding: 8,
  },
  containerSm: {
    width: 64,
    height: 64,
    gap: 4,
    padding: 6,
  },
  iconWrap: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapLg: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  iconWrapSm: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  labelLg: {
    fontSize: 11,
  },
  labelSm: {
    fontSize: 9,
  },
});
