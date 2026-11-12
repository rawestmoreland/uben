/**
 * Helpers for nouns that take two articles for the same meaning
 * (der/die Gleichgesinnte, der/das Joghurt).
 *
 * `article` is the primary article and `article_alt` the optional second one.
 * Different-meaning pairs (der See / die See) are separate rows and are NOT
 * handled here.
 */

export type Article = 'der' | 'die' | 'das';

interface ArticleFields {
  article: string | null;
  article_alt?: string | null;
}

/** Every article that is a correct answer for the noun (primary first). */
export function getAcceptedArticles(noun: ArticleFields): Article[] {
  const accepted: Article[] = [];
  if (noun.article) accepted.push(noun.article as Article);
  // Guard against a bad row where both columns hold the same article
  if (noun.article_alt && noun.article_alt !== noun.article) {
    accepted.push(noun.article_alt as Article);
  }
  return accepted;
}

/** Whether the picked article is a correct answer for the noun. */
export function isAcceptedArticle(noun: ArticleFields, picked: string): boolean {
  return getAcceptedArticles(noun).includes(picked as Article);
}

/** Display form of the accepted articles, e.g. "der / die" or "das". */
export function formatArticles(noun: ArticleFields): string {
  return getAcceptedArticles(noun).join(' / ');
}

/**
 * Whether the picked article belongs to a sibling noun with the same spelling
 * but a different meaning (der See / die See). `sibling_articles` is the
 * comma-joined list of the siblings' articles.
 */
export function isSiblingArticle(
  noun: { sibling_articles?: string | null },
  picked: string,
): boolean {
  return (noun.sibling_articles ?? '').split(',').includes(picked);
}
