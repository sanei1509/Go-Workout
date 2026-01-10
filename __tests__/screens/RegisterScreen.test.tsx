/**
 * Tests para la pantalla de Registro (app/registro/page.tsx)
 *
 * Casos cubiertos:
 * - Validación de formato de email
 * - Validación de longitud mínima de password
 * - Validación de coincidencia de passwords
 * - Registro exitoso y navegación
 * - Manejo de errores (email duplicado, password débil)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistroPage from '@/app/registro/page';

// Mock de next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock de Supabase
const mockSignUp = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
  }),
}));

describe('RegistroPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: registro exitoso
    mockSignUp.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
  });

  describe('Renderizado inicial', () => {
    it('renderiza el formulario de registro correctamente', () => {
      render(<RegistroPage />);

      expect(screen.getByRole('heading', { name: 'Go Workout' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument();
    });

    it('el botón está deshabilitado inicialmente', () => {
      render(<RegistroPage />);

      const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
      expect(submitButton).toBeDisabled();
    });

    it('muestra link para iniciar sesión', () => {
      render(<RegistroPage />);

      expect(screen.getByText('¿Ya tenés cuenta?')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /iniciar sesión/i })).toHaveAttribute('href', '/login');
    });
  });

  describe('Validación de Email', () => {
    it('habilita el botón con email válido y passwords correctos', async () => {
      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Contraseña'), 'password123');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');

      const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('mantiene el botón deshabilitado con email inválido', async () => {
      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Email'), 'email-invalido');
      await user.type(screen.getByLabelText('Contraseña'), 'password123');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');

      const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
      expect(submitButton).toBeDisabled();
    });

    it('valida emails sin @', async () => {
      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Email'), 'testexample.com');
      await user.type(screen.getByLabelText('Contraseña'), 'password123');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');

      expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeDisabled();
    });
  });

  describe('Validación de Password', () => {
    it('muestra error cuando password tiene menos de 6 caracteres', async () => {
      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Contraseña'), '12345');

      expect(screen.getByText('La contraseña debe tener al menos 6 caracteres')).toBeInTheDocument();
    });

    it('no muestra error cuando password tiene 6+ caracteres', async () => {
      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Contraseña'), '123456');

      expect(screen.queryByText('La contraseña debe tener al menos 6 caracteres')).not.toBeInTheDocument();
    });

    it('muestra error cuando las contraseñas no coinciden', async () => {
      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Contraseña'), 'password123');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'password456');

      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    });

    it('no muestra error cuando las contraseñas coinciden', async () => {
      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Contraseña'), 'password123');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');

      expect(screen.queryByText('Las contraseñas no coinciden')).not.toBeInTheDocument();
    });
  });

  describe('Registro exitoso', () => {
    it('navega a /onboarding después de registro exitoso', async () => {
      mockSignUp.mockResolvedValueOnce({ data: { user: { id: '123' } }, error: null });

      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Contraseña'), 'password123');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(mockPush).toHaveBeenCalledWith('/onboarding');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('muestra estado de carga durante el registro', async () => {
      let resolveSignUp: (value: unknown) => void;
      mockSignUp.mockImplementation(() => new Promise(resolve => {
        resolveSignUp = resolve;
      }));

      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Contraseña'), 'password123');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      expect(screen.getByRole('button', { name: /creando cuenta/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creando cuenta/i })).toBeDisabled();

      // Resolver la promesa para limpiar
      resolveSignUp!({ data: { user: { id: '123' } }, error: null });
    });
  });

  describe('Manejo de errores', () => {
    it('muestra error cuando el email ya está registrado', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: null,
        error: { message: 'User already registered' },
      });

      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Email'), 'existing@example.com');
      await user.type(screen.getByLabelText('Contraseña'), 'password123');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      await waitFor(() => {
        expect(screen.getByText('Este email ya está registrado')).toBeInTheDocument();
      });
    });

    it('muestra error de contraseña débil', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: null,
        error: { message: 'Password should be at least 6 characters' },
      });

      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Contraseña'), 'password123');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      await waitFor(() => {
        expect(screen.getByText('La contraseña no cumple los requisitos de seguridad')).toBeInTheDocument();
      });
    });

    it('muestra mensaje de error genérico para otros errores', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' },
      });

      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Contraseña'), 'password123');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('no navega cuando hay error', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      });

      render(<RegistroPage />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Contraseña'), 'password123');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123');
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });
});
