export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'author';
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  markdown?: string;
  excerpt?: string;
  featuredImage?: string;
  featured: boolean;
  published: boolean;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string | null;
  authorId: string;
  author?: User | null;
  categories: Category[];
  tags: Tag[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  posts?: Post[];
  createdAt: string;
  updatedAt: string;
  postCount?: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  posts?: Post[];
  createdAt: string;
  updatedAt: string;
  postCount?: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorName?: string | null;
  authorEmail?: string | null;
  content: string;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}
