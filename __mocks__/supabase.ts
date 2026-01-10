// Mock de Supabase Client para testing
// Simula las respuestas de autenticación y base de datos

export const mockUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
};

export const mockProfile = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  role: 'STUDENT' as const,
  full_name: 'Test User',
  created_at: new Date().toISOString(),
};

// Mock functions que pueden ser espiadas/modificadas en tests
export const mockSignUp = jest.fn();
export const mockSignInWithPassword = jest.fn();
export const mockGetUser = jest.fn();
export const mockSignOut = jest.fn();

export const mockFrom = jest.fn();
export const mockSelect = jest.fn();
export const mockInsert = jest.fn();
export const mockUpdate = jest.fn();
export const mockUpsert = jest.fn();
export const mockEq = jest.fn();
export const mockSingle = jest.fn();

// Resetear todos los mocks
export const resetAllMocks = () => {
  mockSignUp.mockReset();
  mockSignInWithPassword.mockReset();
  mockGetUser.mockReset();
  mockSignOut.mockReset();
  mockFrom.mockReset();
  mockSelect.mockReset();
  mockInsert.mockReset();
  mockUpdate.mockReset();
  mockUpsert.mockReset();
  mockEq.mockReset();
  mockSingle.mockReset();
};

// Configurar respuestas por defecto exitosas
export const setupSuccessfulAuth = () => {
  mockSignUp.mockResolvedValue({ data: { user: mockUser }, error: null });
  mockSignInWithPassword.mockResolvedValue({ data: { user: mockUser }, error: null });
  mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
};

export const setupSuccessfulProfile = () => {
  mockSingle.mockResolvedValue({ data: mockProfile, error: null });
  mockUpsert.mockResolvedValue({ data: mockProfile, error: null });
};

// Builder pattern para query chain
const createQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: mockUpsert.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  single: mockSingle,
});

// Mock del cliente Supabase
export const createMockSupabaseClient = () => ({
  auth: {
    signUp: mockSignUp,
    signInWithPassword: mockSignInWithPassword,
    getUser: mockGetUser,
    signOut: mockSignOut,
  },
  from: jest.fn(() => createQueryBuilder()),
});

// Mock para usar en jest.mock('@/lib/supabase/client')
export const createClient = jest.fn(() => createMockSupabaseClient());
