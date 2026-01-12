describe('Form validation', () => {
  describe('Date validation', () => {
    const validateDate = (date) => {
      const today = new Date().toISOString().slice(0, 10);
      if (date > today) {
        return 'Date cannot be in the future';
      }
      return null;
    };

    it('allows today', () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(validateDate(today)).toBeNull();
    });

    it('allows past dates', () => {
      expect(validateDate('2024-01-15')).toBeNull();
      expect(validateDate('2023-06-01')).toBeNull();
    });

    it('rejects future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      expect(validateDate(tomorrowStr)).toBe('Date cannot be in the future');
    });

    it('rejects far future dates', () => {
      expect(validateDate('2030-12-31')).toBe('Date cannot be in the future');
    });
  });

  describe('Amount validation', () => {
    const MAX_AMOUNT_USD = 50000;
    const MAX_AMOUNT_PEN = 162500; // 50000 * 3.25

    const validateAmount = (value, currency) => {
      if (!value || value.trim() === '') {
        return 'Amount is required';
      }
      const num = Number(value);
      if (isNaN(num) || !Number.isFinite(num)) {
        return 'Enter a valid number';
      }
      if (num <= 0) {
        return 'Amount must be greater than 0';
      }
      const max = currency === 'USD' ? MAX_AMOUNT_USD : MAX_AMOUNT_PEN;
      if (num > max) {
        return `Amount cannot exceed ${currency} ${max.toLocaleString()}`;
      }
      return null;
    };

    it('requires amount', () => {
      expect(validateAmount('', 'USD')).toBe('Amount is required');
      expect(validateAmount('  ', 'USD')).toBe('Amount is required');
    });

    it('rejects invalid numbers', () => {
      expect(validateAmount('abc', 'USD')).toBe('Enter a valid number');
      expect(validateAmount('12.34.56', 'USD')).toBe('Enter a valid number');
    });

    it('rejects zero and negative amounts', () => {
      expect(validateAmount('0', 'USD')).toBe('Amount must be greater than 0');
      expect(validateAmount('-50', 'USD')).toBe(
        'Amount must be greater than 0'
      );
    });

    it('allows valid amounts', () => {
      expect(validateAmount('50', 'USD')).toBeNull();
      expect(validateAmount('123.45', 'USD')).toBeNull();
      expect(validateAmount('49999.99', 'USD')).toBeNull();
    });

    it('rejects amounts over USD max', () => {
      expect(validateAmount('50001', 'USD')).toBe(
        'Amount cannot exceed USD 50,000'
      );
      expect(validateAmount('100000', 'USD')).toBe(
        'Amount cannot exceed USD 50,000'
      );
    });

    it('rejects amounts over PEN max', () => {
      expect(validateAmount('162501', 'PEN')).toBe(
        'Amount cannot exceed PEN 162,500'
      );
      expect(validateAmount('200000', 'PEN')).toBe(
        'Amount cannot exceed PEN 162,500'
      );
    });

    it('allows higher amounts in PEN than USD', () => {
      // 100000 is over USD max but under PEN max
      expect(validateAmount('100000', 'USD')).toBe(
        'Amount cannot exceed USD 50,000'
      );
      expect(validateAmount('100000', 'PEN')).toBeNull();
    });
  });
});
