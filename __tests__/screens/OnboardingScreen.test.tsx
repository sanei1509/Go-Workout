/**
 * Tests para la pantalla de Onboarding/Selección de Rol (app/onboarding/page.tsx)
 *
 * Casos cubiertos:
 * - Renderizado de opciones de rol
 * - Selección de rol STUDENT
 * - Selección de rol TRAINER
 * - Llamada a profileService.upsertProfile
 * - Navegación condicional según rol
 * - Manejo de errores al guardar perfil
 * - Redirección a login si no hay usuario
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingPage from '@/app/onboarding/page';

// Mock de next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock de Supabase client
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: jest.fn(() => ({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  }),
}));

// Mock de profileService
const mockUpsertProfile = jest.fn();

jest.mock('@/lib/services/profileService', () => ({
  upsertProfile: (...args: unknown[]) => mockUpsertProfile(...args),
}));

const mockUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
};

describe('OnboardingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockUpsertProfile.mockResolvedValue({ error: null });
  });

  describe('Renderizado inicial', () => {
    it('muestra estado de carga mientras obtiene usuario', async () => {
      mockGetUser.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<OnboardingPage />);

      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('renderiza las opciones de rol correctamente', async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText('Go Workout')).toBeInTheDocument();
        expect(screen.getByText('¿Cuál es tu rol?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /soy alumno/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /soy entrenador/i })).toBeInTheDocument();
      });
    });

    it('muestra mensaje informativo sobre cambio de rol', async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText(/podés cambiar esto más adelante/i)).toBeInTheDocument();
      });
    });
  });

  describe('Redirección sin usuario', () => {
    it('redirige a /login si no hay usuario autenticado', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      render(<OnboardingPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Selección de rol STUDENT', () => {
    it('guarda perfil con rol STUDENT y navega a /app/student', async () => {
      render(<OnboardingPage />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /soy alumno/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /soy alumno/i }));

      await waitFor(() => {
        expect(mockUpsertProfile).toHaveBeenCalledWith({
          id: 'test-user-id-123',
          email: 'test@example.com',
          role: 'STUDENT',
        });
        expect(mockPush).toHaveBeenCalledWith('/app/student');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Selección de rol TRAINER', () => {
    it('guarda perfil con rol TRAINER y navega a /app/trainer', async () => {
      render(<OnboardingPage />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /soy entrenador/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /soy entrenador/i }));

      await waitFor(() => {
        expect(mockUpsertProfile).toHaveBeenCalledWith({
          id: 'test-user-id-123',
          email: 'test@example.com',
          role: 'TRAINER',
        });
        expect(mockPush).toHaveBeenCalledWith('/app/trainer');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Estado de carga durante guardado', () => {
    it('muestra estado de carga y deshabilita botones', async () => {
      mockUpsertProfile.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<OnboardingPage />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /soy alumno/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /soy alumno/i }));

      // Ambos botones deberían mostrar "Guardando..." y estar deshabilitados
      const buttons = screen.getAllByRole('button', { name: /guardando/i });
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Manejo de errores', () => {
    it('muestra error cuando falla el guardado del perfil', async () => {
      mockUpsertProfile.mockResolvedValue({ error: new Error('Database error') });

      render(<OnboardingPage />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /soy alumno/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /soy alumno/i }));

      await waitFor(() => {
        expect(screen.getByText(/error al guardar el perfil/i)).toBeInTheDocument();
      });
    });

    it('no navega cuando hay error', async () => {
      mockUpsertProfile.mockResolvedValue({ error: new Error('Error') });

      render(<OnboardingPage />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /soy alumno/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /soy alumno/i }));

      await waitFor(() => {
        expect(screen.getByText(/error al guardar el perfil/i)).toBeInTheDocument();
      });

      // Solo debería haber sido llamado para /login check, no para navegación post-rol
      expect(mockPush).not.toHaveBeenCalledWith('/app/student');
      expect(mockPush).not.toHaveBeenCalledWith('/app/trainer');
    });

    it('permite reintentar después de un error', async () => {
      mockUpsertProfile
        .mockResolvedValueOnce({ error: new Error('Error') })
        .mockResolvedValueOnce({ error: null });

      render(<OnboardingPage />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /soy alumno/i })).toBeInTheDocument();
      });

      // Primer intento - falla
      await user.click(screen.getByRole('button', { name: /soy alumno/i }));

      await waitFor(() => {
        expect(screen.getByText(/error al guardar el perfil/i)).toBeInTheDocument();
      });

      // Segundo intento - éxito
      await user.click(screen.getByRole('button', { name: /soy alumno/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/app/student');
      });
    });
  });
});
