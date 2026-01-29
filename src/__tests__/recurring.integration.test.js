/**
 * Integration tests for recurring transactions
 * Runs against local Supabase with seeded data
 *
 * Valid categories: 'Fixed Expenses', 'Rent/Mortgages', 'Food', 'Dogs',
 * 'Holidays & Birthdays', 'Adventure', 'Unexpected', 'Salary', 'Investments', 'Extra'
 */

describe('Recurring Transactions Integration', () => {
  describe('CRUD operations', () => {
    it('creates a recurring transaction', async () => {
      const newRecurring = {
        id: testId('rec'),
        household_id: TEST_IDS.HOUSEHOLD,
        amount: -50.0,
        currency: 'USD',
        category: 'Fixed Expenses',
        payer: 'Test User',
        description: 'Test Subscription',
        frequency: 'monthly',
        start_date: '2026-02-01',
        end_date: null,
        day_of_month: 1,
        is_active: true,
        created_by: TEST_IDS.USER,
      };

      trackForCleanup('recurring_transactions', newRecurring.id);

      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert(newRecurring)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.id).toBe(newRecurring.id);
      expect(data.amount).toBe(-50.0);
      expect(data.frequency).toBe('monthly');
    });

    it('reads existing recurring transactions', async () => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('household_id', TEST_IDS.HOUSEHOLD)
        .eq('is_active', true);

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThanOrEqual(3); // From seed data
      expect(data.some((r) => r.description === 'Monthly Rent')).toBe(true);
      expect(data.some((r) => r.description === 'Netflix')).toBe(true);
      expect(data.some((r) => r.description === 'Paycheck')).toBe(true);
    });

    it('updates a recurring transaction', async () => {
      // Create a test recurring to update
      const recurring = {
        id: testId('rec'),
        household_id: TEST_IDS.HOUSEHOLD,
        amount: -25.0,
        currency: 'USD',
        category: 'Fixed Expenses',
        payer: 'Test User',
        description: 'Will Update',
        frequency: 'monthly',
        start_date: '2026-02-01',
        is_active: true,
        created_by: TEST_IDS.USER,
      };

      trackForCleanup('recurring_transactions', recurring.id);

      await supabase.from('recurring_transactions').insert(recurring);

      // Update it
      const { data, error } = await supabase
        .from('recurring_transactions')
        .update({ amount: -30.0, description: 'Updated Description' })
        .eq('id', recurring.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.amount).toBe(-30.0);
      expect(data.description).toBe('Updated Description');
    });

    it('soft-deletes by setting is_active to false', async () => {
      // Create a test recurring to delete
      const recurring = {
        id: testId('rec'),
        household_id: TEST_IDS.HOUSEHOLD,
        amount: -10.0,
        currency: 'USD',
        category: 'Fixed Expenses',
        payer: 'Test User',
        description: 'Will Delete',
        frequency: 'monthly',
        start_date: '2026-02-01',
        is_active: true,
        created_by: TEST_IDS.USER,
      };

      trackForCleanup('recurring_transactions', recurring.id);

      await supabase.from('recurring_transactions').insert(recurring);

      // Soft delete
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ is_active: false })
        .eq('id', recurring.id);

      expect(error).toBeNull();

      // Verify it's not returned in active query
      const { data } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('id', recurring.id)
        .eq('is_active', true);

      expect(data).toHaveLength(0);
    });
  });

  describe('recurring exceptions', () => {
    it('creates a skip exception', async () => {
      const exception = {
        id: testId('exc'),
        recurring_id: TEST_IDS.RECURRING_RENT,
        occurrence_date: '2026-03-01',
        exception_type: 'skip',
        created_by: TEST_IDS.USER,
      };

      trackForCleanup('recurring_exceptions', exception.id);

      const { data, error } = await supabase
        .from('recurring_exceptions')
        .insert(exception)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.recurring_id).toBe(TEST_IDS.RECURRING_RENT);
      expect(data.occurrence_date).toBe('2026-03-01');
      expect(data.exception_type).toBe('skip');
    });

    it('prevents duplicate exceptions for same date', async () => {
      const exception1 = {
        id: testId('exc'),
        recurring_id: TEST_IDS.RECURRING_NETFLIX,
        occurrence_date: '2026-04-15',
        exception_type: 'skip',
        created_by: TEST_IDS.USER,
      };

      const exception2 = {
        id: testId('exc'),
        recurring_id: TEST_IDS.RECURRING_NETFLIX,
        occurrence_date: '2026-04-15', // Same date
        exception_type: 'skip',
        created_by: TEST_IDS.USER,
      };

      trackForCleanup('recurring_exceptions', exception1.id);
      trackForCleanup('recurring_exceptions', exception2.id);

      // First insert should succeed
      const { error: error1 } = await supabase
        .from('recurring_exceptions')
        .insert(exception1);
      expect(error1).toBeNull();

      // Second insert should fail (unique constraint)
      const { error: error2 } = await supabase
        .from('recurring_exceptions')
        .insert(exception2);
      expect(error2).not.toBeNull();
      expect(error2.code).toBe('23505'); // Unique violation
    });

    it('deletes an exception to undo skip', async () => {
      const exception = {
        id: testId('exc'),
        recurring_id: TEST_IDS.RECURRING_SALARY,
        occurrence_date: '2026-05-03',
        exception_type: 'skip',
        created_by: TEST_IDS.USER,
      };

      // Insert
      await supabase.from('recurring_exceptions').insert(exception);

      // Delete
      const { error } = await supabase
        .from('recurring_exceptions')
        .delete()
        .eq('id', exception.id);

      expect(error).toBeNull();

      // Verify deleted
      const { data } = await supabase
        .from('recurring_exceptions')
        .select('*')
        .eq('id', exception.id);

      expect(data).toHaveLength(0);
    });
  });

  describe('generated transactions', () => {
    it('creates a transaction with recurring fingerprint', async () => {
      const fingerprint = `recurring_${TEST_IDS.RECURRING_RENT}_2026-02-01`;
      const transaction = {
        id: testId('txn'),
        household_id: TEST_IDS.HOUSEHOLD,
        txn_date: '2026-02-01',
        currency: 'USD',
        amount: -1200.0,
        category: 'Fixed Expenses',
        payer: 'Together',
        description: 'Monthly Rent',
        is_flagged: false,
        source: 'recurring',
        fingerprint: fingerprint,
        recurring_fingerprint: fingerprint,
        created_by: TEST_IDS.USER,
      };

      trackForCleanup('transactions', transaction.id);

      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.source).toBe('recurring');
      expect(data.recurring_fingerprint).toBe(fingerprint);
    });

    it('prevents duplicate recurring transactions via fingerprint', async () => {
      const fingerprint = `recurring_${TEST_IDS.RECURRING_NETFLIX}_2026-02-15`;

      const txn1 = {
        id: testId('txn'),
        household_id: TEST_IDS.HOUSEHOLD,
        txn_date: '2026-02-15',
        currency: 'USD',
        amount: -15.99,
        category: 'Fixed Expenses',
        payer: 'Test User',
        description: 'Netflix',
        source: 'recurring',
        fingerprint: fingerprint,
        recurring_fingerprint: fingerprint,
        created_by: TEST_IDS.USER,
      };

      const txn2 = {
        ...txn1,
        id: testId('txn'),
        fingerprint: fingerprint, // Same fingerprint = duplicate
      };

      trackForCleanup('transactions', txn1.id);
      trackForCleanup('transactions', txn2.id);

      // First should succeed
      const { error: error1 } = await supabase
        .from('transactions')
        .insert(txn1);
      expect(error1).toBeNull();

      // Second should fail (fingerprint unique constraint)
      const { error: error2 } = await supabase
        .from('transactions')
        .insert(txn2);
      expect(error2).not.toBeNull();
    });

    it('queries transactions by recurring fingerprint', async () => {
      // Query the seeded recurring transaction
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('household_id', TEST_IDS.HOUSEHOLD)
        .not('recurring_fingerprint', 'is', null);

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0].source).toBe('recurring');
    });
  });

  describe('frequency validation', () => {
    it.each(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'])(
      'accepts frequency: %s',
      async (frequency) => {
        const recurring = {
          id: testId('rec'),
          household_id: TEST_IDS.HOUSEHOLD,
          amount: -10.0,
          currency: 'USD',
          category: 'Fixed Expenses',
          payer: 'Test User',
          description: `Test ${frequency}`,
          frequency,
          start_date: '2026-03-01',
          is_active: true,
          created_by: TEST_IDS.USER,
        };

        trackForCleanup('recurring_transactions', recurring.id);

        const { data, error } = await supabase
          .from('recurring_transactions')
          .insert(recurring)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data.frequency).toBe(frequency);
      }
    );

    it('rejects invalid frequency', async () => {
      const recurring = {
        id: testId('rec'),
        household_id: TEST_IDS.HOUSEHOLD,
        amount: -10.0,
        currency: 'USD',
        category: 'Fixed Expenses',
        payer: 'Test User',
        description: 'Invalid Frequency',
        frequency: 'invalid_frequency',
        start_date: '2026-03-01',
        is_active: true,
        created_by: TEST_IDS.USER,
      };

      const { error } = await supabase
        .from('recurring_transactions')
        .insert(recurring);

      expect(error).not.toBeNull();
    });
  });
});
