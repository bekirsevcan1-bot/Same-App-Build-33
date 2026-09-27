import colors from '@/constants/colors';

// This app is dark-only. Always return the dark palette.
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
