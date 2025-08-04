import { DatabaseManager } from '@expense-tracker/database';
import { useExpenseStore } from '../../store/useExpenseStore';
import { 
  DEFAULT_CURRENCIES, 
  DEFAULT_EXPENSE_CATEGORIES, 
  ExpenseCategory, 
  PaymentMethod, 
  Tag, 
  Currency,
  Expense 
} from '@expense-tracker/shared';

// Mock SQLite
jest.mock('react-native-sqlite-storage', () => {
  const mockDatabase = {
    executeSql: jest.fn(),
    close: jest.fn()
  };
  return {
    DEBUG: jest.fn(),
    enablePromise: jest.fn(),
    openDatabase: jest.fn().mockResolvedValue(mockDatabase),
    deleteDatabase: jest.fn().mockResolvedValue(undefined),
    mockDatabase
  };
});

describe('Database-Store Integration', () => {
  let store: ReturnType<typeof useExpenseStore.getState>;
  let dbManager: DatabaseManager;
  let mockDatabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mock database instance
    const SQLite = require('react-native-sqlite-storage');
    mockDatabase = SQLite.mockDatabase;
    
    // Reset store to initial state
    useExpenseStore.setState({
      expenses: [],
      categories: DEFAULT_EXPENSE_CATEGORIES,
      currencies: DEFAULT_CURRENCIES,
      paymentMethods: [],
      tags: [],
      vendors: [],
      userPreferences: null,
      isLoading: false,
      error: null,
      filter: null,
      isAppInitialized: false
    });

    store = useExpenseStore.getState();
    dbManager = DatabaseManager.getInstance();

    // Set up default database mocks
    mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 0, item: jest.fn() } }]);
  });

  afterEach(() => {
    // Reset singleton instance
    (DatabaseManager as any).instance = undefined;
  });

  describe('Application Initialization Integration', () => {
    it('should successfully initialize app with database and load all data', async () => {
      // Mock database health check
      mockDatabase.executeSql
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // expenses table exists
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // simple query on expenses
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // categories table exists  
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // simple query on categories
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // currencies table exists
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // simple query on currencies
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // payment_methods table exists
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // simple query on payment_methods
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // user_preferences table exists
        .mockResolvedValueOnce([{ rows: { length: 0 } }]); // simple query on user_preferences

      // Mock data loading
      const mockCategories = [
        { id: 'cat1', name: 'Food', color: '#FF0000', icon: '🍕', parent_id: null },
        { id: 'cat2', name: 'Transport', color: '#00FF00', icon: '🚗', parent_id: null }
      ];

      const mockCurrencies = [
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'EUR', symbol: '€', name: 'Euro' }
      ];

      const mockPaymentMethods = [
        { 
          id: 'pm1', 
          type: 'credit_card', 
          name: 'My Credit Card',
          alias: null,
          last_four_digits: null,
          card_network: null,
          bank_name: null,
          provider: null,
          is_default: 1,
          is_active: 1,
          color: '#007AFF',
          icon: '💳',
          created_at: '2024-01-15T12:00:00.000Z',
          updated_at: '2024-01-15T12:00:00.000Z'
        }
      ];

      const mockUserPreferences = {
        default_currency_code: 'USD',
        theme: 'system',
        language: 'en',
        date_format: 'MMM dd, yyyy',
        first_day_of_week: 0
      };

      // Mock database responses for data loading
      mockDatabase.executeSql
        // Categories query
        .mockResolvedValueOnce([{
          rows: {
            length: mockCategories.length,
            item: jest.fn().mockImplementation((index) => mockCategories[index])
          }
        }])
        // Currencies query
        .mockResolvedValueOnce([{
          rows: {
            length: mockCurrencies.length,
            item: jest.fn().mockImplementation((index) => mockCurrencies[index])
          }
        }])
        // Payment methods query
        .mockResolvedValueOnce([{
          rows: {
            length: mockPaymentMethods.length,
            item: jest.fn().mockImplementation((index) => mockPaymentMethods[index])
          }
        }])
        // Tags query
        .mockResolvedValueOnce([{ rows: { length: 0, item: jest.fn() } }])
        // User preferences query
        .mockResolvedValueOnce([{
          rows: {
            length: 1,
            item: jest.fn().mockReturnValue(mockUserPreferences)
          }
        }])
        // Expenses query
        .mockResolvedValueOnce([{ rows: { length: 0, item: jest.fn() } }]);

      await store.initializeApp();

      const finalState = useExpenseStore.getState();
      
      expect(finalState.isAppInitialized).toBe(true);
      expect(finalState.isLoading).toBe(false);
      expect(finalState.error).toBeNull();
      
      // Verify all data was loaded correctly
      expect(finalState.categories).toHaveLength(2);
      expect(finalState.categories[0].name).toBe('Food');
      expect(finalState.currencies).toHaveLength(2);
      expect(finalState.paymentMethods).toHaveLength(1);
      expect(finalState.userPreferences).toMatchObject({
        defaultCurrency: { code: 'USD', symbol: '$', name: 'US Dollar' },
        theme: 'system',
        language: 'en'
      });
    });

    it('should handle database initialization failure and attempt recovery', async () => {
      // Mock initial database failure
      mockDatabase.executeSql.mockRejectedValueOnce(new Error('Database initialization failed'));

      // Mock successful reset
      mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 0, item: jest.fn() } }]);

      await store.initializeApp();

      const finalState = useExpenseStore.getState();
      
      // Should still be initialized (fallback mode)
      expect(finalState.isAppInitialized).toBe(true);
      expect(finalState.categories).toEqual(DEFAULT_EXPENSE_CATEGORIES);
      expect(finalState.currencies).toEqual(DEFAULT_CURRENCIES);
    });
  });

  describe('Expense CRUD Operations Integration', () => {
    const mockExpenseData = {
      amount: 25.50,
      description: 'Test expense',
      vendor: 'Test Vendor',
      category: { id: 'cat1', name: 'Food', color: '#FF0000', icon: '🍕' } as ExpenseCategory,
      date: new Date('2024-01-15'),
      currency: { code: 'USD', symbol: '$', name: 'US Dollar' } as Currency,
      paymentMethod: {
        id: 'pm1',
        type: 'credit_card' as const,
        name: 'Credit Card',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as PaymentMethod,
      notes: 'Test notes'
    };

    it('should create expense in database and update store', async () => {
      // Mock vendor creation/update
      mockDatabase.executeSql
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // Vendor doesn't exist
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // Create vendor
        .mockResolvedValueOnce([{ rows: { length: 0 } }]); // Create expense

      await store.createExpense(mockExpenseData);

      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO expenses'),
        expect.arrayContaining([
          expect.any(String), // ID
          25.50, // amount
          'Test expense', // description
          'Test Vendor' // vendor
        ])
      );

      const finalState = useExpenseStore.getState();
      expect(finalState.expenses).toHaveLength(1);
      expect(finalState.expenses[0]).toMatchObject({
        amount: 25.50,
        vendor: 'Test Vendor',
        description: 'Test expense'
      });
    });

    it('should update expense in database and store', async () => {
      // First create an expense in the store
      useExpenseStore.setState({
        expenses: [{
          id: 'exp1',
          amount: 25.50,
          vendor: 'Original Vendor',
          category: mockExpenseData.category,
          date: mockExpenseData.date,
          currency: mockExpenseData.currency,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      const updates = { amount: 30.00, vendor: 'Updated Vendor' };

      await store.updateExpense('exp1', updates);

      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE expenses SET'),
        expect.arrayContaining([30.00, 'Updated Vendor'])
      );

      const finalState = useExpenseStore.getState();
      expect(finalState.expenses[0].amount).toBe(30.00);
      expect(finalState.expenses[0].vendor).toBe('Updated Vendor');
    });

    it('should delete expense from database and store', async () => {
      // First create an expense in the store
      useExpenseStore.setState({
        expenses: [{
          id: 'exp1',
          amount: 25.50,
          vendor: 'Test Vendor',
          category: mockExpenseData.category,
          date: mockExpenseData.date,
          currency: mockExpenseData.currency,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      await store.deleteExpense('exp1');

      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        'DELETE FROM expenses WHERE id = ?',
        ['exp1']
      );

      const finalState = useExpenseStore.getState();
      expect(finalState.expenses).toHaveLength(0);
    });

    it('should load expenses with filters from database', async () => {
      const mockExpenses = [
        {
          id: 'exp1',
          amount: 25.50,
          vendor: 'Test Vendor',
          category_id: 'cat1',
          category_name: 'Food',
          category_color: '#FF0000',
          category_icon: '🍕',
          date: '2024-01-15T00:00:00.000Z',
          currency_code: 'USD',
          currency_symbol: '$',
          currency_name: 'US Dollar',
          payment_method_id: 'pm1',
          location: null,
          notes: 'Test notes',
          created_at: '2024-01-15T12:00:00.000Z',
          updated_at: '2024-01-15T12:00:00.000Z'
        }
      ];

      // Mock database health check
      mockDatabase.executeSql
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // Health check
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // Simple query
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // Health check
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // Simple query
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // Health check
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // Simple query
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // Health check
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // Simple query
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // Health check
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // Simple query
        // Expenses query
        .mockResolvedValueOnce([{
          rows: {
            length: 1,
            item: jest.fn().mockReturnValue(mockExpenses[0])
          }
        }])
        // Tags query for expense
        .mockResolvedValueOnce([{ rows: { length: 0 } }]);

      const filter = { categories: ['cat1'], minAmount: 20 };
      await store.loadExpenses(filter);

      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.category_id IN'),
        expect.arrayContaining(['cat1'])
      );

      const finalState = useExpenseStore.getState();
      expect(finalState.expenses).toHaveLength(1);
      expect(finalState.filter).toEqual(filter);
    });
  });

  describe('Category Management Integration', () => {
    it('should create category in database and reload store', async () => {
      const categoryData = {
        name: 'New Category',
        color: '#0000FF',
        icon: '📱'
      };

      // Mock category creation
      mockDatabase.executeSql
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // Create category
        // Mock categories reload
        .mockResolvedValueOnce([{
          rows: {
            length: 1,
            item: jest.fn().mockReturnValue({
              id: 'new-cat-id',
              name: 'New Category',
              color: '#0000FF',
              icon: '📱',
              parent_id: null
            })
          }
        }]);

      const id = await store.createCategory(categoryData);

      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        expect.arrayContaining(['new-cat-id', 'New Category', '#0000FF', '📱'])
      );

      expect(typeof id).toBe('string');
    });

    it('should handle category deletion with constraints', async () => {
      // Mock category has children
      mockDatabase.executeSql.mockResolvedValueOnce([{
        rows: { item: jest.fn().mockReturnValue({ count: 1 }) }
      }]);

      await expect(store.deleteCategory('cat1')).rejects.toThrow(
        'Cannot delete category with child categories'
      );

      const finalState = useExpenseStore.getState();
      expect(finalState.error).toContain('Cannot delete category with child categories');
    });
  });

  describe('Payment Method Integration', () => {
    it('should create payment method and handle default setting', async () => {
      const paymentMethodData = {
        type: 'credit_card' as const,
        name: 'My New Card',
        isDefault: true,
        color: '#007AFF',
        icon: '💳'
      };

      // Mock payment method creation with default handling
      mockDatabase.executeSql
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // Clear other defaults
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // Create payment method
        // Mock payment methods reload
        .mockResolvedValueOnce([{
          rows: {
            length: 1,
            item: jest.fn().mockReturnValue({
              id: 'new-pm-id',
              type: 'credit_card',
              name: 'My New Card',
              is_default: 1,
              is_active: 1,
              color: '#007AFF',
              icon: '💳',
              created_at: '2024-01-15T12:00:00.000Z',
              updated_at: '2024-01-15T12:00:00.000Z'
            })
          }
        }]);

      const id = await store.createPaymentMethod(paymentMethodData);

      // Should clear other defaults first
      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payment_methods SET is_default = 0'),
        expect.any(Array)
      );

      // Then create new payment method
      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payment_methods'),
        expect.arrayContaining(['new-pm-id', 'credit_card', 'My New Card'])
      );

      expect(typeof id).toBe('string');
    });
  });

  describe('Tag Management Integration', () => {
    it('should get or create tag and update store', async () => {
      // Mock tag search (not found)
      mockDatabase.executeSql
        .mockResolvedValueOnce([{ rows: { length: 0 } }])
        // Mock tag creation
        .mockResolvedValueOnce([{ rows: { length: 0 } }])
        // Mock tags reload
        .mockResolvedValueOnce([{
          rows: {
            length: 1,
            item: jest.fn().mockReturnValue({
              id: 'new-tag-id',
              name: 'NewTag',
              color: expect.any(String),
              created_at: '2024-01-15T12:00:00.000Z'
            })
          }
        }]);

      const tag = await store.getOrCreateTag('NewTag');

      expect(tag.name).toBe('NewTag');
      expect(typeof tag.id).toBe('string');

      // Should have created the tag
      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tags'),
        expect.arrayContaining([expect.any(String), 'NewTag'])
      );
    });

    it('should search tags from database', async () => {
      const mockTags = [
        {
          id: 'tag1',
          name: 'Business',
          color: '#0000FF',
          usage_count: 5,
          created_at: '2024-01-15T12:00:00.000Z'
        }
      ];

      mockDatabase.executeSql.mockResolvedValueOnce([{
        rows: {
          length: 1,
          item: jest.fn().mockReturnValue(mockTags[0])
        }
      }]);

      const results = await store.searchTags('bus');

      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.name LIKE ?'),
        ['%bus%']
      );

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Business');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database errors gracefully and update store error state', async () => {
      mockDatabase.executeSql.mockRejectedValue(new Error('Database connection lost'));

      await store.createExpense({
        amount: 10,
        vendor: 'Test',
        category: { id: 'cat1' } as ExpenseCategory,
        date: new Date(),
        currency: { code: 'USD' } as Currency
      });

      const finalState = useExpenseStore.getState();
      expect(finalState.error).toBe('Database connection lost');
      expect(finalState.isLoading).toBe(false);
    });

    it('should handle concurrent operations with proper error isolation', async () => {
      let callCount = 0;
      mockDatabase.executeSql.mockImplementation(() => {
        callCount++;
        if (callCount === 3) {
          return Promise.reject(new Error('Third operation failed'));
        }
        return Promise.resolve([{ rows: { length: 0 } }]);
      });

      const promises = [
        store.createExpense({
          amount: 10,
          vendor: 'Vendor1',
          category: { id: 'cat1' } as ExpenseCategory,
          date: new Date(),
          currency: { code: 'USD' } as Currency
        }),
        store.createExpense({
          amount: 20,
          vendor: 'Vendor2',
          category: { id: 'cat1' } as ExpenseCategory,
          date: new Date(),
          currency: { code: 'USD' } as Currency
        }),
        store.createExpense({
          amount: 30,
          vendor: 'Vendor3',
          category: { id: 'cat1' } as ExpenseCategory,
          date: new Date(),
          currency: { code: 'USD' } as Currency
        })
      ];

      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length).toBe(2);
      expect(failed.length).toBe(1);

      const finalState = useExpenseStore.getState();
      // Store should have partial success (2 expenses created)
      expect(finalState.expenses.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Optimization Integration', () => {
    it('should handle large dataset operations efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `exp${i}`,
        amount: Math.random() * 1000,
        vendor: `Vendor ${i}`,
        category_id: 'cat1',
        category_name: 'Food',
        category_color: '#FF0000',
        category_icon: '🍕',
        date: new Date().toISOString(),
        currency_code: 'USD',
        currency_symbol: '$',
        currency_name: 'US Dollar',
        payment_method_id: 'pm1',
        location: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Mock health check first
      mockDatabase.executeSql
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // expenses table exists
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // simple query
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // categories table exists
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // simple query
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // currencies table exists
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // simple query
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // payment_methods table exists
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // simple query
        .mockResolvedValueOnce([{ rows: { length: 1 } }]) // user_preferences table exists
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // simple query
        // Large dataset query
        .mockResolvedValueOnce([{
          rows: {
            length: largeDataset.length,
            item: jest.fn().mockImplementation((index) => largeDataset[index])
          }
        }]);

      // Mock tag queries for each expense
      for (let i = 0; i < largeDataset.length; i++) {
        mockDatabase.executeSql.mockResolvedValueOnce([{ rows: { length: 0 } }]);
      }

      const startTime = performance.now();
      await store.loadExpenses();
      const endTime = performance.now();

      const finalState = useExpenseStore.getState();
      expect(finalState.expenses).toHaveLength(1000);
      
      // Should complete in reasonable time (less than 1 second for mock operations)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should properly manage loading states during operations', async () => {
      let resolvePromise: (value: any) => void;
      const slowOperation = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockDatabase.executeSql.mockReturnValue(slowOperation);

      // Start operation
      const operationPromise = store.createExpense({
        amount: 10,
        vendor: 'Test',
        category: { id: 'cat1' } as ExpenseCategory,
        date: new Date(),
        currency: { code: 'USD' } as Currency
      });

      // Check loading state is true
      let state = useExpenseStore.getState();
      expect(state.isLoading).toBe(true);

      // Complete operation
      resolvePromise!([{ rows: { length: 0 } }]);
      await operationPromise;

      // Check loading state is false
      state = useExpenseStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });
});