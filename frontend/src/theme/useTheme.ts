import { themePresets } from './index';
import { useUIStore } from '../store/uiStore';

export const useAppTheme = () => {
  const themeKey = useUIStore((state) => state.themeKey);
  return themePresets[themeKey];
};

export const useThemeColors = () => useAppTheme().colors;
