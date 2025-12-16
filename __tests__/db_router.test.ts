import { DatabaseRouter, DBProvider } from '../db/db_router';

describe('Database Router', () => {
  afterEach(async () => {
    await DatabaseRouter.disconnect();
  });

  describe('Provider selection', () => {
    it('should select local provider by default', () => {
      process.env.DB_PROVIDER = 'local';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      
      const client = DatabaseRouter.getClient();
      expect(client.getProviderName()).toBe('local-postgres');
    });

    it('should throw error for missing connection string', () => {
      process.env.DB_PROVIDER = 'local';
      delete process.env.DATABASE_URL;
      
      expect(() => {
        DatabaseRouter.getClient();
      }).toThrow('DATABASE_URL environment variable is required');
    });

    it('should throw error for unsupported provider', () => {
      process.env.DB_PROVIDER = 'invalid' as any;
      
      expect(() => {
        DatabaseRouter.getClient();
      }).toThrow('Unsupported database provider');
    });
  });

  describe('Connection caching', () => {
    it('should return cached client for same provider', () => {
      process.env.DB_PROVIDER = 'local';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      
      const client1 = DatabaseRouter.getClient();
      const client2 = DatabaseRouter.getClient();
      
      expect(client1).toBe(client2);
    });

    it('should return new client when provider changes', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.NEON_DATABASE_URL = 'postgresql://neon:5432/test';
      
      process.env.DB_PROVIDER = 'local';
      const client1 = DatabaseRouter.getClient();
      
      process.env.DB_PROVIDER = 'neon';
      const client2 = DatabaseRouter.getClient();
      
      expect(client1).not.toBe(client2);
      expect(client1.getProviderName()).toBe('local-postgres');
      expect(client2.getProviderName()).toBe('neon');
    });
  });

  describe('Provider-specific configuration', () => {
    it('should require SUPABASE_DB_URL for supabase provider', () => {
      process.env.DB_PROVIDER = 'supabase';
      delete process.env.SUPABASE_DB_URL;
      
      expect(() => {
        DatabaseRouter.getClient();
      }).toThrow('SUPABASE_DB_URL');
    });

    it('should require NEON_DATABASE_URL for neon provider', () => {
      process.env.DB_PROVIDER = 'neon';
      delete process.env.NEON_DATABASE_URL;
      
      expect(() => {
        DatabaseRouter.getClient();
      }).toThrow('NEON_DATABASE_URL');
    });

    it('should require RAILWAY_DATABASE_URL for railway provider', () => {
      process.env.DB_PROVIDER = 'railway';
      delete process.env.RAILWAY_DATABASE_URL;
      
      expect(() => {
        DatabaseRouter.getClient();
      }).toThrow('RAILWAY_DATABASE_URL');
    });

    it('should require RDS_DATABASE_URL for rds provider', () => {
      process.env.DB_PROVIDER = 'rds';
      delete process.env.RDS_DATABASE_URL;
      
      expect(() => {
        DatabaseRouter.getClient();
      }).toThrow('RDS_DATABASE_URL');
    });
  });

  describe('Connection state', () => {
    it('should track connection state', async () => {
      expect(DatabaseRouter.isConnected()).toBe(false);
      
      // Note: We can't actually connect in tests without a real DB
      // This just tests the state tracking
      expect(DatabaseRouter.getCurrentProvider()).toBeNull();
    });

    it('should clear state on disconnect', async () => {
      process.env.DB_PROVIDER = 'local';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      
      DatabaseRouter.getClient(); // Initialize client
      await DatabaseRouter.disconnect();
      
      expect(DatabaseRouter.isConnected()).toBe(false);
      expect(DatabaseRouter.getCurrentProvider()).toBeNull();
    });
  });
});
