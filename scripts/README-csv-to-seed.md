# CSV to TypeScript Seed File Generator

## Overview

Automated tool to convert German vocabulary CSV files into TypeScript seed files for the Üben app. Handles duplicate detection, validation, and generates properly formatted TypeScript code.

## Quick Start

```bash
# Convert CSV to TypeScript
npm run seed:csv -- v2-book-words-a1-8.csv

# Show help
npm run seed:csv -- --help
```

## Features

✅ **Automatic Duplicate Detection** - Scans all existing seed files and skips duplicates
✅ **UTF-8 Support** - Preserves German characters (ä, ö, ü, ß)
✅ **Comprehensive Validation** - Validates articles, levels, categories, and required fields
✅ **Helpful Error Messages** - Shows line numbers and suggests fixes
✅ **Graceful Degradation** - Skips duplicates instead of failing the entire job

## CSV Format

Your CSV file must have exactly these columns in this order:

```
german,article,plural,english,level,category
```

### Column Requirements

| Column | Type | Required | Valid Values |
|--------|------|----------|--------------|
| `german` | string | ✅ Yes | Any German word |
| `article` | string | ✅ Yes | `der`, `die`, or `das` |
| `plural` | string | ❌ Optional | Plural form (leave empty for null) |
| `english` | string | ✅ Yes | English translation |
| `level` | string | ✅ Yes | `A1`, `A2`, `B1`, `B2`, `C1`, `C2` |
| `category` | string | ✅ Yes | One of 18 valid categories (see below) |

### Valid Categories

```
people, animals, home, furniture, food, body, clothing, nature, places,
transportation, time, weather, education, money, communication, health,
colors, general
```

## Example CSV

```csv
german,article,plural,english,level,category
Job,der,Jobs,job,A1,education
Stelle,die,Stellen,position,A1,education
Café,das,Cafés,café,A1,places
Koch,der,Köche,cook,A1,education
Wirtschaft,die,,economy,A1,education
```

## Workflow

### 1. Run the Script

```bash
npm run seed:csv -- your-file.csv
```

The script will:
- ✅ Parse the CSV file
- ✅ Check for duplicates against all existing seed files
- ✅ Validate each row (articles, levels, categories)
- ✅ Skip duplicates with warnings
- ✅ Generate TypeScript file with unique entries

### 2. Output

Generated file: `/database/seeds/nouns/your-file.ts`

```typescript
import type { SeedNoun } from '@/types/database';

/**
 * Generated from CSV on 2026-02-12
 * Source: your-file.csv
 * Total entries: 52
 */
export const yourFile: SeedNoun[] = [
  {
    german: 'Job',
    article: 'der',
    plural: 'Jobs',
    english: 'job',
    level: 'A1',
    category: 'education',
  },
  // ... more entries
];
```

### 3. Manual Integration

**Edit `/database/seeds/nouns/index.ts`:**

```typescript
import { v2BookWordsA18 } from './v2-book-words-a1-8';

export const nounSeedVersions: NounSeedVersion[] = [
  { version: '3.0.0_a1_nouns_v1', nouns: v1InitialNouns },
  { version: '3.1.0_a1_nouns_lesson_8', nouns: v2BookWordsA18 }, // ← Add this
];
```

### 4. Test

```bash
npm run ios
# App will seed the database on first launch
```

## Error Handling

### Duplicates (Warning Only)

```
⚠️  Skipping Duplicates:

  Line 11: duplicate noun "Information" with article "die" (already exists in v1-initial.ts)
  Line 22: duplicate noun "Restaurant" with article "das" (already exists in v1-initial.ts)

Skipped 2 duplicate entries
✅ 50 unique entries ready to process
```

The script **continues processing** and generates a file with unique entries only.

### Critical Errors (Stops Processing)

```
❌ Critical Validation Errors:

  Line 2: article must be one of: der, die, das (found: "dre")
  Line 3: 'english' field is required
  Line 4: level must be one of: A1, A2, B1, B2, C1, C2 (found: "B3")
  Line 5: invalid category "jobs". Valid categories: people, animals, home, ...

Total critical errors: 4
Fix these errors in the CSV file and try again.
```

The script **stops** and requires you to fix the CSV file.

## Troubleshooting

### File Not Found

```
❌ Error: CSV file not found at /path/to/file.csv
```

**Solution:** Make sure the CSV file is in `/database/seeds/nouns/` directory.

### Invalid Header

```
❌ Error: Invalid CSV header. Expected: german,article,plural,english,level,category
```

**Solution:** Check that your CSV has exactly these column names (lowercase, no spaces).

### Wrong Number of Columns

```
❌ Error: Line 5: Expected 6 columns, got 5
```

**Solution:** Ensure every row has all 6 columns. If a value is empty (like plural), still include the comma.

## Tips

- **Empty Plural:** Leave the plural column empty if the word has no plural form
- **Special Characters:** UTF-8 characters (ä, ö, ü, ß, é) are fully supported
- **Categories:** Use the exact category names from the valid list (lowercase)
- **Batch Processing:** You can run the script multiple times for different CSV files
- **Version Naming:** Use semantic versioning for seed versions (e.g., `3.1.0_a1_nouns_lesson_8`)

## Script Location

`/scripts/csv-to-seed.js`

## Implementation Details

- **Language:** Plain Node.js (no dependencies)
- **Encoding:** UTF-8 for German characters
- **Export Name:** Auto-converted to camelCase (e.g., `v2-book-words-a1-8` → `v2BookWordsA18`)
- **Line Endings:** Supports both `\n` and `\r\n`
- **Duplicate Detection:** Checks `german + article` combination across all existing seed files

## Future Enhancements

Ideas for future improvements:

- Auto-update `index.ts` with `--register` flag
- Batch processing (multiple CSVs at once)
- Interactive duplicate resolution
- Fuzzy category matching with suggestions
- Reverse conversion (TypeScript → CSV export)
