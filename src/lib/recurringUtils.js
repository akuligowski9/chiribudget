/**
 * Recurring transactions utility functions
 * CB-035: Recurring Transactions
 */

/**
 * Generate a unique fingerprint for a recurring transaction occurrence
 * @param {string} recurringId - The recurring transaction definition ID
 * @param {string} date - The occurrence date (YYYY-MM-DD)
 * @returns {string} Fingerprint in format: recurring_{id}_{date}
 */
export function generateRecurringFingerprint(recurringId, date) {
  return `recurring_${recurringId}_${date}`;
}

/**
 * Format a Date object to YYYY-MM-DD string
 * @param {Date} date
 * @returns {string}
 */
export function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to Date object (local timezone)
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseDateString(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the effective day for a month, handling month-end edge cases
 * e.g., day 31 in February becomes 28 (or 29 in leap year)
 * @param {number} year
 * @param {number} month - 0-indexed month
 * @param {number} targetDay - desired day of month
 * @returns {number} - actual day to use
 */
function getEffectiveDay(year, month, targetDay) {
  // Get the last day of the target month
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(targetDay, lastDay);
}

/**
 * Add months to a date, handling month-end edge cases
 * @param {Date} date - starting date
 * @param {number} months - months to add
 * @param {number} targetDay - original day of month to preserve
 * @returns {Date}
 */
function addMonths(date, months, targetDay) {
  const newMonth = date.getMonth() + months;
  const newYear = date.getFullYear() + Math.floor(newMonth / 12);
  const normalizedMonth = ((newMonth % 12) + 12) % 12;
  const effectiveDay = getEffectiveDay(newYear, normalizedMonth, targetDay);
  return new Date(newYear, normalizedMonth, effectiveDay);
}

/**
 * Add years to a date, handling leap year edge cases
 * @param {Date} date - starting date
 * @param {number} years - years to add
 * @param {number} targetMonth - original month (0-indexed)
 * @param {number} targetDay - original day
 * @returns {Date}
 */
function addYears(date, years, targetMonth, targetDay) {
  const newYear = date.getFullYear() + years;
  const effectiveDay = getEffectiveDay(newYear, targetMonth, targetDay);
  return new Date(newYear, targetMonth, effectiveDay);
}

/**
 * Get the next occurrence date for a recurring transaction
 * @param {Object} recurring - recurring transaction definition
 * @param {string} afterDate - find occurrence after this date (YYYY-MM-DD)
 * @returns {string|null} - next occurrence date or null if ended
 */
export function getNextOccurrence(recurring, afterDate) {
  const after = parseDateString(afterDate);
  const start = parseDateString(recurring.start_date);
  const end = recurring.end_date ? parseDateString(recurring.end_date) : null;

  // Get the target day from day_of_month or start_date
  const targetDay = recurring.day_of_month || start.getDate();
  const targetMonth = start.getMonth();

  let current = new Date(start);

  // Find the first occurrence after afterDate
  while (current <= after) {
    current = getNextDateByFrequency(
      current,
      recurring.frequency,
      targetDay,
      targetMonth
    );

    // Check if we've passed the end date
    if (end && current > end) {
      return null;
    }
  }

  // Check end date
  if (end && current > end) {
    return null;
  }

  return formatDateString(current);
}

/**
 * Get the next date based on frequency
 * @param {Date} current
 * @param {string} frequency
 * @param {number} targetDay
 * @param {number} targetMonth
 * @returns {Date}
 */
function getNextDateByFrequency(current, frequency, targetDay, targetMonth) {
  switch (frequency) {
    case 'daily':
      return new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1
      );
    case 'weekly':
      return new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 7
      );
    case 'biweekly':
      return new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 14
      );
    case 'monthly':
      return addMonths(current, 1, targetDay);
    case 'yearly':
      return addYears(current, 1, targetMonth, targetDay);
    default:
      return addMonths(current, 1, targetDay);
  }
}

/**
 * Check if an occurrence should be generated (not skipped)
 * @param {Object} recurring - recurring transaction definition
 * @param {string} date - occurrence date (YYYY-MM-DD)
 * @param {Array} exceptions - array of exception records
 * @returns {boolean}
 */
export function shouldGenerateOccurrence(recurring, date, exceptions = []) {
  // Check if this date is in the exceptions list
  const isSkipped = exceptions.some(
    (ex) =>
      ex.recurring_id === recurring.id &&
      ex.occurrence_date === date &&
      ex.exception_type === 'skip'
  );

  return !isSkipped;
}

/**
 * Calculate all occurrences within a date range
 * @param {Object} recurring - recurring transaction definition
 * @param {string} startDate - range start (YYYY-MM-DD)
 * @param {string} endDate - range end (YYYY-MM-DD)
 * @returns {string[]} - array of occurrence dates
 */
export function calculateOccurrences(recurring, startDate, endDate) {
  const occurrences = [];
  const rangeStart = parseDateString(startDate);
  const rangeEnd = parseDateString(endDate);
  const recStart = parseDateString(recurring.start_date);
  const recEnd = recurring.end_date
    ? parseDateString(recurring.end_date)
    : null;

  // If recurring hasn't started yet within our range, skip
  if (recStart > rangeEnd) {
    return occurrences;
  }

  // Get target day from day_of_month or start_date
  const targetDay = recurring.day_of_month || recStart.getDate();
  const targetMonth = recStart.getMonth();

  // Start from the recurring start date
  let current = new Date(recStart);

  // For biweekly, we need to track from the actual start
  const biweeklyStartTime = recStart.getTime();

  while (current <= rangeEnd) {
    // Check if within recurring's own end date
    if (recEnd && current > recEnd) {
      break;
    }

    // Check if within query range
    if (current >= rangeStart && current <= rangeEnd) {
      occurrences.push(formatDateString(current));
    }

    // Move to next occurrence
    if (recurring.frequency === 'biweekly') {
      // For biweekly, calculate based on days since start
      const daysSinceStart = Math.round(
        (current.getTime() - biweeklyStartTime) / (1000 * 60 * 60 * 24)
      );
      const nextDays = daysSinceStart + 14;
      current = new Date(recStart.getTime() + nextDays * 24 * 60 * 60 * 1000);
    } else {
      current = getNextDateByFrequency(
        current,
        recurring.frequency,
        targetDay,
        targetMonth
      );
    }
  }

  return occurrences;
}

/**
 * Generate a transaction object from a recurring definition
 * @param {Object} recurring - recurring transaction definition
 * @param {string} occurrenceDate - the date for this occurrence
 * @param {string} householdId - household ID
 * @param {string} userId - creating user ID
 * @returns {Object} - transaction object ready for insert
 */
export function generateTransactionFromRecurring(
  recurring,
  occurrenceDate,
  householdId,
  userId
) {
  return {
    household_id: householdId,
    txn_date: occurrenceDate,
    currency: recurring.currency,
    description: recurring.description || '',
    amount: Number(recurring.amount),
    category: recurring.category,
    payer: recurring.payer,
    is_flagged: false,
    flag_reason: null,
    source: 'recurring',
    fingerprint: generateRecurringFingerprint(recurring.id, occurrenceDate),
    recurring_fingerprint: generateRecurringFingerprint(
      recurring.id,
      occurrenceDate
    ),
    created_by: userId,
  };
}

/**
 * Filter out occurrences that already exist as transactions
 * @param {string[]} occurrences - array of occurrence dates
 * @param {string} recurringId - recurring transaction ID
 * @param {Set<string>|Array<string>} existingFingerprints - fingerprints that exist
 * @returns {string[]} - filtered occurrences
 */
export function filterExistingOccurrences(
  occurrences,
  recurringId,
  existingFingerprints
) {
  const fingerprintSet =
    existingFingerprints instanceof Set
      ? existingFingerprints
      : new Set(existingFingerprints);

  return occurrences.filter((date) => {
    const fingerprint = generateRecurringFingerprint(recurringId, date);
    return !fingerprintSet.has(fingerprint);
  });
}

/**
 * Get all frequencies with their translation keys
 * @returns {Array<{value: string, labelKey: string}>}
 */
export function getFrequencyOptions() {
  return [
    { value: 'daily', labelKey: 'recurring.frequency.daily' },
    { value: 'weekly', labelKey: 'recurring.frequency.weekly' },
    { value: 'biweekly', labelKey: 'recurring.frequency.biweekly' },
    { value: 'monthly', labelKey: 'recurring.frequency.monthly' },
    { value: 'yearly', labelKey: 'recurring.frequency.yearly' },
  ];
}
