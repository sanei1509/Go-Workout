import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:         '#090f12',
  card:       '#141c1f',
  border:     '#3c494e',
  primary:    '#00D1FF',
  primaryDim: '#00566a',
  neutral:    '#71787B',
  textHi:     '#dde3e7',
  textLo:     '#859399',
  danger:     '#ff6b6b',
  dangerBg:   '#2a0f0f',
};

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
      <Modal
        visible={state.visible}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
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
                    onPress={() => handlePress(btn)}
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
    </AlertContext.Provider>
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

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    color: C.textHi,
    fontSize: 17,
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: C.neutral,
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
    backgroundColor: C.primaryDim,
    borderWidth: 1,
    borderColor: C.primary + '40',
  },
  btnDestructive: {
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.danger + '40',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.border,
  },
  btnText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  btnTextDefault: {
    color: C.primary,
  },
  btnTextDestructive: {
    color: C.danger,
  },
  btnTextCancel: {
    color: C.neutral,
  },
});
