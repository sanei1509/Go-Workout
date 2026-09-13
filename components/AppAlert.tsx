import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'cancel' | 'destructive' | 'default';
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface AlertContextValue {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AlertContext = createContext<AlertContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: [],
  });

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[]) => {
      setState({
        visible: true,
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
      });
    },
    []
  );

  const dismiss = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  const handlePress = useCallback(
    (btn: AlertButton) => {
      dismiss();
      btn.onPress?.();
    },
    [dismiss]
  );

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AlertModal
        state={state}
        onDismiss={dismiss}
        onPress={handlePress}
      />
    </AlertContext.Provider>
  );
}

function AlertModal({
  state,
  onDismiss,
  onPress,
}: {
  state: AlertState;
  onDismiss: () => void;
  onPress: (btn: AlertButton) => void;
}) {
  const { T, activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const s = useMemo(() => createStyles(T, isDark), [T, isDark]);

  return (
    <Modal
      visible={state.visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>{state.title}</Text>
          {state.message ? (
            <Text style={s.message}>{state.message}</Text>
          ) : null}

          <View style={[s.buttonsRow, state.buttons.length > 2 && s.buttonsCol]}>
            {state.buttons.map((btn, idx) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => onPress(btn)}
                  activeOpacity={0.8}
                  style={[
                    s.btn,
                    state.buttons.length === 1 && s.btnFull,
                    state.buttons.length > 2 && s.btnFullWidth,
                    isDestructive && s.btnDestructive,
                    isCancel && s.btnCancel,
                    !isDestructive && !isCancel && s.btnDefault,
                  ]}
                >
                  <Text
                    style={[
                      s.btnText,
                      isDestructive && s.btnTextDestructive,
                      isCancel && s.btnTextCancel,
                      !isDestructive && !isCancel && s.btnTextDefault,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return ctx;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(T: ThemeTokens, isDark: boolean) {
  const danger = isDark ? '#ff6b6b' : '#dc2626';
  const dangerBg = isDark ? '#2a0f0f' : '#fef2f2';
  const dangerBorder = isDark ? 'rgba(255,107,107,0.25)' : 'rgba(220,38,38,0.25)';

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: T.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    card: {
      width: '100%',
      backgroundColor: T.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: T.border,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 20,
    },
    title: {
      color: T.textPrimary,
      fontSize: 17,
      fontFamily: 'SpaceGrotesk_700Bold',
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      color: T.textSecondary,
      fontSize: 14,
      fontFamily: 'SpaceGrotesk_400Regular',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    buttonsCol: {
      flexDirection: 'column',
    },
    btn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnFull: {
      flex: 1,
    },
    btnFullWidth: {
      flex: undefined,
      width: '100%',
      marginBottom: 6,
    },
    btnDefault: {
      backgroundColor: T.action,
      borderWidth: 1,
      borderColor: T.border,
    },
    btnDestructive: {
      backgroundColor: dangerBg,
      borderWidth: 1,
      borderColor: dangerBorder,
    },
    btnCancel: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: T.border,
    },
    btnText: {
      fontSize: 13,
      fontFamily: 'SpaceGrotesk_700Bold',
      letterSpacing: 0.5,
    },
    btnTextDefault: {
      color: T.actionFg,
    },
    btnTextDestructive: {
      color: danger,
    },
    btnTextCancel: {
      color: T.textSecondary,
    },
  });
}
