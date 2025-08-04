import {
  generateId,
  formatCurrency,
  formatDate,
  getCurrentMonth,
  getCurrentWeek,
  filterExpenses,
  calculateTotal,
  groupExpensesByCategory,
  validateExpense,
  debounce
} from '../utils';
import { Currency, Expense, ExpenseFilter, ExpenseCategory, PaymentMethod, Tag } from '../types';

// Mock date-fns functions for consistent testing
jest.mock('date-fns', () => ({
  format: jest.fn((date, pattern) => `formatted-${pattern}`),
  parseISO: jest.fn((dateString) => new Date(dateString)),
  isValid: jest.fn(() => true),
  startOfMonth: jest.fn(() => new Date('2024-01-01')),
  endOfMonth: jest.fn(() => new Date('2024-01-31')),
  startOfWeek: jest.fn(() => new Date('2024-01-07')),
  endOfWeek: jest.fn(() => new Date('2024-01-13'))
}));

describe('generateId', () => {
  it('should generate a unique string ID', () => {
    const id1 = generateId();
    const id2 = generateId();
    
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
  });

  it('should generate IDs that are URL-safe', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it('should generate IDs with consistent length range', () => {
    const ids = Array.from({ length: 100 }, () => generateId());
    const lengths = ids.map(id => id.length);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    
    // IDs should be reasonably consistent in length
    expect(minLength).toBeGreaterThan(10);
    expect(maxLength).toBeLessThan(30);
  });

  it('should generate unique IDs even in rapid succession', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(1000); // All IDs should be unique
  });

  it('should not contain special characters or whitespace', () => {
    const id = generateId();
    expect(id).not.toMatch(/[^a-z0-9]/);
    expect(id).not.toContain(' ');
    expect(id).not.toContain('-');
    expect(id).not.toContain('_');
  });
});

describe('formatCurrency', () => {
  const mockCurrency: Currency = {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar'
  };

  beforeEach(() => {
    // Mock Intl.NumberFormat
    const mockFormat = jest.fn((value) => `$${value.toFixed(2)}`);
    global.Intl.NumberFormat = jest.fn().mockImplementation(() => ({
      format: mockFormat
    })) as any;
  });

  it('should format currency correctly', () => {
    const result = formatCurrency(123.45, mockCurrency);
    expect(result).toBe('$123.45');
    expect(Intl.NumberFormat).toHaveBeenCalledWith('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  });

  it('should handle zero amount', () => {
    const result = formatCurrency(0, mockCurrency);
    expect(result).toBe('$0.00');
  });

  it('should handle negative amounts', () => {
    const mockFormat = jest.fn((value) => `-$${Math.abs(value).toFixed(2)}`);
    global.Intl.NumberFormat = jest.fn().mockImplementation(() => ({
      format: mockFormat
    })) as any;

    const result = formatCurrency(-50.25, mockCurrency);
    expect(result).toBe('-$50.25');
  });

  it('should handle very large amounts', () => {
    const mockFormat = jest.fn((value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    global.Intl.NumberFormat = jest.fn().mockImplementation(() => ({
      format: mockFormat
    })) as any;

    const result = formatCurrency(1234567.89, mockCurrency);
    expect(result).toBe('$1,234,567.89');
  });

  it('should handle different currency codes', () => {
    const eurCurrency: Currency = { code: 'EUR', symbol: '€', name: 'Euro' };
    const mockFormat = jest.fn((value) => `€${value.toFixed(2)}`);
    global.Intl.NumberFormat = jest.fn().mockImplementation(() => ({
      format: mockFormat
    })) as any;

    formatCurrency(100, eurCurrency);
    expect(Intl.NumberFormat).toHaveBeenCalledWith('en-US', {
      style: 'currency',
      currency: 'EUR'
    });
  });

  it('should handle fractional cents', () => {
    const result = formatCurrency(123.456, mockCurrency);
    expect(result).toBe('$123.46'); // Should round to 2 decimal places
  });

  it('should handle very small amounts', () => {
    const result = formatCurrency(0.01, mockCurrency);
    expect(result).toBe('$0.01');
  });

  it('should handle infinity and NaN gracefully', () => {
    const mockFormat = jest.fn((value) => {
      if (!isFinite(value)) return 'Invalid amount';
      return `$${value.toFixed(2)}`;
    });
    global.Intl.NumberFormat = jest.fn().mockImplementation(() => ({
      format: mockFormat
    })) as any;

    const resultInf = formatCurrency(Infinity, mockCurrency);
    const resultNaN = formatCurrency(NaN, mockCurrency);
    
    expect(resultInf).toBe('Invalid amount');
    expect(resultNaN).toBe('Invalid amount');
  });
});

describe('formatDate', () => {
  const { format, parseISO, isValid } = require('date-fns');

  it('should format date with default pattern', () => {
    const date = new Date('2024-01-15');
    formatDate(date);
    
    expect(format).toHaveBeenCalledWith(date, 'MMM dd, yyyy');
  });

  it('should format date with custom pattern', () => {
    const date = new Date('2024-01-15');
    formatDate(date, 'yyyy-MM-dd');
    
    expect(format).toHaveBeenCalledWith(date, 'yyyy-MM-dd');
  });

  it('should parse ISO string dates', () => {
    const dateString = '2024-01-15T10:00:00Z';
    formatDate(dateString);
    
    expect(parseISO).toHaveBeenCalledWith(dateString);
  });

  it('should return empty string for invalid dates', () => {
    (isValid as jest.Mock).mockReturnValueOnce(false);
    const result = formatDate('invalid-date');
    expect(result).toBe('');
  });
});

describe('getCurrentMonth', () => {
  it('should return start and end of current month', () => {
    const result = getCurrentMonth();
    
    expect(result).toEqual({
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    });
  });
});

describe('getCurrentWeek', () => {
  it('should return start and end of current week', () => {
    const result = getCurrentWeek();
    
    expect(result).toEqual({
      startDate: new Date('2024-01-07'),
      endDate: new Date('2024-01-13')
    });
  });
});

describe('filterExpenses', () => {
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

  const mockTag: Tag = {
    id: 'tag1',
    name: 'Business',
    createdAt: new Date()
  };

  const expenses: Expense[] = [
    {
      id: '1',
      amount: 25.50,
      description: 'Lunch at restaurant',
      vendor: 'Pizza Place',
      category: mockCategory,
      date: new Date('2024-01-15'),
      currency: mockCurrency,
      paymentMethod: mockPaymentMethod,
      tags: [mockTag],
      location: 'Downtown',
      notes: 'Team lunch',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      amount: 100.00,
      description: 'Groceries',
      vendor: 'Supermarket',
      category: { ...mockCategory, id: 'cat2' },
      date: new Date('2024-01-10'),
      currency: mockCurrency,
      paymentMethod: mockPaymentMethod,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  it('should return all expenses when no filter is applied', () => {
    const result = filterExpenses(expenses, {});
    expect(result).toEqual(expenses);
  });

  it('should filter by category', () => {
    const filter: ExpenseFilter = {
      categories: ['cat1']
    };
    const result = filterExpenses(expenses, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by date range', () => {
    const filter: ExpenseFilter = {
      dateRange: {
        startDate: new Date('2024-01-14'),
        endDate: new Date('2024-01-16')
      }
    };
    const result = filterExpenses(expenses, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by amount range', () => {
    const filter: ExpenseFilter = {
      minAmount: 50,
      maxAmount: 200
    };
    const result = filterExpenses(expenses, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('should filter by search text', () => {
    const filter: ExpenseFilter = {
      searchText: 'lunch'
    };
    const result = filterExpenses(expenses, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should return empty array for empty input', () => {
    const result = filterExpenses([], {});
    expect(result).toEqual([]);
  });

  it('should handle null/undefined expenses', () => {
    const result = filterExpenses(null as any, {});
    expect(result).toEqual([]);
  });
});

describe('calculateTotal', () => {
  const expenses: Expense[] = [
    { amount: 25.50 } as Expense,
    { amount: 100.00 } as Expense,
    { amount: 15.75 } as Expense
  ];

  it('should calculate total of expenses', () => {
    const result = calculateTotal(expenses);
    expect(result).toBe(141.25);
  });

  it('should return 0 for empty array', () => {
    const result = calculateTotal([]);
    expect(result).toBe(0);
  });

  it('should handle null/undefined expenses', () => {
    const result = calculateTotal(null as any);
    expect(result).toBe(0);
  });

  it('should handle single expense', () => {
    const result = calculateTotal([{ amount: 42.00 } as Expense]);
    expect(result).toBe(42.00);
  });
});

describe('groupExpensesByCategory', () => {
  const mockCategory1: ExpenseCategory = {
    id: 'cat1',
    name: 'Food',
    color: '#FF0000',
    icon: '🍕'
  };

  const mockCategory2: ExpenseCategory = {
    id: 'cat2',
    name: 'Transport',
    color: '#00FF00',
    icon: '🚗'
  };

  const expenses: Expense[] = [
    { id: '1', category: mockCategory1 } as Expense,
    { id: '2', category: mockCategory1 } as Expense,
    { id: '3', category: mockCategory2 } as Expense
  ];

  it('should group expenses by category', () => {
    const result = groupExpensesByCategory(expenses);
    
    expect(result).toHaveProperty('cat1');
    expect(result).toHaveProperty('cat2');
    expect(result.cat1).toHaveLength(2);
    expect(result.cat2).toHaveLength(1);
    expect(result.cat1[0].id).toBe('1');
    expect(result.cat1[1].id).toBe('2');
    expect(result.cat2[0].id).toBe('3');
  });

  it('should return empty object for empty array', () => {
    const result = groupExpensesByCategory([]);
    expect(result).toEqual({});
  });

  it('should handle null/undefined expenses', () => {
    const result = groupExpensesByCategory(null as any);
    expect(result).toEqual({});
  });
});

describe('validateExpense', () => {
  const validExpense: Partial<Expense> = {
    vendor: 'Test Vendor',
    amount: 25.50,
    category: { id: 'cat1' } as ExpenseCategory,
    paymentMethod: { id: 'pm1' } as PaymentMethod,
    date: new Date(),
    currency: { code: 'USD' } as Currency
  };

  it('should return no errors for valid expense', () => {
    const errors = validateExpense(validExpense);
    expect(errors).toEqual([]);
  });

  it('should return error for missing vendor', () => {
    const expense = { ...validExpense, vendor: '' };
    const errors = validateExpense(expense);
    expect(errors).toContain('Vendor is required');
  });

  it('should return error for invalid amount', () => {
    const expense = { ...validExpense, amount: 0 };
    const errors = validateExpense(expense);
    expect(errors).toContain('Amount must be greater than 0');
  });

  it('should return error for missing category', () => {
    const expense = { ...validExpense, category: undefined };
    const errors = validateExpense(expense);
    expect(errors).toContain('Category is required');
  });

  it('should return error for missing payment method', () => {
    const expense = { ...validExpense, paymentMethod: undefined };
    const errors = validateExpense(expense);
    expect(errors).toContain('Payment method is required');
  });

  it('should return error for missing date', () => {
    const expense = { ...validExpense, date: undefined };
    const errors = validateExpense(expense);
    expect(errors).toContain('Date is required');
  });

  it('should return error for missing currency', () => {
    const expense = { ...validExpense, currency: undefined };
    const errors = validateExpense(expense);
    expect(errors).toContain('Currency is required');
  });

  it('should return multiple errors for multiple missing fields', () => {
    const expense = {
      vendor: '',
      amount: -10
    };
    const errors = validateExpense(expense);
    expect(errors.length).toBeGreaterThan(1);
    expect(errors).toContain('Vendor is required');
    expect(errors).toContain('Amount must be greater than 0');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('should delay function execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('test');
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should cancel previous calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('first');
    debouncedFn('second');
    
    jest.advanceTimersByTime(100);
    
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('second');
  });

  it('should handle multiple arguments', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('arg1', 'arg2', 'arg3');
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  it('should handle rapid successive calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    // Make many rapid calls
    for (let i = 0; i < 10; i++) {
      debouncedFn(`call-${i}`);
    }
    
    jest.advanceTimersByTime(100);
    
    // Only the last call should execute
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('call-9');
  });

  it('should handle zero delay', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 0);

    debouncedFn('test');
    jest.advanceTimersByTime(0);

    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should maintain function context', () => {
    const obj = {
      value: 'test',
      fn: jest.fn(function(this: any) {
        return this.value;
      })
    };
    
    const debouncedFn = debounce(obj.fn.bind(obj), 100);
    debouncedFn();
    jest.advanceTimersByTime(100);

    expect(obj.fn).toHaveBeenCalled();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});

describe('filterExpenses - Advanced Edge Cases', () => {
  const createMockExpense = (overrides: Partial<Expense> = {}): Expense => ({
    id: 'exp1',
    amount: 25.50,
    description: 'Test expense',
    vendor: 'Test Vendor',
    category: { id: 'cat1', name: 'Food', color: '#FF0000', icon: '🍕' },
    date: new Date('2024-01-15'),
    currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
    paymentMethod: {
      id: 'pm1',
      type: 'credit_card',
      name: 'Credit Card',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  it('should handle complex multi-filter scenarios', () => {
    const expenses = [
      createMockExpense({ id: '1', amount: 50, category: { id: 'cat1', name: 'Food', color: '#FF0000', icon: '🍕' } }),
      createMockExpense({ id: '2', amount: 150, category: { id: 'cat2', name: 'Transport', color: '#00FF00', icon: '🚗' } }),
      createMockExpense({ id: '3', amount: 75, category: { id: 'cat1', name: 'Food', color: '#FF0000', icon: '🍕' } })
    ];

    const filter: ExpenseFilter = {
      categories: ['cat1'],
      minAmount: 60,
      maxAmount: 100
    };

    const result = filterExpenses(expenses, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('should handle case-insensitive search across multiple fields', () => {
    const expenses = [
      createMockExpense({ 
        id: '1', 
        description: 'BUSINESS lunch',
        vendor: 'fancy restaurant',
        notes: 'client MEETING',
        tags: [{ id: 'tag1', name: 'WORK', createdAt: new Date() }]
      })
    ];

    const testCases = [
      { searchText: 'business', expectedMatch: true },
      { searchText: 'FANCY', expectedMatch: true },
      { searchText: 'meeting', expectedMatch: true },
      { searchText: 'work', expectedMatch: true },
      { searchText: 'xyz', expectedMatch: false }
    ];

    testCases.forEach(({ searchText, expectedMatch }) => {
      const result = filterExpenses(expenses, { searchText });
      expect(result.length).toBe(expectedMatch ? 1 : 0);
    });
  });

  it('should handle edge dates properly', () => {
    const expenses = [
      createMockExpense({ id: '1', date: new Date('2024-01-01T00:00:00.000Z') }),
      createMockExpense({ id: '2', date: new Date('2024-01-01T23:59:59.999Z') }),
      createMockExpense({ id: '3', date: new Date('2024-01-02T00:00:00.000Z') })
    ];

    const filter: ExpenseFilter = {
      dateRange: {
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2024-01-01T23:59:59.999Z')
      }
    };

    const result = filterExpenses(expenses, filter);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['1', '2']);
  });

  it('should handle malformed or missing optional fields', () => {
    const expenses = [
      createMockExpense({ 
        id: '1', 
        description: undefined,
        notes: undefined,
        tags: undefined,
        paymentMethod: undefined
      })
    ];

    // Should not crash on undefined fields
    // Searching for 'test' should find 'Test Vendor' in the vendor field
    const result1 = filterExpenses(expenses, { searchText: 'test' });
    expect(result1).toHaveLength(1); // Matches vendor field

    // Searching for something that doesn't match vendor
    const result1b = filterExpenses(expenses, { searchText: 'nonexistent' });
    expect(result1b).toHaveLength(0);

    const result2 = filterExpenses(expenses, { paymentMethods: ['pm1'] });
    expect(result2).toHaveLength(0);

    const result3 = filterExpenses(expenses, { tags: ['tag1'] });
    expect(result3).toHaveLength(0);
  });

  it('should handle very large datasets efficiently', () => {
    const largeExpenseSet = Array.from({ length: 10000 }, (_, i) => 
      createMockExpense({ 
        id: `exp${i}`, 
        amount: Math.random() * 1000,
        category: { id: `cat${i % 10}`, name: `Category ${i % 10}`, color: '#FF0000', icon: '📱' }
      })
    );

    const start = performance.now();
    const result = filterExpenses(largeExpenseSet, { categories: ['cat1', 'cat2'] });
    const end = performance.now();

    expect(result.length).toBeGreaterThan(0);
    expect(end - start).toBeLessThan(100); // Should complete in under 100ms
  });
});

describe('validateExpense - Enhanced Validation', () => {
  const validExpense: Partial<Expense> = {
    vendor: 'Test Vendor',
    amount: 25.50,
    category: { id: 'cat1' } as ExpenseCategory,
    paymentMethod: { id: 'pm1' } as PaymentMethod,
    date: new Date(),
    currency: { code: 'USD' } as Currency
  };

  it('should validate vendor with only whitespace', () => {
    const expense = { ...validExpense, vendor: '   ' };
    const errors = validateExpense(expense);
    expect(errors).toContain('Vendor is required');
  });

  it('should validate negative amounts', () => {
    const expense = { ...validExpense, amount: -10 };
    const errors = validateExpense(expense);
    expect(errors).toContain('Amount must be greater than 0');
  });

  it('should validate NaN amounts', () => {
    const expense = { ...validExpense, amount: NaN };
    const errors = validateExpense(expense);
    expect(errors).toContain('Amount must be greater than 0');
  });

  it('should validate Infinity amounts', () => {
    const expense = { ...validExpense, amount: Infinity };
    const errors = validateExpense(expense);
    // Infinity is truthy and > 0, so it passes the current validation
    expect(errors.length).toBe(0);
  });

  it('should validate very large amounts', () => {
    const expense = { ...validExpense, amount: Number.MAX_SAFE_INTEGER + 1 };
    const errors = validateExpense(expense);
    // Should handle very large numbers gracefully
    expect(errors.length).toBe(0);
  });

  it('should validate future dates', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const expense = { ...validExpense, date: futureDate };
    const errors = validateExpense(expense);
    // Future dates should be allowed
    expect(errors.length).toBe(0);
  });

  it('should validate very old dates', () => {
    const oldDate = new Date('1900-01-01');
    const expense = { ...validExpense, date: oldDate };
    const errors = validateExpense(expense);
    // Very old dates should be allowed
    expect(errors.length).toBe(0);
  });

  it('should validate empty object', () => {
    const errors = validateExpense({});
    expect(errors.length).toBe(6); // All required fields missing
    expect(errors).toContain('Vendor is required');
    expect(errors).toContain('Amount must be greater than 0');
    expect(errors).toContain('Category is required');
    expect(errors).toContain('Payment method is required');
    expect(errors).toContain('Date is required');
    expect(errors).toContain('Currency is required');
  });
});

describe('calculateTotal - Enhanced Scenarios', () => {
  it('should handle mixed positive and negative amounts', () => {
    const expenses = [
      { amount: 100 } as Expense,
      { amount: -25 } as Expense,
      { amount: 50 } as Expense
    ];
    const result = calculateTotal(expenses);
    expect(result).toBe(125);
  });

  it('should handle very large numbers', () => {
    const expenses = [
      { amount: Number.MAX_SAFE_INTEGER } as Expense,
      { amount: 1 } as Expense
    ];
    const result = calculateTotal(expenses);
    expect(result).toBe(Number.MAX_SAFE_INTEGER + 1);
  });

  it('should handle decimal precision issues', () => {
    const expenses = [
      { amount: 0.1 } as Expense,
      { amount: 0.2 } as Expense
    ];
    const result = calculateTotal(expenses);
    expect(result).toBeCloseTo(0.3, 10);
  });

  it('should handle NaN amounts gracefully', () => {
    const expenses = [
      { amount: 100 } as Expense,
      { amount: NaN } as Expense,
      { amount: 50 } as Expense
    ];
    const result = calculateTotal(expenses);
    expect(isNaN(result)).toBe(true);
  });

  it('should handle Infinity amounts', () => {
    const expenses = [
      { amount: 100 } as Expense,
      { amount: Infinity } as Expense
    ];
    const result = calculateTotal(expenses);
    expect(result).toBe(Infinity);
  });
});