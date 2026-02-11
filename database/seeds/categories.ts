import type { SeedCategory } from '@/types/database';

/**
 * Standard categories for German vocabulary.
 * Display order determines how they appear in category selectors.
 */
export const categories: SeedCategory[] = [
  { name: 'people', display_name: 'People & Family', display_order: 1 },
  { name: 'animals', display_name: 'Animals', display_order: 2 },
  { name: 'home', display_name: 'Home & Rooms', display_order: 3 },
  { name: 'furniture', display_name: 'Furniture & Objects', display_order: 4 },
  { name: 'food', display_name: 'Food & Drink', display_order: 5 },
  { name: 'body', display_name: 'Body Parts', display_order: 6 },
  { name: 'clothing', display_name: 'Clothing', display_order: 7 },
  { name: 'nature', display_name: 'Nature', display_order: 8 },
  { name: 'places', display_name: 'Places & Buildings', display_order: 9 },
  { name: 'transportation', display_name: 'Transportation', display_order: 10 },
  { name: 'time', display_name: 'Time & Calendar', display_order: 11 },
  { name: 'weather', display_name: 'Weather', display_order: 12 },
  { name: 'education', display_name: 'Education & Work', display_order: 13 },
  { name: 'money', display_name: 'Money & Shopping', display_order: 14 },
  {
    name: 'communication',
    display_name: 'Communication & Feelings',
    display_order: 15,
  },
  { name: 'health', display_name: 'Health', display_order: 16 },
  { name: 'colors', display_name: 'Colors', display_order: 17 },
  { name: 'general', display_name: 'General & Abstract', display_order: 18 },
];

