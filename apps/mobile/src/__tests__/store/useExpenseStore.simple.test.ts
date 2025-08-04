import { useExpenseStore } from '../../store/useExpenseStore';
import { DatabaseManager } from '@expense-tracker/database';
import { 
  DEFAULT_CURRENCIES, 
  DEFAULT_EXPENSE_CATEGORIES,
  Currency,
  ExpenseCategory,
  PaymentMethod
} from '@expense-tracker/shared';

// Mock the DatabaseManager
jest.mock('@expense-tracker/database', () => ({
  DatabaseManager: {
    getInstance: jest.fn()
  }
}));

const mockDatabaseManager = {
  initialize: jest.fn(),
  resetDatabase: jest.fn(),
  checkDatabaseHealth: jest.fn(),
  getCategories: jest.fn(),
  getCurrencies: jest.fn(),
  getPaymentMethods: jest.fn(),
  getTags: jest.fn(),
  getUserPreferences: jest.fn(),
  getExpenses: jest.fn(),
  createExpense: jest.fn(),
  updateExpense: jest.fn(),
  deleteExpense: jest.fn(),
  getCategoryTree: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  moveCategoryToParent: jest.fn(),
  createPaymentMethod: jest.fn(),
  updatePaymentMethod: jest.fn(),
  deletePaymentMethod: jest.fn(),
  createTag: jest.fn(),
  updateTag: jest.fn(),
  deleteTag: jest.fn(),
  searchTags: jest.fn(),
  getOrCreateTag: jest.fn(),
  searchVendors: jest.fn(),
  getPopularVendors: jest.fn(),
  updateUserPreferences: jest.fn()
};

const mockGetInstance = DatabaseManager.getInstance as jest.MockedFunction<typeof DatabaseManager.getInstance>;
mockGetInstance.mockReturnValue(mockDatabaseManager as any);

describe('useExpenseStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset store state before each test
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

    // Set up default mock implementations
    mockDatabaseManager.initialize.mockResolvedValue(undefined);
    mockDatabaseManager.checkDatabaseHealth.mockResolvedValue(true);
    mockDatabaseManager.getCategories.mockResolvedValue(DEFAULT_EXPENSE_CATEGORIES);
    mockDatabaseManager.getCurrencies.mockResolvedValue(DEFAULT_CURRENCIES);
    mockDatabaseManager.getPaymentMethods.mockResolvedValue([]);
    mockDatabaseManager.getTags.mockResolvedValue([]);
    mockDatabaseManager.getUserPreferences.mockResolvedValue({
      defaultCurrency: DEFAULT_CURRENCIES[0],
      theme: 'system',
      language: 'en',
      dateFormat: 'MMM dd, yyyy',
      firstDayOfWeek: 0
    });
    mockDatabaseManager.getExpenses.mockResolvedValue([]);
    
    // Additional mock implementations
    mockDatabaseManager.getCategoryTree.mockResolvedValue([]);
    mockDatabaseManager.createCategory.mockResolvedValue('new-category-id');
    mockDatabaseManager.updateCategory.mockResolvedValue(undefined);
    mockDatabaseManager.deleteCategory.mockResolvedValue(undefined);
    mockDatabaseManager.moveCategoryToParent.mockResolvedValue(undefined);
    mockDatabaseManager.createPaymentMethod.mockResolvedValue('new-pm-id');
    mockDatabaseManager.updatePaymentMethod.mockResolvedValue(undefined);
    mockDatabaseManager.deletePaymentMethod.mockResolvedValue(undefined);
    mockDatabaseManager.createTag.mockResolvedValue('new-tag-id');
    mockDatabaseManager.updateTag.mockResolvedValue(undefined);
    mockDatabaseManager.deleteTag.mockResolvedValue(undefined);
    mockDatabaseManager.searchTags.mockResolvedValue([]);
    mockDatabaseManager.getOrCreateTag.mockResolvedValue({ id: 'tag1', name: 'Tag', createdAt: new Date() });
    mockDatabaseManager.searchVendors.mockResolvedValue([]);
    mockDatabaseManager.getPopularVendors.mockResolvedValue([]);
    mockDatabaseManager.updateUserPreferences.mockResolvedValue(undefined);
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useExpenseStore.getState();

      expect(store.expenses).toEqual([]);
      expect(store.categories).toEqual(DEFAULT_EXPENSE_CATEGORIES);
      expect(store.currencies).toEqual(DEFAULT_CURRENCIES);
      expect(store.paymentMethods).toEqual([]);
      expect(store.tags).toEqual([]);
      expect(store.vendors).toEqual([]);
      expect(store.userPreferences).toBeNull();
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.filter).toBeNull();
      expect(store.isAppInitialized).toBe(false);
    });
  });

  describe('initializeApp', () => {
    it('should initialize app successfully', async () => {
      const store = useExpenseStore.getState();

      await store.initializeApp();

      expect(mockDatabaseManager.initialize).toHaveBeenCalled();
      expect(mockDatabaseManager.getCategories).toHaveBeenCalled();
      expect(mockDatabaseManager.getCurrencies).toHaveBeenCalled();
      expect(mockDatabaseManager.getPaymentMethods).toHaveBeenCalled();
      expect(mockDatabaseManager.getTags).toHaveBeenCalled();
      expect(mockDatabaseManager.getUserPreferences).toHaveBeenCalled();
      expect(mockDatabaseManager.getExpenses).toHaveBeenCalled();
      
      const finalState = useExpenseStore.getState();
      expect(finalState.isAppInitialized).toBe(true);
      expect(finalState.isLoading).toBe(false);
      expect(finalState.error).toBeNull();
    });

    it('should handle database initialization failure with reset', async () => {
      mockDatabaseManager.initialize.mockRejectedValueOnce(new Error('DB Error'));
      mockDatabaseManager.resetDatabase.mockResolvedValueOnce(undefined);

      const store = useExpenseStore.getState();

      await store.initializeApp();

      expect(mockDatabaseManager.resetDatabase).toHaveBeenCalled();
      const finalState = useExpenseStore.getState();
      expect(finalState.isAppInitialized).toBe(true);
      expect(finalState.isLoading).toBe(false);
    });

    it('should fallback to offline mode on critical failure', async () => {
      mockDatabaseManager.initialize.mockRejectedValue(new Error('Critical DB Error'));
      mockDatabaseManager.resetDatabase.mockRejectedValue(new Error('Reset failed'));

      const store = useExpenseStore.getState();

      await store.initializeApp();

      const finalState = useExpenseStore.getState();
      expect(finalState.isAppInitialized).toBe(true);
      expect(finalState.categories).toEqual(DEFAULT_EXPENSE_CATEGORIES);
      expect(finalState.currencies).toEqual(DEFAULT_CURRENCIES);
      expect(finalState.userPreferences).toMatchObject({
        defaultCurrency: expect.any(Object),
        theme: 'system',
        language: 'en'
      });
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

    describe('createExpense', () => {
      it('should create expense and update store', async () => {
        mockDatabaseManager.createExpense.mockResolvedValue('exp1');

        const store = useExpenseStore.getState();
        await store.createExpense(mockExpenseData);

        expect(mockDatabaseManager.createExpense).toHaveBeenCalledWith(mockExpenseData);
        
        const finalState = useExpenseStore.getState();
        expect(finalState.expenses).toHaveLength(1);
        expect(finalState.expenses[0]).toMatchObject({
          id: 'exp1',
          amount: 25.50,
          vendor: 'Test Vendor'
        });
        expect(finalState.isLoading).toBe(false);
        expect(finalState.error).toBeNull();
      });

      it('should handle creation errors', async () => {
        mockDatabaseManager.createExpense.mockRejectedValue(new Error('Creation failed'));

        const store = useExpenseStore.getState();
        await store.createExpense(mockExpenseData);

        const finalState = useExpenseStore.getState();
        expect(finalState.error).toBe('Creation failed');
        expect(finalState.isLoading).toBe(false);
        expect(finalState.expenses).toHaveLength(0);
      });
    });

    describe('updateExpense', () => {
      it('should update expense and store state', async () => {
        // Set initial expense in store
        useExpenseStore.setState({
          expenses: [{
            id: 'exp1',
            amount: 25.50,
            vendor: 'Original Vendor',
            category: mockCategory,
            date: new Date(),
            currency: mockCurrency,
            createdAt: new Date(),
            updatedAt: new Date()
          }]
        });

        const updates = { amount: 30.00, vendor: 'Updated Vendor' };

        const store = useExpenseStore.getState();
        await store.updateExpense('exp1', updates);

        expect(mockDatabaseManager.updateExpense).toHaveBeenCalledWith('exp1', updates);
        
        const finalState = useExpenseStore.getState();
        expect(finalState.expenses[0].amount).toBe(30.00);
        expect(finalState.expenses[0].vendor).toBe('Updated Vendor');
        expect(finalState.isLoading).toBe(false);
      });

      it('should handle update errors', async () => {
        mockDatabaseManager.updateExpense.mockRejectedValue(new Error('Update failed'));

        const store = useExpenseStore.getState();
        await store.updateExpense('exp1', { amount: 30.00 });

        const finalState = useExpenseStore.getState();
        expect(finalState.error).toBe('Update failed');
        expect(finalState.isLoading).toBe(false);
      });
    });

    describe('deleteExpense', () => {
      it('should delete expense from store', async () => {
        // Set initial expense in store
        useExpenseStore.setState({
          expenses: [{
            id: 'exp1',
            amount: 25.50,
            vendor: 'Test Vendor',
            category: mockCategory,
            date: new Date(),
            currency: mockCurrency,
            createdAt: new Date(),
            updatedAt: new Date()
          }]
        });

        const store = useExpenseStore.getState();
        await store.deleteExpense('exp1');

        expect(mockDatabaseManager.deleteExpense).toHaveBeenCalledWith('exp1');
        
        const finalState = useExpenseStore.getState();
        expect(finalState.expenses).toHaveLength(0);
        expect(finalState.isLoading).toBe(false);
      });
    });

    describe('loadExpenses', () => {
      it('should load expenses from database', async () => {
        const mockExpenses = [
          {
            id: 'exp1',
            amount: 25.50,
            vendor: 'Test Vendor',
            category: mockCategory,
            date: new Date(),
            currency: mockCurrency,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        mockDatabaseManager.getExpenses.mockResolvedValue(mockExpenses);
        mockDatabaseManager.checkDatabaseHealth.mockResolvedValue(true);

        const store = useExpenseStore.getState();
        await store.loadExpenses();

        const finalState = useExpenseStore.getState();
        expect(finalState.expenses).toEqual(mockExpenses);
        expect(finalState.isLoading).toBe(false);
      });

      it('should handle load errors', async () => {
        mockDatabaseManager.getExpenses.mockRejectedValue(new Error('Load failed'));
        mockDatabaseManager.checkDatabaseHealth.mockResolvedValue(true);

        const store = useExpenseStore.getState();
        await store.loadExpenses();

        const finalState = useExpenseStore.getState();
        expect(finalState.error).toBe('Load failed');
        expect(finalState.isLoading).toBe(false);
      });
    });
  });

  describe('category operations', () => {
    describe('loadCategories', () => {
      it('should load categories successfully', async () => {
        const mockCategories = [
          { id: 'cat1', name: 'Food', color: '#FF0000', icon: '🍕' },
          { id: 'cat2', name: 'Transport', color: '#00FF00', icon: '🚗' }
        ];
        mockDatabaseManager.getCategories.mockResolvedValue(mockCategories);

        const store = useExpenseStore.getState();
        await store.loadCategories();

        const finalState = useExpenseStore.getState();
        expect(finalState.categories).toEqual(mockCategories);
      });

      it('should handle load categories errors gracefully', async () => {
        mockDatabaseManager.getCategories.mockRejectedValue(new Error('Load failed'));

        const store = useExpenseStore.getState();
        await store.loadCategories();

        // Should keep default categories on error
        const finalState = useExpenseStore.getState();
        expect(finalState.categories).toEqual(DEFAULT_EXPENSE_CATEGORIES);
      });
    });

    describe('getCategoryTree', () => {
      it('should return category tree', async () => {
        const mockTree = [
          {
            category: { id: 'cat1', name: 'Food', color: '#FF0000', icon: '🍕', level: 0 },
            children: [],
            depth: 0
          }
        ];
        mockDatabaseManager.getCategoryTree.mockResolvedValue(mockTree);

        const store = useExpenseStore.getState();
        const tree = await store.getCategoryTree();

        expect(tree).toEqual(mockTree);
      });
    });

    describe('createCategory', () => {
      it('should create category and reload categories', async () => {
        const categoryData = {
          name: 'New Category',
          color: '#0000FF',
          icon: '📱'
        };
        mockDatabaseManager.createCategory.mockResolvedValue('new-cat-id');
        mockDatabaseManager.getCategories.mockResolvedValue([
          ...DEFAULT_EXPENSE_CATEGORIES,
          { id: 'new-cat-id', ...categoryData }
        ]);

        const store = useExpenseStore.getState();
        const id = await store.createCategory(categoryData);

        expect(id).toBe('new-cat-id');
        expect(mockDatabaseManager.createCategory).toHaveBeenCalledWith(categoryData);
        expect(mockDatabaseManager.getCategories).toHaveBeenCalled();
      });

      it('should handle create category errors', async () => {
        mockDatabaseManager.createCategory.mockRejectedValue(new Error('Create failed'));

        const store = useExpenseStore.getState();
        
        await expect(store.createCategory({
          name: 'Test',
          color: '#FF0000',
          icon: '🔸'
        })).rejects.toThrow('Create failed');

        const finalState = useExpenseStore.getState();
        expect(finalState.error).toBe('Create failed');
        expect(finalState.isLoading).toBe(false);
      });
    });

    describe('updateCategory', () => {
      it('should update category and reload categories', async () => {
        const updates = { name: 'Updated Name', color: '#FFFF00' };
        
        const store = useExpenseStore.getState();
        await store.updateCategory('cat1', updates);

        expect(mockDatabaseManager.updateCategory).toHaveBeenCalledWith('cat1', updates);
        expect(mockDatabaseManager.getCategories).toHaveBeenCalled();
      });
    });

    describe('deleteCategory', () => {
      it('should delete category and reload categories', async () => {
        const store = useExpenseStore.getState();
        await store.deleteCategory('cat1');

        expect(mockDatabaseManager.deleteCategory).toHaveBeenCalledWith('cat1');
        expect(mockDatabaseManager.getCategories).toHaveBeenCalled();
      });
    });

    describe('moveCategoryToParent', () => {
      it('should move category and reload categories', async () => {
        const store = useExpenseStore.getState();
        await store.moveCategoryToParent('cat1', 'parent-cat');

        expect(mockDatabaseManager.moveCategoryToParent).toHaveBeenCalledWith('cat1', 'parent-cat');
        expect(mockDatabaseManager.getCategories).toHaveBeenCalled();
      });
    });
  });

  describe('payment method operations', () => {
    describe('loadPaymentMethods', () => {
      it('should load payment methods successfully', async () => {
        const mockPaymentMethods = [
          {
            id: 'pm1',
            type: 'credit_card' as const,
            name: 'My Card',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        mockDatabaseManager.getPaymentMethods.mockResolvedValue(mockPaymentMethods);

        const store = useExpenseStore.getState();
        await store.loadPaymentMethods();

        const finalState = useExpenseStore.getState();
        expect(finalState.paymentMethods).toEqual(mockPaymentMethods);
      });
    });

    describe('createPaymentMethod', () => {
      it('should create payment method and reload list', async () => {
        const paymentMethodData = {
          type: 'credit_card' as const,
          name: 'New Card',
          isDefault: true
        };
        mockDatabaseManager.createPaymentMethod.mockResolvedValue('pm-new');

        const store = useExpenseStore.getState();
        const id = await store.createPaymentMethod(paymentMethodData);

        expect(id).toBe('pm-new');
        expect(mockDatabaseManager.createPaymentMethod).toHaveBeenCalledWith(paymentMethodData);
        expect(mockDatabaseManager.getPaymentMethods).toHaveBeenCalled();
      });
    });

    describe('updatePaymentMethod', () => {
      it('should update payment method and reload list', async () => {
        const updates = { name: 'Updated Card' };
        
        const store = useExpenseStore.getState();
        await store.updatePaymentMethod('pm1', updates);

        expect(mockDatabaseManager.updatePaymentMethod).toHaveBeenCalledWith('pm1', updates);
        expect(mockDatabaseManager.getPaymentMethods).toHaveBeenCalled();
      });
    });

    describe('deletePaymentMethod', () => {
      it('should delete payment method and reload list', async () => {
        const store = useExpenseStore.getState();
        await store.deletePaymentMethod('pm1');

        expect(mockDatabaseManager.deletePaymentMethod).toHaveBeenCalledWith('pm1');
        expect(mockDatabaseManager.getPaymentMethods).toHaveBeenCalled();
      });
    });
  });

  describe('tag operations', () => {
    describe('loadTags', () => {
      it('should load tags successfully', async () => {
        const mockTags = [
          { id: 'tag1', name: 'Business', createdAt: new Date() },
          { id: 'tag2', name: 'Personal', createdAt: new Date() }
        ];
        mockDatabaseManager.getTags.mockResolvedValue(mockTags);

        const store = useExpenseStore.getState();
        await store.loadTags();

        const finalState = useExpenseStore.getState();
        expect(finalState.tags).toEqual(mockTags);
      });
    });

    describe('createTag', () => {
      it('should create tag and reload list', async () => {
        const tagData = { name: 'New Tag', color: '#FF0000' };
        mockDatabaseManager.createTag.mockResolvedValue('tag-new');

        const store = useExpenseStore.getState();
        const id = await store.createTag(tagData);

        expect(id).toBe('tag-new');
        expect(mockDatabaseManager.createTag).toHaveBeenCalledWith(tagData);
        expect(mockDatabaseManager.getTags).toHaveBeenCalled();
      });
    });

    describe('searchTags', () => {
      it('should search tags', async () => {
        const mockResults = [
          { id: 'tag1', name: 'Business', createdAt: new Date() }
        ];
        mockDatabaseManager.searchTags.mockResolvedValue(mockResults);

        const store = useExpenseStore.getState();
        const results = await store.searchTags('bus');

        expect(results).toEqual(mockResults);
        expect(mockDatabaseManager.searchTags).toHaveBeenCalledWith('bus');
      });
    });

    describe('getOrCreateTag', () => {
      it('should get or create tag and reload list', async () => {
        const mockTag = { id: 'tag1', name: 'Business', createdAt: new Date() };
        mockDatabaseManager.getOrCreateTag.mockResolvedValue(mockTag);

        const store = useExpenseStore.getState();
        const tag = await store.getOrCreateTag('Business');

        expect(tag).toEqual(mockTag);
        expect(mockDatabaseManager.getOrCreateTag).toHaveBeenCalledWith('Business');
        expect(mockDatabaseManager.getTags).toHaveBeenCalled();
      });
    });

    describe('updateTag', () => {
      it('should update tag and reload list', async () => {
        const updates = { name: 'Updated Tag' };
        
        const store = useExpenseStore.getState();
        await store.updateTag('tag1', updates);

        expect(mockDatabaseManager.updateTag).toHaveBeenCalledWith('tag1', updates);
        expect(mockDatabaseManager.getTags).toHaveBeenCalled();
      });
    });

    describe('deleteTag', () => {
      it('should delete tag and reload list', async () => {
        const store = useExpenseStore.getState();
        await store.deleteTag('tag1');

        expect(mockDatabaseManager.deleteTag).toHaveBeenCalledWith('tag1');
        expect(mockDatabaseManager.getTags).toHaveBeenCalled();
      });
    });
  });

  describe('vendor operations', () => {
    describe('loadVendors', () => {
      it('should load popular vendors', async () => {
        const mockVendors = ['Starbucks', 'McDonald\'s', 'Shell'];
        mockDatabaseManager.getPopularVendors.mockResolvedValue(mockVendors);

        const store = useExpenseStore.getState();
        await store.loadVendors();

        const finalState = useExpenseStore.getState();
        expect(finalState.vendors).toEqual(mockVendors);
        expect(mockDatabaseManager.getPopularVendors).toHaveBeenCalledWith(50);
      });

      it('should handle load vendors errors', async () => {
        mockDatabaseManager.getPopularVendors.mockRejectedValue(new Error('Load failed'));

        const store = useExpenseStore.getState();
        await store.loadVendors();

        const finalState = useExpenseStore.getState();
        expect(finalState.error).toBe('Load failed');
      });
    });

    describe('searchVendors', () => {
      it('should search vendors', async () => {
        const mockResults = ['Starbucks', 'Starbucks Coffee'];
        mockDatabaseManager.searchVendors.mockResolvedValue(mockResults);

        const store = useExpenseStore.getState();
        const results = await store.searchVendors('star');

        expect(results).toEqual(mockResults);
        expect(mockDatabaseManager.searchVendors).toHaveBeenCalledWith('star', 10);
      });
    });

    describe('getPopularVendors', () => {
      it('should get popular vendors', async () => {
        const mockVendors = ['McDonald\'s', 'KFC', 'Subway'];
        mockDatabaseManager.getPopularVendors.mockResolvedValue(mockVendors);

        const store = useExpenseStore.getState();
        const vendors = await store.getPopularVendors();

        expect(vendors).toEqual(mockVendors);
        expect(mockDatabaseManager.getPopularVendors).toHaveBeenCalledWith(10);
      });
    });
  });

  describe('currency operations', () => {
    describe('loadCurrencies', () => {
      it('should load currencies successfully', async () => {
        const mockCurrencies = [
          { code: 'USD', symbol: '$', name: 'US Dollar' },
          { code: 'EUR', symbol: '€', name: 'Euro' }
        ];
        mockDatabaseManager.getCurrencies.mockResolvedValue(mockCurrencies);

        const store = useExpenseStore.getState();
        await store.loadCurrencies();

        const finalState = useExpenseStore.getState();
        expect(finalState.currencies).toEqual(mockCurrencies);
      });

      it('should handle load currencies errors gracefully', async () => {
        mockDatabaseManager.getCurrencies.mockRejectedValue(new Error('Load failed'));

        const store = useExpenseStore.getState();
        await store.loadCurrencies();

        // Should keep default currencies on error
        const finalState = useExpenseStore.getState();
        expect(finalState.currencies).toEqual(DEFAULT_CURRENCIES);
      });
    });
  });

  describe('user preferences operations', () => {
    describe('loadUserPreferences', () => {
      it('should load user preferences successfully', async () => {
        const mockPreferences = {
          defaultCurrency: { code: 'EUR', symbol: '€', name: 'Euro' },
          theme: 'dark' as const,
          language: 'fr',
          dateFormat: 'dd/MM/yyyy',
          firstDayOfWeek: 1
        };
        mockDatabaseManager.getUserPreferences.mockResolvedValue(mockPreferences);

        const store = useExpenseStore.getState();
        await store.loadUserPreferences();

        const finalState = useExpenseStore.getState();
        expect(finalState.userPreferences).toEqual(mockPreferences);
      });

      it('should handle load preferences errors with defaults', async () => {
        mockDatabaseManager.getUserPreferences.mockRejectedValue(new Error('Load failed'));

        const store = useExpenseStore.getState();
        await store.loadUserPreferences();

        const finalState = useExpenseStore.getState();
        expect(finalState.userPreferences).toMatchObject({
          defaultCurrency: expect.any(Object),
          theme: 'system',
          language: 'en',
          dateFormat: 'MMM dd, yyyy',
          firstDayOfWeek: 0
        });
      });
    });

    describe('updateUserPreferences', () => {
      it('should update user preferences', async () => {
        useExpenseStore.setState({
          userPreferences: {
            defaultCurrency: DEFAULT_CURRENCIES[0],
            theme: 'system',
            language: 'en',
            dateFormat: 'MMM dd, yyyy',
            firstDayOfWeek: 0
          }
        });

        const updates = {
          theme: 'dark' as const,
          language: 'es'
        };

        const store = useExpenseStore.getState();
        await store.updateUserPreferences(updates);

        expect(mockDatabaseManager.updateUserPreferences).toHaveBeenCalledWith(updates);
        
        const finalState = useExpenseStore.getState();
        expect(finalState.userPreferences).toMatchObject(updates);
        expect(finalState.isLoading).toBe(false);
      });

      it('should handle update preferences errors', async () => {
        mockDatabaseManager.updateUserPreferences.mockRejectedValue(new Error('Update failed'));

        const store = useExpenseStore.getState();
        await store.updateUserPreferences({ theme: 'dark' });

        const finalState = useExpenseStore.getState();
        expect(finalState.error).toBe('Update failed');
        expect(finalState.isLoading).toBe(false);
      });
    });
  });

  describe('state transitions and edge cases', () => {
    describe('concurrent operations', () => {
      it('should handle multiple simultaneous expense creations', async () => {
        let callCount = 0;
        mockDatabaseManager.createExpense.mockImplementation(() => {
          callCount++;
          return Promise.resolve(`exp${callCount}`);
        });

        const store = useExpenseStore.getState();
        const expenseData = {
          amount: 25.50,
          vendor: 'Test Vendor',
          category: { id: 'cat1', name: 'Food', color: '#FF0000', icon: '🍕' },
          date: new Date(),
          currency: { code: 'USD', symbol: '$', name: 'US Dollar' }
        };
        
        const promises = [
          store.createExpense(expenseData),
          store.createExpense({ ...expenseData, amount: 30 }),
          store.createExpense({ ...expenseData, amount: 40 })
        ];

        await Promise.all(promises);

        const finalState = useExpenseStore.getState();
        expect(finalState.expenses).toHaveLength(3);
        expect(mockDatabaseManager.createExpense).toHaveBeenCalledTimes(3);
      });

      it('should handle mixed success/failure operations', async () => {
        mockDatabaseManager.createExpense
          .mockResolvedValueOnce('exp1')
          .mockRejectedValueOnce(new Error('Second failed'))
          .mockResolvedValueOnce('exp3');

        const store = useExpenseStore.getState();
        
        const expenseData = {
          amount: 25.50,
          vendor: 'Test Vendor',
          category: { id: 'cat1', name: 'Food', color: '#FF0000', icon: '🍕' },
          date: new Date(),
          currency: { code: 'USD', symbol: '$', name: 'US Dollar' }
        };

        // First should succeed
        await store.createExpense(expenseData);
        let state = useExpenseStore.getState();
        expect(state.expenses).toHaveLength(1);
        expect(state.error).toBeNull();

        // Second should fail
        await store.createExpense({ ...expenseData, amount: 30 });
        state = useExpenseStore.getState();
        expect(state.expenses).toHaveLength(1); // No new expense added
        expect(state.error).toBe('Second failed');

        // Third should succeed (error cleared)
        store.clearError();
        await store.createExpense({ ...expenseData, amount: 40 });
        state = useExpenseStore.getState();
        expect(state.expenses).toHaveLength(2);
        expect(state.error).toBeNull();
      });
    });

    describe('loading state management', () => {
      it('should manage loading state correctly during operations', async () => {
        let resolveCreate: (value: string) => void;
        const createPromise = new Promise<string>((resolve) => {
          resolveCreate = resolve;
        });
        mockDatabaseManager.createExpense.mockReturnValue(createPromise);

        const store = useExpenseStore.getState();
        
        const expenseData = {
          amount: 25.50,
          vendor: 'Test Vendor',
          category: { id: 'cat1', name: 'Food', color: '#FF0000', icon: '🍕' },
          date: new Date(),
          currency: { code: 'USD', symbol: '$', name: 'US Dollar' }
        };

        // Start operation
        const promise = store.createExpense(expenseData);
        
        // Check loading state is true
        let state = useExpenseStore.getState();
        expect(state.isLoading).toBe(true);

        // Complete operation
        resolveCreate!('exp1');
        await promise;

        // Check loading state is false
        state = useExpenseStore.getState();
        expect(state.isLoading).toBe(false);
      });
    });

    describe('initialization retry logic', () => {
      it('should prevent multiple concurrent initializations', async () => {
        // Set up mocks
        mockDatabaseManager.initialize.mockResolvedValue(undefined);
        
        const store = useExpenseStore.getState();
        
        // Start multiple initializations simultaneously
        const promises = [
          store.initializeApp(),
          store.initializeApp(),
          store.initializeApp()
        ];

        await Promise.all(promises);

        // Should only initialize once
        expect(mockDatabaseManager.initialize).toHaveBeenCalledTimes(1);
      });

      it('should allow retry after reset', async () => {
        mockDatabaseManager.initialize.mockResolvedValue(undefined);
        
        const store = useExpenseStore.getState();
        
        // First initialization
        await store.initializeApp();
        expect(mockDatabaseManager.initialize).toHaveBeenCalledTimes(1);

        // Reset and try again
        store.resetInitialization();
        await store.initializeApp();
        expect(mockDatabaseManager.initialize).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('utility actions', () => {
    describe('setFilter', () => {
      it('should set filter and reload expenses', async () => {
        mockDatabaseManager.getExpenses.mockResolvedValue([]);
        mockDatabaseManager.checkDatabaseHealth.mockResolvedValue(true);

        const filter = {
          categories: ['cat1'],
          minAmount: 10
        };

        const store = useExpenseStore.getState();
        store.setFilter(filter);

        // Wait for async operation to complete
        await new Promise(resolve => setTimeout(resolve, 0));

        const finalState = useExpenseStore.getState();
        expect(finalState.filter).toEqual(filter);
        expect(mockDatabaseManager.getExpenses).toHaveBeenCalledWith(filter);
      });

      it('should clear filter when set to null', async () => {
        mockDatabaseManager.getExpenses.mockResolvedValue([]);
        mockDatabaseManager.checkDatabaseHealth.mockResolvedValue(true);

        const store = useExpenseStore.getState();
        store.setFilter(null);

        // Wait for async operation to complete
        await new Promise(resolve => setTimeout(resolve, 0));

        const finalState = useExpenseStore.getState();
        expect(finalState.filter).toBeNull();
        expect(mockDatabaseManager.getExpenses).toHaveBeenCalledWith(undefined);
      });
    });

    describe('error handling', () => {
      it('should set and clear errors', () => {
        const store = useExpenseStore.getState();
        
        store.setError('Test error');
        let state = useExpenseStore.getState();
        expect(state.error).toBe('Test error');

        store.clearError();
        state = useExpenseStore.getState();
        expect(state.error).toBeNull();
      });
    });

    describe('loading state', () => {
      it('should set loading state', () => {
        const store = useExpenseStore.getState();

        store.setLoading(true);
        let state = useExpenseStore.getState();
        expect(state.isLoading).toBe(true);

        store.setLoading(false);
        state = useExpenseStore.getState();
        expect(state.isLoading).toBe(false);
      });
    });
  });
});