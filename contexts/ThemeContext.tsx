import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTokens, lightTokens, ThemeMode, ThemeTokens } from '@/constants/theme';

const STORAGE_KEY = 'gow_theme_mode';

interface ThemeContextType {
  /** Tokens resueltos para el tema activo — usar en style={{ color: T.textPrimary }} */
  T: ThemeTokens;
  /** Tema efectivo en pantalla */
  activeTheme: 'dark' | 'light';
  /** Preferencia del usuario: 'auto' sigue el dispositivo */
  themeMode: ThemeMode;
  /** Cambiar preferencia del usuario y persistirla */
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // useColorScheme es el hook nativo de RN — más confiable que Appearance.getColorScheme()
  // en Android. Retorna 'dark' | 'light' | null. null = desconocido → usamos 'light'.
  const deviceScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isHydrated, setIsHydrated] = useState(false);

  // Cargar preferencia persistida al arrancar
  useEffect(() => {
    let mounted = true;

    const hydrateTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && (stored === 'dark' || stored === 'light' || stored === 'auto')) {
          setThemeModeState(stored);
        }
      } catch {
        // Si el almacenamiento no está disponible, se conserva el modo auto.
      } finally {
        if (mounted) setIsHydrated(true);
      }
    };

    hydrateTheme();
    return () => { mounted = false; };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(STORAGE_KEY, mode);
  }, []);

  // Resolver el tema activo
  let activeTheme: 'dark' | 'light';
  if (themeMode === 'dark') {
    activeTheme = 'dark';
  } else if (themeMode === 'light') {
    activeTheme = 'light';
  } else {
    // 'auto': seguir el dispositivo. null → light (no sabemos → asumimos claro)
    activeTheme = deviceScheme === 'dark' ? 'dark' : 'light';
  }

  const T = activeTheme === 'dark' ? darkTokens : lightTokens;

  // La splash sigue visible desde RootLayout hasta que se monta la navegación.
  // Esperar aquí evita mostrar un frame con el tema del dispositivo antes de
  // aplicar una preferencia guardada distinta.
  if (!isHydrated) return null;

  return (
    <ThemeContext.Provider value={{ T, activeTheme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
