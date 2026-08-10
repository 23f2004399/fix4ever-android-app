import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../theme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
};

export function Input({
  label,
  error,
  containerStyle,
  labelStyle,
  style,
  placeholderTextColor,
  secureTextEntry,
  ...props
}: InputProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordInput = Boolean(secureTextEntry);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text
          style={[
            styles.label,
            { color: colors.foreground, marginBottom: spacing.xs },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: error
                ? colors.destructive
                : isFocused
                  ? colors.primary
                  : colors.border,
              color: colors.foreground,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              paddingRight: isPasswordInput ? 44 : spacing.md,
              borderRadius: borderRadius.md,
            },
            style,
          ]}
          placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPasswordInput && !showPassword}
          {...props}
        />
        {isPasswordInput && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(prev => !prev)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text
          style={[
            styles.error,
            { color: colors.destructive, marginTop: spacing.xs },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600' },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  input: { borderWidth: 1, fontSize: 16 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justify.content: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  error: { fontSize: 12 },
});

