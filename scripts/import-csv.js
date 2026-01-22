#!/usr/bin/env node
/**
 * CLI CSV Import Script for ChiriBudget
 *
 * Usage:
 *   node scripts/import-csv.js <csv-file> [options]
 *
 * Options:
 *   --bank <name>         Bank format (interbank, pnc, bcp, bbva, scotiabank, other)
 *   --year <YYYY>         Transaction year (default: current year)
 *   --payer <name>        Default payer name
 *   --currency <code>     Default currency (USD or PEN)
 *   --household <id>      Household ID (required)
 *   --user <id>           User ID for created_by (required)
 *   --dry-run             Show parsed transactions without inserting
 *   --supabase-url <url>  Supabase project URL (or use NEXT_PUBLIC_SUPABASE_URL env var)
 *   --supabase-key <key>  Supabase anon key (or use NEXT_PUBLIC_SUPABASE_ANON_KEY env var)
 *
 * Examples:
 *   # Dry run to preview
 *   node scripts/import-csv.js statement.csv --bank interbank --year 2026 --payer Alex --household abc123 --user xyz789 --dry-run
 *
 *   # Actual import
 *   node scripts/import-csv.js statement.csv --bank interbank --year 2026 --payer Alex --household abc123 --user xyz789
 *
 * Environment variables (alternative to flags):
 *   NEXT_PUBLIC_SUPABASE_URL      - Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Dynamic import for ES modules
let Papa, createClient;

// Bank mappings (sync with csvParserUtils.js)
const SPANISH_MONTHS = {
  ene: '01',
  feb: '02',
  mar: '03',
  abr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  ago: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dic: '12',
};

const BANK_MAPPINGS = {
  interbank: {
    dateCol: 'Fecha',
    descriptionCol: 'Comercio',
    penAmountCol: 'S/',
    usdAmountCol: 'US$',
    dateFormat: 'DD-Mon',
    currency: 'PEN',
    isInterbank: true,
  },
  pnc: {
    dateCol: 'Date',
    descriptionCol: 'Description',
    withdrawalCol: 'Withdrawals',
    depositCol: 'Deposits',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
  },
  bcp: {
    dateCol: 'Fecha',
    descriptionCol: 'Descripcion',
    amountCol: 'Importe',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PEN',
  },
  bbva: {
    dateCol: 'Fecha',
    descriptionCol: 'Concepto',
    amountCol: 'Importe',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PEN',
  },
  scotiabank: {
    dateCol: 'Fecha',
    descriptionCol: 'Descripcion',
    amountCol: 'Monto',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PEN',
  },
  other: {
    dateCol: 'Date',
    descriptionCol: 'Description',
    amountCol: 'Amount',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
  },
};

const BANKS = ['interbank', 'pnc', 'bcp', 'bbva', 'scotiabank', 'other'];

function parseInterbankDate(dateStr, year) {
  if (!dateStr) return null;
  const cleanDate = dateStr.trim();
  const match = cleanDate.match(/^(\d{1,2})-([A-Za-z]{3})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const monthAbbr = match[2].toLowerCase();
  const month = SPANISH_MONTHS[monthAbbr];
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

function parseDate(dateStr, format, year) {
  if (!dateStr) return null;
  const cleanDate = dateStr.trim();
  let day, month, yearPart;

  if (format === 'DD-Mon') {
    return parseInterbankDate(cleanDate, year);
  }

  if (format === 'DD/MM/YYYY') {
    const parts = cleanDate.split('/');
    if (parts.length >= 2) {
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
      yearPart = parts[2] || year;
    }
  } else if (format === 'MM/DD/YYYY') {
    const parts = cleanDate.split('/');
    if (parts.length >= 2) {
      month = parts[0].padStart(2, '0');
      day = parts[1].padStart(2, '0');
      yearPart = parts[2] || year;
    }
  }

  if (day && month) {
    const fullYear =
      yearPart?.length === 2 ? `20${yearPart}` : yearPart || year;
    return `${fullYear}-${month}-${day}`;
  }

  return `${year}-01-01`;
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  const cleaned = amountStr.toString().replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

function generateFingerprint(
  householdId,
  currency,
  txnDate,
  amount,
  description
) {
  const base = `${householdId}|${currency}|${txnDate}|${Number(amount).toFixed(2)}|${(description || '').toLowerCase().trim()}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = (h * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `fp_${h}`;
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function showHelp() {
  console.log(`
CLI CSV Import Script for ChiriBudget

Usage:
  node scripts/import-csv.js <csv-file> [options]

Required Options:
  --bank <name>         Bank format (interbank, pnc, bcp, bbva, scotiabank, other)
  --year <YYYY>         Transaction year (default: current year)
  --payer <name>        Default payer name (must match household member)
  --household <id>      Household ID (from Supabase households table)
  --user <id>           User ID (from Supabase auth.users table)

Optional Flags:
  --currency <code>     Default currency (USD or PEN, overrides bank default)
  --dry-run             Preview parsed transactions without inserting
  --supabase-url <url>  Supabase project URL (or set NEXT_PUBLIC_SUPABASE_URL)
  --supabase-key <key>  Supabase anon key (or set NEXT_PUBLIC_SUPABASE_ANON_KEY)
  --help                Show this help message

Examples:
  # Dry run to preview
  node scripts/import-csv.js statement.csv \\
    --bank interbank \\
    --year 2026 \\
    --payer Alex \\
    --household abc123 \\
    --user xyz789 \\
    --dry-run

  # Actual import
  node scripts/import-csv.js statement.csv \\
    --bank interbank \\
    --year 2026 \\
    --payer Alex \\
    --household abc123 \\
    --user xyz789

Supported Banks:
  - interbank  (Interbank Peru - DD-Mon format, S/ and US$ columns)
  - pnc        (PNC Bank US - MM/DD/YYYY, Withdrawals/Deposits columns)
  - bcp        (BCP Peru - DD/MM/YYYY, Importe column)
  - bbva       (BBVA Peru - DD/MM/YYYY, Importe column)
  - scotiabank (Scotiabank Peru - DD/MM/YYYY, Monto column)
  - other      (Generic - Date, Description, Amount columns)

Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL      Supabase project URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY Supabase anon key
`);
}

function parseArgs() {
  const args = process.argv.slice(2);

  // Check for help flag first
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const config = {
    csvFile: null,
    bank: null,
    year: new Date().getFullYear(),
    payer: null,
    currency: null,
    householdId: null,
    userId: null,
    dryRun: false,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      switch (key) {
        case 'bank':
          config.bank = value;
          i++;
          break;
        case 'year':
          config.year = parseInt(value);
          i++;
          break;
        case 'payer':
          config.payer = value;
          i++;
          break;
        case 'currency':
          config.currency = value;
          i++;
          break;
        case 'household':
          config.householdId = value;
          i++;
          break;
        case 'user':
          config.userId = value;
          i++;
          break;
        case 'supabase-url':
          config.supabaseUrl = value;
          i++;
          break;
        case 'supabase-key':
          config.supabaseKey = value;
          i++;
          break;
        case 'dry-run':
          config.dryRun = true;
          break;
        default:
          console.warn(`Unknown option: ${arg}`);
      }
    } else if (!config.csvFile) {
      config.csvFile = arg;
    }
  }

  return config;
}

async function main() {
  // Dynamic imports
  Papa = (await import('papaparse')).default;
  const supabaseModule = await import('@supabase/supabase-js');
  createClient = supabaseModule.createClient;

  const config = parseArgs();

  // Validate required args
  if (!config.csvFile) {
    console.error('❌ Error: CSV file path required');
    console.log('\nUsage: node scripts/import-csv.js <csv-file> [options]');
    console.log('Run with --help for more information');
    process.exit(1);
  }

  if (!fs.existsSync(config.csvFile)) {
    console.error(`❌ Error: File not found: ${config.csvFile}`);
    process.exit(1);
  }

  if (!config.householdId) {
    console.error('❌ Error: --household <id> required');
    process.exit(1);
  }

  if (!config.userId) {
    console.error('❌ Error: --user <id> required');
    process.exit(1);
  }

  if (!config.supabaseUrl || !config.supabaseKey) {
    console.error('❌ Error: Supabase credentials required');
    console.log(
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars'
    );
    console.log('Or use --supabase-url and --supabase-key flags');
    process.exit(1);
  }

  // Prompt for missing metadata
  if (!config.bank) {
    console.log('\nAvailable banks:', BANKS.join(', '));
    config.bank = await prompt('Bank format: ');
    if (!BANKS.includes(config.bank)) {
      console.error(`❌ Invalid bank. Choose from: ${BANKS.join(', ')}`);
      process.exit(1);
    }
  }

  if (!config.payer) {
    config.payer = await prompt('Default payer name: ');
  }

  const mapping = BANK_MAPPINGS[config.bank];
  if (!mapping) {
    console.error(`❌ Unknown bank format: ${config.bank}`);
    process.exit(1);
  }

  if (!config.currency) {
    config.currency = mapping.currency; // Use bank default
  }

  console.log('\n📋 Configuration:');
  console.log(`  File: ${config.csvFile}`);
  console.log(`  Bank: ${config.bank}`);
  console.log(`  Year: ${config.year}`);
  console.log(`  Payer: ${config.payer}`);
  console.log(`  Currency: ${config.currency}`);
  console.log(`  Household ID: ${config.householdId}`);
  console.log(`  Dry Run: ${config.dryRun ? 'Yes' : 'No'}`);

  // Read and parse CSV
  console.log('\n🔍 Parsing CSV...');
  const csvContent = fs.readFileSync(config.csvFile, 'utf-8');
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0) {
    console.error('❌ CSV parsing errors:', parseResult.errors);
    process.exit(1);
  }

  const transactions = [];
  const unparseable = [];

  for (let rowIndex = 0; rowIndex < parseResult.data.length; rowIndex++) {
    const row = parseResult.data[rowIndex];

    // Find date column (case-insensitive)
    const dateKey = Object.keys(row).find(
      (k) => k.toLowerCase() === mapping.dateCol.toLowerCase()
    );
    const descKey = Object.keys(row).find(
      (k) => k.toLowerCase() === mapping.descriptionCol.toLowerCase()
    );

    let amount = 0;
    let currency = config.currency;

    // Bank-specific amount parsing
    if (config.bank === 'pnc') {
      const withdrawalKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes('withdrawal')
      );
      const depositKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes('deposit')
      );
      const withdrawal = parseAmount(row[withdrawalKey]);
      const deposit = parseAmount(row[depositKey]);
      amount = deposit > 0 ? deposit : -Math.abs(withdrawal);
    } else if (config.bank === 'interbank') {
      const penKey = Object.keys(row).find((k) => k.trim() === 'S/');
      const usdKey = Object.keys(row).find((k) => k.trim() === 'US$');
      const penAmount = parseAmount(row[penKey]);
      const usdAmount = parseAmount(row[usdKey]);

      if (usdAmount !== 0) {
        amount = -Math.abs(usdAmount);
        currency = 'USD';
      } else if (penAmount !== 0) {
        amount = -Math.abs(penAmount);
        currency = 'PEN';
      }
    } else {
      const amountKey = Object.keys(row).find(
        (k) => k.toLowerCase() === mapping.amountCol?.toLowerCase()
      );
      amount = parseAmount(row[amountKey]);
    }

    const dateStr = row[dateKey];
    const description = row[descKey]?.trim() || '';

    // Track unparseable rows
    if (!dateStr || amount === 0) {
      const hasContent = Object.values(row).some(
        (v) => v && v.toString().trim()
      );
      if (hasContent) {
        unparseable.push({
          rowNumber: rowIndex + 2,
          reason: !dateStr ? 'missing_date' : 'zero_amount',
          rawData: Object.values(row).slice(0, 4).join(' | '),
        });
      }
      continue;
    }

    const txnDate = parseDate(dateStr, mapping.dateFormat, config.year);

    transactions.push({
      household_id: config.householdId,
      txn_date: txnDate,
      currency,
      description,
      amount,
      category: 'Unexpected',
      payer: config.payer,
      is_flagged: false,
      source: 'import',
      status: 'pending',
      created_by: config.userId,
      fingerprint: generateFingerprint(
        config.householdId,
        currency,
        txnDate,
        amount,
        description
      ),
    });
  }

  console.log(`\n✅ Parsed ${transactions.length} transactions`);
  if (unparseable.length > 0) {
    console.log(`⚠️  ${unparseable.length} rows could not be parsed:`);
    unparseable.slice(0, 5).forEach((row) => {
      console.log(`   Row ${row.rowNumber}: ${row.reason} - ${row.rawData}`);
    });
    if (unparseable.length > 5) {
      console.log(`   ... and ${unparseable.length - 5} more`);
    }
  }

  if (transactions.length === 0) {
    console.error('❌ No valid transactions found');
    process.exit(1);
  }

  // Show preview
  console.log('\n📄 Preview (first 3):');
  transactions.slice(0, 3).forEach((tx, i) => {
    console.log(
      `  ${i + 1}. ${tx.txn_date} | ${tx.currency} ${tx.amount} | ${tx.description.slice(0, 40)}`
    );
  });

  if (config.dryRun) {
    console.log('\n🔍 Dry run complete. No data was inserted.');
    return;
  }

  // Initialize Supabase client
  const supabase = createClient(config.supabaseUrl, config.supabaseKey);

  // Compute date range
  const dates = transactions.map((tx) => tx.txn_date).sort();
  const dateRangeStart = dates[0];
  const dateRangeEnd = dates[dates.length - 1];
  const month = dateRangeStart?.slice(0, 7) || `${config.year}-01`;

  // Create display name
  const monthDate = new Date(month + '-01');
  const monthName = monthDate.toLocaleString('en', { month: 'short' });
  const displayName = `${config.bank.toUpperCase()} ${monthName} ${config.year}`;

  console.log('\n💾 Creating import batch...');

  // Create import batch
  const { data: batchData, error: batchError } = await supabase
    .from('import_batches')
    .insert({
      household_id: config.householdId,
      currency: config.currency,
      month,
      source_bank: config.bank,
      default_payer: config.payer,
      txn_year: config.year,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
      display_name: displayName,
      raw_payload: parseResult.data,
      status: 'staged',
      created_by: config.userId,
    })
    .select('id')
    .single();

  if (batchError) {
    console.error('❌ Failed to create import batch:', batchError.message);
    process.exit(1);
  }

  const batchId = batchData.id;
  console.log(`✅ Batch created: ${displayName} (ID: ${batchId})`);

  // Insert transactions
  console.log('\n💾 Inserting transactions...');
  let insertedCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (const tx of transactions) {
    const { error: txError } = await supabase
      .from('transactions')
      .insert({ ...tx, import_batch_id: batchId });

    if (txError) {
      if (txError.code === '23505') {
        skippedCount++;
      } else {
        errors.push({ tx, error: txError.message });
      }
    } else {
      insertedCount++;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`  Inserted: ${insertedCount}`);
  console.log(`  Duplicates skipped: ${skippedCount}`);
  if (errors.length > 0) {
    console.log(`  Errors: ${errors.length}`);
    errors.slice(0, 3).forEach((e) => {
      console.log(`    ${e.tx.description}: ${e.error}`);
    });
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
