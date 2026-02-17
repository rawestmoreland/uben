# Vocabulary Image to CSV

## Purpose

Scan vocabulary images from German learning books and extract words into a properly formatted CSV file that can be processed by the `csv-to-seed.js` script.

## When to Use

User provides vocabulary images (screenshots, photos, or image files) from German textbooks or learning materials and wants to add them to the app's vocabulary database.

## Process

### 1. Image Input

- User will provide image path(s) or multiple images
- Images typically contain German vocabulary lists with:
  - German noun
  - Article (der/die/das)
  - Plural form
  - English translation
  - CEFR level (A1, A2, B1, B2, C1, C2)

### 2. Data Extraction

For each vocabulary word in the images, extract:

- **german**: The German noun (required)
- **article**: Must be one of: `der`, `die`, `das` (required)
- **plural**: The plural form (if it's not in the image, use your knowledge of German to fill in the correct plural form for the word. It's fine if the singular and plural are the same.)
- **english**: English translation (required)
- **level**: CEFR level - one of: `A1`, `A2`, `B1`, `B2`, `C1`, `C2` (required)
- **category**: Must match one of the valid categories (required)

### 3. Category Mapping

Map each word to ONE of these valid categories (from `database/seeds/categories.ts`):

- `people` - People & Family (family members, professions, relationships)
- `animals` - Animals (pets, wild animals, insects)
- `home` - Home & Rooms (rooms, household areas)
- `furniture` - Furniture & Objects (furniture, household items)
- `food` - Food & Drink (meals, ingredients, beverages)
- `body` - Body Parts (anatomy, physical features)
- `clothing` - Clothing (garments, accessories)
- `nature` - Nature (plants, landscapes, natural phenomena)
- `places` - Places & Buildings (locations, structures)
- `transportation` - Transportation (vehicles, travel)
- `time` - Time & Calendar (time expressions, dates)
- `weather` - Weather (weather conditions, seasons)
- `education` - Education & Work (school, office, careers)
- `money` - Money & Shopping (currency, commerce)
- `communication` - Communication & Feelings (emotions, media, social)
- `health` - Health (medical, wellness)
- `colors` - Colors (color words)
- `general` - General & Abstract (concepts, abstract nouns)

**Category Selection Guidelines:**

- Choose the most specific category that fits
- If a word fits multiple categories, prefer the more concrete one
- Use `general` only for abstract concepts that don't fit elsewhere
- Consider the primary meaning/usage of the word

### 4. CSV Format

Create CSV with this EXACT header (required by csv-to-seed.js):

```
german,article,plural,english,level,category
```

Example rows:

```
Hund,der,Hunde,dog,A1,animals
Katze,die,Katzen,cat,A1,animals
Haus,das,Häuser,house,A1,places
Tisch,der,Tische,table,A1,furniture
Wasser,das,,water,A1,food
```

**Important CSV Rules:**

- No spaces after commas
- If plural is missing/unknown, leave the field empty (but keep the comma)
- All fields are lowercase except proper nouns
- German nouns should be capitalized (as per German grammar)
- No quotes around fields unless they contain commas

### 5. Output Location

Save the CSV file to: `database/seeds/nouns/`

**Naming Convention:**

- Use descriptive names like: `vocab-[book-name]-[level]-[section].csv`
- Examples:
  - `vocab-a1-8.csv` (for A1 level, chapter 8)
  - `vocab-people-words-a1.csv` (thematic)
  - `vocab-empty.csv` (template/starting point)

### 6. Validation Before Saving

Before writing the CSV, verify:

- ✅ All articles are: `der`, `die`, or `das`
- ✅ All levels are: `A1`, `A2`, `B1`, `B2`, `C1`, or `C2`
- ✅ All categories match the valid list above
- ✅ German and English fields are not empty
- ✅ German nouns are capitalized
- ✅ CSV format matches exactly: `german,article,plural,english,level,category`

### 7. Post-Processing

After creating the CSV, inform the user:

1. CSV file location
2. Number of words extracted
3. Next steps: Run `npm run seed:csv -- [filename].csv` to convert to TypeScript seed file

## Example Interaction

**User:** "Here's a vocabulary image from chapter 8 of my A1 German book"

**Assistant:**

1. Read the image using the Read tool
2. Extract all vocabulary words visible
3. Map each word to appropriate category
4. Create CSV in `database/seeds/nouns/vocab-a1-8.csv`
5. Report: "Extracted 25 words. Saved to `database/seeds/nouns/vocab-a1-8.csv`"
6. Suggest: "Next, run: `npm run seed:csv -- vocab-a1-8.csv`"

## Edge Cases

### Missing Information

- **No plural shown**: Leave plural field empty
- **No English translation**: Ask user or use best judgment
- **Unclear article**: Verify with user before proceeding
- **Ambiguous category**: Choose most specific fit or ask user

### Image Quality Issues

- If text is unclear/blurry, ask user to provide clearer image
- If layout is complex, process row by row and verify with user

### Duplicate Detection

- The csv-to-seed.js script will handle duplicate detection
- Don't worry about checking for duplicates during CSV creation
- Script will skip duplicates and show warnings

## Important Notes

- **Always use Read tool** to view images first
- **Ask for clarification** if vocabulary entries are ambiguous
- **Validate categories** against the allowed list before saving
- **Follow CSV format exactly** - the script is strict about format
- **Include all visible words** unless user specifies otherwise
- **Don't add emojis** or extra formatting to the CSV

## After CSV Creation

Tell the user:

1. ✅ CSV file created at: `database/seeds/nouns/[filename].csv`
2. 📊 Total words extracted: [count]
3. 🔄 Next step: Run `npm run seed:csv -- [filename].csv`
4. 📝 This will generate a TypeScript seed file and check for duplicates
5. 🎯 Then add the import to `database/seeds/nouns/index.ts`

## Validation Checklist

Before marking task complete:

- [ ] Image(s) read successfully
- [ ] All vocabulary words extracted
- [ ] All categories are valid
- [ ] All articles are valid (der/die/das)
- [ ] All levels are valid (A1-C2)
- [ ] CSV format is correct
- [ ] File saved to `database/seeds/nouns/`
- [ ] User informed of next steps
