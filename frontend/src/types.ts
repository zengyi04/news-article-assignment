export type ArticleType = 'standard' | 'website' | 'pdf' | 'doc';

export interface Article {
  id?: string;
  title: string;
  summary: string; // This will now store HTML from the rich text editor
  date: string;
  publisher: string;
  type: ArticleType;
  sourceUrl?: string;
  imageUrl?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ArticleFormData = Omit<Article, 'id' | 'createdAt' | 'updatedAt'>;
