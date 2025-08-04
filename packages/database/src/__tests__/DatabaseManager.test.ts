import { DatabaseManager } from '../DatabaseManager';
import SQLite from 'react-native-sqlite-storage';
import { 
  Currency, 
  ExpenseCategory, 
  PaymentMethod, 
  Tag, 
  Expense,
  ExpenseFilter,
  PaymentMethodFormData,
  CategoryFormData,
  TagFormData 
} from '@expense-tracker/shared';

// Mock the SQLite module
const mockDatabase = {
  executeSql: jest.fn(),
  close: jest.fn()
};

(SQLite.openDatabase as jest.Mock).mockResolvedValue(mockDatabase);
(SQLite.deleteDatabase as jest.Mock).mockResolvedValue(undefined);

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;

  beforeEach(() => {
    jest.clearAllMocks();
    dbManager = DatabaseManager.getInstance();
    mockDatabase.executeSql.mockClear();
  });

  afterEach(() => {
    // Reset singleton instance for clean tests
    (DatabaseManager as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DatabaseManager.getInstance();
      const instance2 = DatabaseManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);
    });

    it('should open database and create tables', async () => {
      await dbManager.initialize();

      expect(SQLite.openDatabase).toHaveBeenCalledWith({
        name: 'ExpenseTracker.db',
        location: 'default'
      });

      // Verify essential tables are created
      const executeSqlCalls = mockDatabase.executeSql.mock.calls;
      const tableCreationCalls = executeSqlCalls.filter(call => 
        call[0].includes('CREATE TABLE IF NOT EXISTS')
      );
      
      expect(tableCreationCalls.length).toBeGreaterThan(0);
      expect(tableCreationCalls.some(call => call[0].includes('expenses'))).toBe(true);
      expect(tableCreationCalls.some(call => call[0].includes('categories'))).toBe(true);
      expect(tableCreationCalls.some(call => call[0].includes('currencies'))).toBe(true);
    });

    it('should handle database initialization errors', async () => {
      (SQLite.openDatabase as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(dbManager.initialize()).rejects.toThrow('Database error');
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return true when all essential tables exist', async () => {
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

      // Initialize the database connection first
      (dbManager as any).db = mockDatabase;

      const result = await dbManager.checkDatabaseHealth();
      expect(result).toBe(true);
    });

    it('should return false when database is not initialized', async () => {
      (dbManager as any).db = null;
      const result = await dbManager.checkDatabaseHealth();
      expect(result).toBe(false);
    });

    it('should return false when tables are missing', async () => {
      mockDatabase.executeSql.mockResolvedValueOnce([{ rows: { length: 0 } }]); // table doesn't exist
      (dbManager as any).db = mockDatabase;

      const result = await dbManager.checkDatabaseHealth();
      expect(result).toBe(false);
    });
  });

  describe('expense operations', () => {
    const mockCategory: ExpenseCategory = {
      id: 'cat1',
      name: 'Food',
      color: '#FF0000',
      icon: '🍕'
    };

    const mockCurrency: Currency = {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar'
    };

    const mockPaymentMethod: PaymentMethod = {
      id: 'pm1',
      type: 'credit_card',
      name: 'Credit Card',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockExpenseData = {
      amount: 25.50,
      description: 'Test expense',
      vendor: 'Test Vendor',
      category: mockCategory,
      date: new Date('2024-01-15'),
      currency: mockCurrency,
      paymentMethod: mockPaymentMethod,
      location: 'Test Location',
      notes: 'Test notes'
    };

    beforeEach(() => {
      (dbManager as any).db = mockDatabase;
    });

    describe('createExpense', () => {
      it('should create expense and return ID', async () => {
        mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);

        const id = await dbManager.createExpense(mockExpenseData);

        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
        expect(mockDatabase.executeSql).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO expenses'),
          expect.arrayContaining([
            id,
            mockExpenseData.amount,
            mockExpenseData.description,
            mockExpenseData.vendor
          ])
        );
      });

      it('should handle expenses without optional fields', async () => {
        const minimalExpense = {
          amount: 10.00,
          vendor: 'Vendor',
          category: mockCategory,
          date: new Date(),
          currency: mockCurrency
        };

        mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);

        const id = await dbManager.createExpense(minimalExpense);
        expect(typeof id).toBe('string');
      });

      it('should throw error when database is not initialized', async () => {
        (dbManager as any).db = null;

        await expect(dbManager.createExpense(mockExpenseData))
          .rejects.toThrow('Database not initialized');
      });
    });

    describe('updateExpense', () => {
      it('should update expense fields', async () => {
        const updates = {
          amount: 30.00,
          description: 'Updated description',
          vendor: 'Updated Vendor'
        };

        await dbManager.updateExpense('expense1', updates);

        expect(mockDatabase.executeSql).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE expenses SET'),
          expect.arrayContaining([30.00, 'Updated description', 'Updated Vendor'])
        );
      });

      it('should handle partial updates', async () => {
        const updates = { amount: 40.00 };

        await dbManager.updateExpense('expense1', updates);

        expect(mockDatabase.executeSql).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE expenses SET amount = ?'),
          expect.arrayContaining([40.00])
        );
      });
    });

    describe('deleteExpense', () => {
      it('should delete expense by ID', async () => {
        await dbManager.deleteExpense('expense1');

        expect(mockDatabase.executeSql).toHaveBeenCalledWith(
          'DELETE FROM expenses WHERE id = ?',
          ['expense1']
        );
      });
    });

    describe('getExpenses', () => {
      it('should return expenses with joined data', async () => {
        const mockRow = {
          id: 'exp1',
          amount: 25.50,
          description: 'Test',
          vendor: 'Vendor',
          date: '2024-01-15T00:00:00.000Z',
          location: 'Location',
          notes: 'Notes',
          created_at: '2024-01-15T00:00:00.000Z',
          updated_at: '2024-01-15T00:00:00.000Z',
          category_id: 'cat1',
          category_name: 'Food',
          category_color: '#FF0000',
          category_icon: '🍕',
          currency_code: 'USD',
          currency_symbol: '$',
          currency_name: 'US Dollar',
          payment_method_id: 'pm1',
          payment_method_name: 'Credit Card',
          payment_method_type: 'credit_card'
        };

        mockDatabase.executeSql.mockResolvedValueOnce([{
          rows: {
            length: 1,
            item: jest.fn().mockReturnValue(mockRow)
          }
        }]);

        // Mock getExpenseTags
        mockDatabase.executeSql.mockResolvedValueOnce([{ rows: { length: 0 } }]);

        const expenses = await dbManager.getExpenses();

        expect(expenses).toHaveLength(1);
        expect(expenses[0]).toMatchObject({
          id: 'exp1',
          amount: 25.50,
          vendor: 'Vendor',
          category: {
            id: 'cat1',
            name: 'Food',
            color: '#FF0000',
            icon: '🍕'
          },
          currency: {
            code: 'USD',
            symbol: '$',
            name: 'US Dollar'
          }
        });
      });

      it('should filter expenses by date range', async () => {
        const filter: ExpenseFilter = {
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31')
          }
        };

        mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);

        await dbManager.getExpenses(filter);

        expect(mockDatabase.executeSql).toHaveBeenCalledWith(
          expect.stringContaining('WHERE e.date >= ? AND e.date <= ?'),
          expect.arrayContaining(['2024-01-01T00:00:00.000Z', '2024-01-31T00:00:00.000Z'])
        );
      });
    });
  });

  describe('category operations', () => {
    beforeEach(() => {
      (dbManager as any).db = mockDatabase;
    });

    describe('getCategories', () => {
      it('should return categories', async () => {
        const mockRow = {
          id: 'cat1',
          name: 'Food',
          color: '#FF0000',
          icon: '🍕',
          parent_id: null
        };

        mockDatabase.executeSql.mockResolvedValue([{
          rows: {
            length: 1,
            item: jest.fn().mockReturnValue(mockRow)
          }
        }]);

        const categories = await dbManager.getCategories();

        expect(categories).toHaveLength(1);
        expect(categories[0]).toEqual({
          id: 'cat1',
          name: 'Food',
          color: '#FF0000',
          icon: '🍕',
          parentId: null
        });
      });
    });

    describe('createCategory', () => {
      it('should create category and return ID', async () => {
        const categoryData: CategoryFormData = {
          name: 'New Category',
          color: '#00FF00',
          icon: '📱'
        };

        const id = await dbManager.createCategory(categoryData);

        expect(typeof id).toBe('string');
        expect(mockDatabase.executeSql).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO categories'),
          expect.arrayContaining([id, 'New Category', '#00FF00', '📱', null])
        );
      });
    });

    describe('deleteCategory', () => {
      it('should delete category when no children or expenses exist', async () => {
        // Mock queries to show no children and no expenses
        mockDatabase.executeSql
          .mockResolvedValueOnce([{ rows: { item: jest.fn().mockReturnValue({ count: 0 }) } }]) // no children
          .mockResolvedValueOnce([{ rows: { item: jest.fn().mockReturnValue({ count: 0 }) } }]) // no expenses
          .mockResolvedValueOnce([{ rows: { length: 0 } }]); // delete query

        await dbManager.deleteCategory('cat1');

        expect(mockDatabase.executeSql).toHaveBeenLastCalledWith(
          'DELETE FROM categories WHERE id = ?',
          ['cat1']
        );
      });

      it('should throw error when category has children', async () => {
        mockDatabase.executeSql.mockResolvedValueOnce([{ 
          rows: { item: jest.fn().mockReturnValue({ count: 1 }) } 
        }]);

        await expect(dbManager.deleteCategory('cat1'))
          .rejects.toThrow('Cannot delete category with child categories');
      });

      it('should throw error when category is used in expenses', async () => {
        mockDatabase.executeSql
          .mockResolvedValueOnce([{ rows: { item: jest.fn().mockReturnValue({ count: 0 }) } }]) // no children
          .mockResolvedValueOnce([{ rows: { item: jest.fn().mockReturnValue({ count: 1 }) } }]); // has expenses

        await expect(dbManager.deleteCategory('cat1'))
          .rejects.toThrow('Cannot delete category that is used in expenses');
      });
    });
  });

  describe('payment method operations', () => {
    beforeEach(() => {
      (dbManager as any).db = mockDatabase;
    });

    describe('createPaymentMethod', () => {
      it('should create payment method and handle default setting', async () => {
        const paymentMethodData: PaymentMethodFormData = {
          type: 'credit_card',
          name: 'My Credit Card',
          isDefault: true,
          color: '#007AFF',
          icon: '💳'
        };

        mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);

        const id = await dbManager.createPaymentMethod(paymentMethodData);

        expect(typeof id).toBe('string');
        
        // Should clear default from other payment methods first
        expect(mockDatabase.executeSql).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE payment_methods SET is_default = 0'),
          expect.any(Array)
        );

        // Should create new payment method
        expect(mockDatabase.executeSql).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO payment_methods'),
          expect.arrayContaining([id, 'credit_card', 'My Credit Card'])
        );
      });
    });

    describe('deletePaymentMethod', () => {
      it('should soft delete payment method', async () => {
        await dbManager.deletePaymentMethod('pm1');

        expect(mockDatabase.executeSql).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE payment_methods SET is_active = 0'),
          expect.arrayContaining(['pm1'])
        );
      });
    });
  });

  describe('tag operations', () => {
    beforeEach(() => {
      (dbManager as any).db = mockDatabase;
    });

    describe('createTag', () => {
      it('should create tag and return ID', async () => {
        const tagData: TagFormData = {
          name: 'Business',
          color: '#0000FF'
        };

        const id = await dbManager.createTag(tagData);

        expect(typeof id).toBe('string');
        expect(mockDatabase.executeSql).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO tags'),
          expect.arrayContaining([id, 'Business', '#0000FF'])
        );
      });
    });

    describe('getOrCreateTag', () => {
      it('should return existing tag when found', async () => {
        const mockRow = {
          id: 'tag1',
          name: 'Business',
          color: '#0000FF',
          created_at: '2024-01-15T00:00:00.000Z'
        };

        mockDatabase.executeSql.mockResolvedValue([{
          rows: {
            length: 1,
            item: jest.fn().mockReturnValue(mockRow)
          }
        }]);

        const tag = await dbManager.getOrCreateTag('Business');

        expect(tag).toEqual({
          id: 'tag1',
          name: 'Business',
          color: '#0000FF',
          usageCount: 0,
          createdAt: new Date('2024-01-15T00:00:00.000Z')
        });
      });

      it('should create new tag when not found', async () => {
        mockDatabase.executeSql
          .mockResolvedValueOnce([{ rows: { length: 0 } }]) // search returns empty
          .mockResolvedValueOnce([{ rows: { length: 0 } }]); // create tag

        const tag = await dbManager.getOrCreateTag('NewTag');

        expect(tag.name).toBe('NewTag');
        expect(typeof tag.id).toBe('string');
      });
    });

    describe('searchTags', () => {
      it('should search tags by name', async () => {
        const mockRow = {
          id: 'tag1',
          name: 'Business',
          color: '#0000FF',
          usage_count: 5,
          created_at: '2024-01-15T00:00:00.000Z'
        };

        mockDatabase.executeSql.mockResolvedValue([{
          rows: {
            length: 1,
            item: jest.fn().mockReturnValue(mockRow)
          }
        }]);

        const tags = await dbManager.searchTags('bus');

        expect(tags).toHaveLength(1);
        expect(tags[0].name).toBe('Business');
        expect(mockDatabase.executeSql).toHaveBeenCalledWith(
          expect.stringContaining('WHERE t.name LIKE ?'),
          ['%bus%']
        );
      });
    });
  });

  describe('error handling and edge cases', () => {
    beforeEach(() => {
      (dbManager as any).db = mockDatabase;
    });

    it('should handle database execution errors', async () => {
      mockDatabase.executeSql.mockRejectedValue(new Error('SQL Error'));

      await expect(dbManager.createExpense({
        amount: 10,
        vendor: 'Test',
        category: { id: 'cat1' } as ExpenseCategory,
        date: new Date(),
        currency: { code: 'USD' } as Currency
      })).rejects.toThrow('SQL Error');
    });

    it('should handle missing database connection', async () => {
      (dbManager as any).db = null;

      await expect(dbManager.getCategories())
        .rejects.toThrow('Database not initialized');
    });

    it('should handle concurrent database operations', async () => {
      // Mock sequential calls that might overlap
      let callCount = 0;
      mockDatabase.executeSql.mockImplementation(() => {
        callCount++;
        return new Promise(resolve => {
          setTimeout(() => resolve([{ rows: { length: 0 } }]), 10);
        });
      });

      const promises = [
        dbManager.createExpense({
          amount: 10,
          vendor: 'Vendor1',
          category: { id: 'cat1' } as ExpenseCategory,
          date: new Date(),
          currency: { code: 'USD' } as Currency
        }),
        dbManager.createExpense({
          amount: 20,
          vendor: 'Vendor2',
          category: { id: 'cat2' } as ExpenseCategory,
          date: new Date(),
          currency: { code: 'USD' } as Currency
        })
      ];

      await Promise.all(promises);
      expect(callCount).toBeGreaterThanOrEqual(4); // At least 2 vendor operations + 2 expense creations
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousData = {
        amount: 10,
        vendor: "'; DROP TABLE expenses; --",
        description: "<script>alert('xss')</script>",
        category: { id: 'cat1' } as ExpenseCategory,
        date: new Date(),
        currency: { code: 'USD' } as Currency,
        notes: "'; UPDATE expenses SET amount = 999999; --"
      };

      mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);

      await dbManager.createExpense(maliciousData);

      // Verify that parameterized queries were used
      const createExpenseCall = mockDatabase.executeSql.mock.calls.find(call => 
        call[0].includes('INSERT INTO expenses')
      );
      expect(createExpenseCall[0]).toContain('?'); // Parameterized query
      expect(createExpenseCall[1]).toContain(maliciousData.vendor); // Data passed as parameters
    });

    it('should handle very large datasets', async () => {
      // Mock a large number of expenses
      const largeRowCount = 10000;
      const mockRows = {
        length: largeRowCount,
        item: jest.fn().mockImplementation((index) => ({
          id: `exp${index}`,
          amount: Math.random() * 1000,
          vendor: `Vendor ${index}`,
          category_id: 'cat1',
          category_name: 'Food',
          category_color: '#FF0000',
          category_icon: '🍕',
          date: new Date().toISOString(),
          currency_code: 'USD',
          currency_symbol: '$',
          currency_name: 'US Dollar',
          payment_method_id: null,
          location: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      };

      mockDatabase.executeSql
        .mockResolvedValueOnce([{ rows: mockRows }]) // Main query
        .mockResolvedValue([{ rows: { length: 0 } }]); // Tag queries

      const expenses = await dbManager.getExpenses();
      expect(expenses).toHaveLength(largeRowCount);
      expect(mockRows.item).toHaveBeenCalledTimes(largeRowCount);
    });

    it('should handle invalid date formats', async () => {
      const invalidDateData = {
        amount: 10,
        vendor: 'Test Vendor',
        category: { id: 'cat1' } as ExpenseCategory,
        date: new Date('invalid-date'),
        currency: { code: 'USD' } as Currency
      };

      mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);

      // Should reject invalid dates
      await expect(dbManager.createExpense(invalidDateData)).rejects.toThrow();
    });

    it('should handle Unicode and special characters', async () => {
      const unicodeData = {
        amount: 25.50,
        vendor: '🏪 Café München & Sons™',
        description: 'Müller\'s "Special" Coffee ☕ 中文 العربية',
        category: { id: 'cat1' } as ExpenseCategory,
        date: new Date(),
        currency: { code: 'USD' } as Currency,
        location: 'Zürich, 🇨🇭 Switzerland',
        notes: 'Notes with \"quotes\" and \nline breaks\ttabs'
      };

      mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);

      const id = await dbManager.createExpense(unicodeData);
      expect(typeof id).toBe('string');

      // Verify the data was passed correctly
      const createCall = mockDatabase.executeSql.mock.calls.find(call => 
        call[0].includes('INSERT INTO expenses')
      );
      expect(createCall[1]).toContain(unicodeData.vendor);
      expect(createCall[1]).toContain(unicodeData.description);
    });

    it('should handle database close during operations', async () => {
      mockDatabase.executeSql.mockRejectedValue(new Error('database is closed'));

      await expect(dbManager.getExpenses()).rejects.toThrow('database is closed');
    });

    it('should handle memory pressure scenarios', async () => {
      // Simulate low memory by making operations take longer
      let slowCallCount = 0;
      mockDatabase.executeSql.mockImplementation(() => {
        slowCallCount++;
        return new Promise((resolve, reject) => {
          if (slowCallCount > 5) {
            reject(new Error('out of memory'));
          } else {
            setTimeout(() => resolve([{ rows: { length: 0 } }]), 100);
          }
        });
      });

      // Try multiple operations that should eventually fail
      const promises = Array.from({ length: 10 }, (_, i) => 
        dbManager.createExpense({
          amount: i,
          vendor: `Vendor ${i}`,
          category: { id: 'cat1' } as ExpenseCategory,
          date: new Date(),
          currency: { code: 'USD' } as Currency
        })
      );

      const results = await Promise.allSettled(promises);
      const failures = results.filter(r => r.status === 'rejected');
      expect(failures.length).toBeGreaterThan(0);
    });

    it('should handle network interruption during operations', async () => {
      // Simulate network/connection interruption
      // First createExpense call: vendor check + vendor insert + expense insert = 3 calls
      mockDatabase.executeSql
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // First vendor check (not found)
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // First vendor insert
        .mockResolvedValueOnce([{ rows: { length: 0 } }]) // First expense insert
        .mockRejectedValueOnce(new Error('network connection lost')); // Second vendor check fails

      // First operation should succeed
      const firstId = await dbManager.createExpense({
        amount: 10,
        vendor: 'Test',
        category: { id: 'cat1' } as ExpenseCategory,
        date: new Date(),
        currency: { code: 'USD' } as Currency
      });
      expect(typeof firstId).toBe('string');

      // Second operation should fail on vendor check
      await expect(dbManager.createExpense({
        amount: 20,
        vendor: 'Test2',
        category: { id: 'cat1' } as ExpenseCategory,
        date: new Date(),
        currency: { code: 'USD' } as Currency
      })).rejects.toThrow('network connection lost');
    });
  });

  describe('database initialization edge cases', () => {
    it('should handle partial table creation failure', async () => {
      let createTableCallCount = 0;
      mockDatabase.executeSql.mockImplementation((sql) => {
        createTableCallCount++;
        if (sql.includes('CREATE TABLE') && createTableCallCount === 3) {
          throw new Error('Table creation failed');
        }
        return Promise.resolve([{ rows: { length: 0 } }]);
      });

      await expect(dbManager.initialize()).rejects.toThrow();
    });

    it('should handle index creation failures gracefully', async () => {
      // Mock table creation to succeed but index creation to fail
      mockDatabase.executeSql.mockImplementation((sql) => {
        if (sql.includes('CREATE INDEX')) {
          throw new Error('Index creation failed');
        }
        return Promise.resolve([{ rows: { length: 0 } }]);
      });

      // Should not throw, as indexes are not critical
      await expect(dbManager.initialize()).resolves.toBeUndefined();
    });

    it('should handle database file corruption', async () => {
      (SQLite.openDatabase as jest.Mock).mockRejectedValue(new Error('database disk image is malformed'));

      await expect(dbManager.initialize()).rejects.toThrow('database disk image is malformed');
    });

    it('should handle insufficient storage space', async () => {
      (SQLite.openDatabase as jest.Mock).mockRejectedValue(new Error('disk I/O error'));

      await expect(dbManager.initialize()).rejects.toThrow('disk I/O error');
    });
  });

  describe('category tree operations edge cases', () => {
    beforeEach(() => {
      (dbManager as any).db = mockDatabase;
    });

    it('should prevent circular category references', async () => {
      // Mock isDescendantOf to return true (circular reference detected)
      mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 1 } }]);

      await expect(dbManager.moveCategoryToParent('cat1', 'cat2'))
        .rejects.toThrow('Cannot move category to its own descendant');
    });

    it('should handle deep category nesting', async () => {
      const categories = Array.from({ length: 50 }, (_, i) => ({
        id: `cat${i}`,
        name: `Category ${i}`,
        color: '#FF0000',
        icon: '📁',
        parent_id: i > 0 ? `cat${i - 1}` : null
      }));

      mockDatabase.executeSql.mockResolvedValue([{
        rows: {
          length: categories.length,
          item: jest.fn().mockImplementation((index) => categories[index])
        }
      }]);

      const result = await dbManager.getCategories();
      expect(result).toHaveLength(50);
    });
  });

  describe('vendor operations edge cases', () => {
    beforeEach(() => {
      (dbManager as any).db = mockDatabase;
    });

    it('should handle vendor name deduplication', async () => {
      // Mock existing vendor found
      mockDatabase.executeSql
        .mockResolvedValueOnce([{ 
          rows: { 
            length: 1, 
            item: jest.fn().mockReturnValue({ id: 'vendor1', usage_count: 5 })
          }
        }])
        .mockResolvedValueOnce([{ rows: { length: 0 } }]); // Update query

      await dbManager.createOrUpdateVendor('Existing Vendor');

      // Should call UPDATE instead of INSERT
      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vendors'),
        expect.arrayContaining([6]) // usage_count + 1
      );
    });

    it('should handle case-insensitive vendor search', async () => {
      mockDatabase.executeSql.mockResolvedValue([{
        rows: {
          length: 2,
          item: jest.fn()
            .mockReturnValueOnce({ name: 'Starbucks' })
            .mockReturnValueOnce({ name: 'STARBUCKS COFFEE' })
        }
      }]);

      const vendors = await dbManager.searchVendors('STAR');
      expect(vendors).toHaveLength(2);
      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name LIKE ?'),
        expect.arrayContaining(['%STAR%', 10]) // includes limit parameter
      );
    });
  });

  describe('transaction and data integrity', () => {
    beforeEach(() => {
      (dbManager as any).db = mockDatabase;
    });

    it('should handle foreign key constraint violations', async () => {
      mockDatabase.executeSql.mockRejectedValue(
        new Error('FOREIGN KEY constraint failed')
      );

      await expect(dbManager.createExpense({
        amount: 10,
        vendor: 'Test',
        category: { id: 'nonexistent-category' } as ExpenseCategory,
        date: new Date(),
        currency: { code: 'USD' } as Currency
      })).rejects.toThrow('FOREIGN KEY constraint failed');
    });

    it('should handle duplicate key violations', async () => {
      mockDatabase.executeSql.mockRejectedValue(
        new Error('UNIQUE constraint failed')
      );

      await expect(dbManager.createCategory({
        name: 'Duplicate Category',
        color: '#FF0000',
        icon: '📁'
      })).rejects.toThrow('UNIQUE constraint failed');
    });

    it('should handle check constraint violations', async () => {
      mockDatabase.executeSql.mockRejectedValue(
        new Error('CHECK constraint failed')
      );

      // This should fail due to negative amount check constraint
      await expect(dbManager.createExpense({
        amount: -10,
        vendor: 'Test',
        category: { id: 'cat1' } as ExpenseCategory,
        date: new Date(),
        currency: { code: 'USD' } as Currency
      })).rejects.toThrow('CHECK constraint failed');
    });
  });

  describe('performance and optimization', () => {
    beforeEach(() => {
      (dbManager as any).db = mockDatabase;
    });

    it('should handle pagination efficiently', async () => {
      const totalExpenses = 1000;
      const pageSize = 50;

      const mockRows = {
        length: pageSize,
        item: jest.fn().mockImplementation((index) => ({
          id: `exp${index}`,
          amount: 10,
          vendor: 'Test',
          category_id: 'cat1',
          category_name: 'Food',
          category_color: '#FF0000',
          category_icon: '🍕',
          date: new Date().toISOString(),
          currency_code: 'USD',
          currency_symbol: '$',
          currency_name: 'US Dollar',
          payment_method_id: null,
          location: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      };

      // First call: main expense query
      mockDatabase.executeSql.mockResolvedValueOnce([{ rows: mockRows }]);
      // Subsequent calls: tag queries for each expense (all return empty)
      for (let i = 0; i < pageSize; i++) {
        mockDatabase.executeSql.mockResolvedValueOnce([{ rows: { length: 0 } }]);
      }

      const expenses = await dbManager.getExpenses(undefined, pageSize, 100);
      
      expect(expenses).toHaveLength(pageSize);
      expect(mockDatabase.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        expect.arrayContaining([pageSize, 100])
      );
    });

    it('should handle complex filter queries', async () => {
      const complexFilter: ExpenseFilter = {
        categories: ['cat1', 'cat2', 'cat3'],
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        },
        minAmount: 10,
        maxAmount: 1000,
        searchText: 'coffee OR restaurant'
      };

      mockDatabase.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);

      await dbManager.getExpenses(complexFilter);

      const queryCall = mockDatabase.executeSql.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE');
      expect(queryCall[0]).toContain('category_id IN');
      expect(queryCall[0]).toContain('date >= ? AND e.date <= ?');
      expect(queryCall[0]).toContain('amount >= ?');
      expect(queryCall[0]).toContain('amount <= ?');
      expect(queryCall[0]).toContain('LIKE ?');
    });
  });
});