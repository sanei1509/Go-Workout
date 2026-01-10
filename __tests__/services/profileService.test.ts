/**
 * Tests para profileService (lib/services/profileService.ts)
 *
 * Casos cubiertos:
 * - upsertProfile: crear perfil nuevo
 * - upsertProfile: actualizar perfil existente
 * - upsertProfile: manejo de errores
 * - getProfile: obtener perfil existente
 * - getProfile: manejar perfil inexistente
 * - getProfile: manejo de errores
 */

// Mock de Supabase client
const mockUpsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();

const mockFrom = jest.fn(() => ({
  upsert: mockUpsert.mockReturnValue({ error: null }),
  select: mockSelect.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  single: mockSingle,
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Import después del mock
import { upsertProfile, getProfile, type Role } from '@/lib/services/profileService';

describe('profileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert.mockReturnValue({ error: null }),
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
    }));
  });

  describe('upsertProfile', () => {
    const validProfile = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'STUDENT' as Role,
    };

    it('crea un perfil nuevo correctamente', async () => {
      mockUpsert.mockReturnValue({ error: null });

      const result = await upsertProfile(validProfile);

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          id: 'user-123',
          role: 'STUDENT',
          full_name: 'test',
        },
        { onConflict: 'id' }
      );
      expect(result.error).toBeNull();
    });

    it('actualiza un perfil existente (upsert)', async () => {
      mockUpsert.mockReturnValue({ error: null });

      const updatedProfile = {
        ...validProfile,
        role: 'TRAINER' as Role,
      };

      const result = await upsertProfile(updatedProfile);

      expect(mockUpsert).toHaveBeenCalledWith(
        {
          id: 'user-123',
          role: 'TRAINER',
          full_name: 'test',
        },
        { onConflict: 'id' }
      );
      expect(result.error).toBeNull();
    });

    it('extrae full_name del email correctamente', async () => {
      mockUpsert.mockReturnValue({ error: null });

      await upsertProfile({
        id: 'user-123',
        email: 'john.doe@example.com',
        role: 'STUDENT',
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'john.doe',
        }),
        expect.any(Object)
      );
    });

    it('retorna error cuando falla la inserción', async () => {
      mockFrom.mockImplementation(() => ({
        upsert: jest.fn().mockReturnValue({
          error: { message: 'Database connection failed' },
        }),
      }));

      const result = await upsertProfile(validProfile);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Database connection failed');
    });

    it('maneja rol TRAINER correctamente', async () => {
      mockUpsert.mockReturnValue({ error: null });

      const trainerProfile = {
        id: 'trainer-123',
        email: 'trainer@gym.com',
        role: 'TRAINER' as Role,
      };

      await upsertProfile(trainerProfile);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'TRAINER',
        }),
        expect.any(Object)
      );
    });
  });

  describe('getProfile', () => {
    const mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'STUDENT',
      full_name: 'Test User',
      created_at: '2024-01-01T00:00:00Z',
    };

    it('obtiene un perfil existente correctamente', async () => {
      mockSingle.mockResolvedValue({ data: mockProfile, error: null });

      const result = await getProfile('user-123');

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
      expect(result.profile).toEqual(mockProfile);
      expect(result.error).toBeNull();
    });

    it('retorna null cuando el perfil no existe', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'No rows found', code: 'PGRST116' },
      });

      const result = await getProfile('nonexistent-id');

      expect(result.profile).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });

    it('maneja errores de base de datos', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      });

      const result = await getProfile('user-123');

      expect(result.profile).toBeNull();
      expect(result.error?.message).toBe('Connection timeout');
    });

    it('retorna perfil con rol TRAINER', async () => {
      const trainerProfile = { ...mockProfile, role: 'TRAINER' };
      mockSingle.mockResolvedValue({ data: trainerProfile, error: null });

      const result = await getProfile('trainer-123');

      expect(result.profile?.role).toBe('TRAINER');
    });
  });
});
