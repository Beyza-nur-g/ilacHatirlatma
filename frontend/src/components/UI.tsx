import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, spacing, themePresets, typography } from '../theme';
import { useUIStore } from '../store/uiStore';

const useThemeColors = () => themePresets[useUIStore((state) => state.themeKey)].colors;

interface AppCardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  variant?: 'default' | 'outlined' | 'elevated';
}

export const AppCard: React.FC<AppCardProps> = ({ children, style, onPress, variant = 'default' }) => {
  const colors = useThemeColors();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
      shadowColor: colors.black,
    },
    variant === 'outlined' && { borderWidth: 1 },
    variant === 'elevated' && { elevation: 6 },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={cardStyle} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}) => {
  const colors = useThemeColors();

  const backgroundByVariant = {
    primary: colors.primary,
    secondary: colors.secondary,
    danger: colors.error,
    outline: colors.backgroundElevated,
    ghost: 'transparent',
  };

  const textColor = variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textOnPrimary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.button,
        { backgroundColor: backgroundByVariant[variant], borderColor: colors.primary },
        size === 'sm' && styles.buttonSm,
        size === 'lg' && styles.buttonLg,
        (variant === 'outline' || variant === 'ghost') && styles.buttonOutline,
        disabled && { opacity: 0.55 },
        fullWidth && { width: '100%' },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={textColor} style={{ marginRight: spacing.sm }} /> : null}
          <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  backgroundColor?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({ icon, onPress, size = 'md', color, backgroundColor }) => {
  const colors = useThemeColors();

  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  const buttonSize = size === 'sm' ? 34 : size === 'lg' ? 50 : 40;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.iconButton,
        {
          width: buttonSize,
          height: buttonSize,
          backgroundColor: backgroundColor ?? colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={color ?? colors.primary} />
    </TouchableOpacity>
  );
};

interface ChipProps {
  label: string;
  onPress?: () => void;
  variant?: 'filled' | 'outlined';
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onDelete?: () => void;
}

export const Chip: React.FC<ChipProps> = ({ label, onPress, variant = 'filled', color, icon, onDelete }) => {
  const colors = useThemeColors();
  const appliedColor = color ?? colors.primary;

  const content = (
    <>
      {icon ? <Ionicons name={icon} size={14} color={appliedColor} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.chipText, { color: appliedColor }]}>{label}</Text>
      {onDelete ? (
        <TouchableOpacity onPress={onDelete} style={{ marginLeft: 6 }}>
          <Ionicons name="close-circle" size={16} color={appliedColor} />
        </TouchableOpacity>
      ) : null}
    </>
  );

  const wrapperStyle = [
    styles.chip,
    variant === 'filled' && { backgroundColor: `${appliedColor}18` },
    variant === 'outlined' && { borderColor: appliedColor, borderWidth: 1 },
  ];

  return onPress ? (
    <TouchableOpacity onPress={onPress} style={wrapperStyle} activeOpacity={0.8}>
      {content}
    </TouchableOpacity>
  ) : (
    <View style={wrapperStyle}>{content}</View>
  );
};

export const EmptyState: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, description, actionLabel, onAction }) => {
  const colors = useThemeColors();

  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyStateIconContainer, { backgroundColor: colors.gray100 }]}>
        <Ionicons name={icon} size={58} color={colors.gray400} />
      </View>

      <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>{title}</Text>

      {description ? (
        <Text style={[styles.emptyStateDescription, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}

      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
};

export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}> = ({ title, subtitle, right }) => {
  const colors = useThemeColors();

  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>

      {right}
    </View>
  );
};

export const BottomSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ visible, onClose, title, children }) => {
  const colors = useThemeColors();

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.sheetKeyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Pressable style={styles.sheetOverlay} onPress={Keyboard.dismiss}>
          <Pressable
            style={[styles.sheetContent, { backgroundColor: colors.backgroundElevated }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <SectionHeader title={title} right={<IconButton icon="close" onPress={handleClose} />} />

            <ScrollView
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              nestedScrollEnabled
              automaticallyAdjustKeyboardInsets
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={styles.sheetScrollContent}
            >
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  button: {
    minHeight: 46,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  buttonSm: {
    minHeight: 38,
  },

  buttonLg: {
    minHeight: 54,
  },

  buttonOutline: {
    borderWidth: 1,
  },

  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  iconButton: {
    borderRadius: borderRadius.round,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chip: {
    minHeight: 30,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },

  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },

  emptyStateIconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyStateTitle: {
    ...typography.h4,
    textAlign: 'center',
  },

  emptyStateDescription: {
    ...typography.body2,
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  sectionTitle: {
    ...typography.h4,
  },

  sectionSubtitle: {
    ...typography.body2,
    marginTop: 2,
  },

  sheetKeyboardView: {
    flex: 1,
  },

  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.3)',
    justifyContent: 'flex-end',
  },

  sheetContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  sheetHandle: {
    width: 58,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  sheetScrollContent: {
    paddingBottom: spacing.xxl * 3,
  },
});
