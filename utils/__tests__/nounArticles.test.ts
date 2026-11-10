import {
  formatArticles,
  getAcceptedArticles,
  isAcceptedArticle,
} from '../nounArticles';

describe('nounArticles', () => {
  const single = { article: 'der', article_alt: null };
  const dual = { article: 'der', article_alt: 'die' };

  it('accepts only the primary article for a normal noun', () => {
    expect(getAcceptedArticles(single)).toEqual(['der']);
    expect(isAcceptedArticle(single, 'der')).toBe(true);
    expect(isAcceptedArticle(single, 'die')).toBe(false);
  });

  it('accepts both articles for a dual-article noun, primary first', () => {
    expect(getAcceptedArticles(dual)).toEqual(['der', 'die']);
    expect(isAcceptedArticle(dual, 'der')).toBe(true);
    expect(isAcceptedArticle(dual, 'die')).toBe(true);
    expect(isAcceptedArticle(dual, 'das')).toBe(false);
  });

  it('treats a missing article_alt like null', () => {
    expect(getAcceptedArticles({ article: 'das' })).toEqual(['das']);
  });

  it('ignores an article_alt that repeats the primary article', () => {
    expect(getAcceptedArticles({ article: 'der', article_alt: 'der' })).toEqual(
      ['der'],
    );
  });

  it('formats the accepted articles for display', () => {
    expect(formatArticles(single)).toBe('der');
    expect(formatArticles(dual)).toBe('der / die');
    expect(formatArticles({ article: 'das', article_alt: 'der' })).toBe(
      'das / der',
    );
  });
});
