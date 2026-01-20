import '@testing-library/jest-dom';

// Mock next-intl to avoid ESM issues in tests
// Load English translations for testing
const enMessages = require('./messages/en.json');

// Helper to get nested translation value
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

jest.mock('next-intl', () => ({
  useTranslations: (namespace) => {
    return (key, params) => {
      // Get the full path: namespace.key
      const fullPath = namespace ? `${namespace}.${key}` : key;
      let value = getNestedValue(enMessages, fullPath);

      if (value === undefined) {
        // Try just the key without namespace
        value = getNestedValue(enMessages, key);
      }

      if (value === undefined) {
        return key; // Return key if translation not found
      }

      // Handle interpolation like {count}, {currency}, etc.
      if (params && typeof value === 'string') {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          value = value.replace(
            new RegExp(`\\{${paramKey}\\}`, 'g'),
            String(paramValue)
          );
        });
      }

      return value;
    };
  },
  useLocale: () => 'en',
  useMessages: () => enMessages,
  useTimeZone: () => 'UTC',
  useNow: () => new Date(),
  useFormatter: () => ({
    number: (n) => String(n),
    dateTime: (d) => String(d),
  }),
  NextIntlClientProvider: ({ children }) => children,
}));

// Mock localStorage with demo mode enabled by default
const localStorageMock = (() => {
  let store = {
    chiribudget_demoMode: 'true', // Force demo mode in all tests
  };

  return {
    getItem: jest.fn((key) => store[key] ?? null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = { chiribudget_demoMode: 'true' };
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Reset localStorage mock before each test
beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
});

// Mock OfflineContext for tests
jest.mock('@/contexts/OfflineContext', () => ({
  useOffline: () => ({
    isOnline: true,
    isOffline: false,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    syncError: null,
    conflicts: [],
    syncNow: jest.fn(),
    addTransaction: jest.fn(),
    updateTransaction: jest.fn(),
    deleteTransaction: jest.fn(),
    getOfflineTxns: jest.fn().mockResolvedValue([]),
    clearOfflineData: jest.fn(),
    refreshPendingCount: jest.fn(),
    isInitialized: true,
  }),
  OfflineProvider: ({ children }) => children,
}));
