#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ── Constants ─────────────────────────────────────────────────────────────
const VALID_ARTICLES = ['der', 'die', 'das'];
const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_CATEGORIES = [
  'people',
  'animals',
  'home',
  'furniture',
  'food',
  'body',
  'clothing',
  'nature',
  'places',
  'transportation',
  'time',
  'weather',
  'education',
  'money',
  'communication',
  'health',
  'colors',
  'general',
];

const SEEDS_DIR = path.join(__dirname, '../database/seeds/nouns');

// ── Helper Functions ──────────────────────────────────────────────────────

/**
 * Escape special characters in strings for TypeScript output
 */
function escapeString(str) {
  if (!str) return str;
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

/**
 * Convert filename to camelCase export name
 * Example: v2-book-words-a1-8.csv → v2BookWordsA1_8
 */
function toCamelCase(filename) {
  // Remove .csv extension
  let name = filename.replace(/\.csv$/, '');

  // Split by hyphens and underscores
  const parts = name.split(/[-_]/);

  // Capitalize each part except the first
  let result = parts
    .map((part, index) => {
      // Keep numbers and first part lowercase, capitalize others
      if (index === 0) return part;
      if (/^\d+$/.test(part)) return part; // Keep numbers as-is
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');

  // Replace any remaining hyphens with underscores
  result = result.replace(/-/g, '_');

  return result;
}

/**
 * Parse CSV content into rows
 */
function parseCSV(content) {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const header = lines[0].split(',').map((h) => h.trim());
  const expectedHeader = ['german', 'article', 'plural', 'english', 'level', 'category'];

  // Validate header
  if (header.length !== expectedHeader.length || !header.every((h, i) => h === expectedHeader[i])) {
    throw new Error(`Invalid CSV header. Expected: ${expectedHeader.join(',')}`);
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = line.split(',').map((v) => v.trim());
    if (values.length !== header.length) {
      throw new Error(`Line ${i + 1}: Expected ${header.length} columns, got ${values.length}`);
    }

    const row = {};
    header.forEach((key, index) => {
      row[key] = values[index] || null;
    });

    rows.push({ lineNumber: i + 1, data: row });
  }

  return rows;
}

/**
 * Load all existing seed files to check for duplicates
 */
function loadExistingSeeds() {
  const existing = new Map();

  // Find all .ts files in the seeds directory
  const files = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts');

  for (const file of files) {
    const filePath = path.join(SEEDS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract noun entries using regex (simple approach)
    // Match patterns like: german: 'Hund', article: 'der',
    const matches = content.matchAll(/german:\s*'([^']+)'[^}]*article:\s*'(der|die|das)'/g);

    for (const match of matches) {
      const german = match[1];
      const article = match[2];
      const key = `${german}|${article}`;
      existing.set(key, file);
    }
  }

  return existing;
}

/**
 * Validate a single row
 */
function validateRow(row, lineNumber, existingSeeds) {
  const errors = [];
  const { german, article, plural, english, level, category } = row;

  // Required fields
  if (!german) {
    errors.push(`Line ${lineNumber}: 'german' field is required`);
  }

  if (!english) {
    errors.push(`Line ${lineNumber}: 'english' field is required`);
  }

  // Article validation
  if (!VALID_ARTICLES.includes(article)) {
    errors.push(`Line ${lineNumber}: article must be one of: ${VALID_ARTICLES.join(', ')} (found: "${article}")`);
  }

  // Level validation
  if (!VALID_LEVELS.includes(level)) {
    errors.push(`Line ${lineNumber}: level must be one of: ${VALID_LEVELS.join(', ')} (found: "${level}")`);
  }

  // Category validation
  if (!VALID_CATEGORIES.includes(category)) {
    const suggestion = VALID_CATEGORIES.find((c) => c.includes(category.toLowerCase()));
    const hint = suggestion ? ` (did you mean "${suggestion}"?)` : '';
    errors.push(`Line ${lineNumber}: invalid category "${category}"${hint}. Valid categories: ${VALID_CATEGORIES.join(', ')}`);
  }

  // Duplicate check
  if (german && article && VALID_ARTICLES.includes(article)) {
    const key = `${german}|${article}`;
    if (existingSeeds.has(key)) {
      errors.push(`Line ${lineNumber}: duplicate noun "${german}" with article "${article}" (already exists in ${existingSeeds.get(key)})`);
    }
  }

  return errors;
}

/**
 * Generate TypeScript code from validated rows
 */
function generateTypeScript(rows, exportName, csvFilename) {
  const today = new Date().toISOString().split('T')[0];

  let code = `import type { SeedNoun } from '@/types/database';\n\n`;
  code += `/**\n`;
  code += ` * Generated from CSV on ${today}\n`;
  code += ` * Source: ${csvFilename}\n`;
  code += ` * Total entries: ${rows.length}\n`;
  code += ` */\n`;
  code += `export const ${exportName}: SeedNoun[] = [\n`;

  for (const { data } of rows) {
    const { german, article, plural, english, level, category } = data;

    code += `  {\n`;
    code += `    german: '${escapeString(german)}',\n`;
    code += `    article: '${article}',\n`;
    code += `    plural: ${plural ? `'${escapeString(plural)}'` : 'null'},\n`;
    code += `    english: '${escapeString(english)}',\n`;
    code += `    level: '${level}',\n`;
    code += `    category: '${category}',\n`;
    code += `  },\n`;
  }

  code += `];\n`;

  return code;
}

/**
 * Print success message with next steps
 */
function printSuccess(outputPath, exportName, count, skippedCount) {
  console.log('\n✅ Successfully generated TypeScript seed file!\n');
  console.log(`📄 Output: ${outputPath}`);
  console.log(`📊 Total nouns: ${count}`);
  if (skippedCount > 0) {
    console.log(`⏭️  Skipped duplicates: ${skippedCount}`);
  }
  console.log(`📦 Export name: ${exportName}\n`);
  console.log('📋 Next Steps:\n');
  console.log(`1. Review the generated file:`);
  console.log(`   ${outputPath}\n`);
  console.log(`2. Add import to database/seeds/nouns/index.ts:`);
  console.log(`   import { ${exportName} } from './${path.basename(outputPath, '.ts')}';\n`);
  console.log(`3. Add version entry to nounSeedVersions array:`);
  console.log(`   { version: 'X.X.X_description', nouns: ${exportName} },\n`);
  console.log(`4. Test the app to verify seeding works correctly.\n`);
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
CSV to TypeScript Seed File Generator

Usage:
  npm run seed:csv -- <csv-filename>

Arguments:
  csv-filename    Name of the CSV file in database/seeds/nouns/ directory

Examples:
  npm run seed:csv -- v2-book-words-a1-8.csv
  npm run seed:csv -- --help

CSV Format:
  Required columns: german,article,plural,english,level,category
  - german: German word (required)
  - article: der, die, or das (required)
  - plural: Plural form (optional, leave empty for null)
  - english: English translation (required)
  - level: A1, A2, B1, B2, C1, or C2 (required)
  - category: One of 18 valid categories (required)

Valid Categories:
  ${VALID_CATEGORIES.join(', ')}
`);
}

// ── Main Function ─────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Show help
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const csvFilename = args[0];

  // Validate CSV file path
  const csvPath = path.join(SEEDS_DIR, csvFilename);
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: CSV file not found at ${csvPath}`);
    console.error(`\nMake sure the file exists in: ${SEEDS_DIR}`);
    process.exit(1);
  }

  console.log(`\n🔍 Processing CSV file: ${csvFilename}\n`);

  try {
    // Read and parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);

    console.log(`📝 Found ${rows.length} entries to process\n`);

    // Load existing seeds for duplicate checking
    console.log(`🔎 Checking for duplicates...\n`);
    const existingSeeds = loadExistingSeeds();

    // Validate all rows
    const criticalErrors = [];
    const duplicateWarnings = [];
    const validRows = [];
    const skippedRows = [];

    for (const row of rows) {
      const errors = validateRow(row.data, row.lineNumber, existingSeeds);

      if (errors.length === 0) {
        validRows.push(row);
      } else {
        // Separate duplicates from other errors
        const hasDuplicate = errors.some(e => e.includes('duplicate noun'));
        const otherErrors = errors.filter(e => !e.includes('duplicate noun'));

        if (hasDuplicate && otherErrors.length === 0) {
          // Only duplicate error - skip this row with a warning
          duplicateWarnings.push(...errors);
          skippedRows.push(row);
        } else {
          // Critical validation errors (invalid article, category, etc.)
          criticalErrors.push(...otherErrors);
        }
      }
    }

    // If there are critical errors, print them and exit
    if (criticalErrors.length > 0) {
      console.error('❌ Critical Validation Errors:\n');
      criticalErrors.forEach((error) => console.error(`  ${error}`));
      console.error(`\nTotal critical errors: ${criticalErrors.length}\n`);
      console.error('Fix these errors in the CSV file and try again.\n');
      process.exit(1);
    }

    // Show duplicate warnings if any
    if (duplicateWarnings.length > 0) {
      console.log('⚠️  Skipping Duplicates:\n');
      duplicateWarnings.forEach((warning) => console.log(`  ${warning}`));
      console.log(`\nSkipped ${skippedRows.length} duplicate entries\n`);
    }

    if (validRows.length === 0) {
      console.error('❌ No valid entries to process after removing duplicates.\n');
      process.exit(1);
    }

    console.log(`✅ ${validRows.length} unique entries ready to process\n`);

    // Generate TypeScript code
    const exportName = toCamelCase(csvFilename);
    const tsCode = generateTypeScript(validRows, exportName, csvFilename);

    // Write output file
    const outputFilename = csvFilename.replace(/\.csv$/, '.ts');
    const outputPath = path.join(SEEDS_DIR, outputFilename);

    fs.writeFileSync(outputPath, tsCode, 'utf-8');

    // Print success message
    printSuccess(outputPath, exportName, validRows.length, skippedRows.length);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

// ── Entry Point ───────────────────────────────────────────────────────────

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
