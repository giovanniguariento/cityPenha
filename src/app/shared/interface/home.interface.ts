import { SafeHtml } from '@angular/platform-browser';

// Define a estrutura do autor do post
export interface Author {
  name: string;
  avatarUrl: string;
}

// Define a estrutura principal do post
export interface Post {
  slug: string;
  id: number;
  title: string;
  author: Author;
  tags: number[]; // Array de IDs das tags
  readingTime: number;
  image: string;
  categories: number[]; // Array de IDs das categorias
  categoryName: string;
  onlyVideo?: boolean;
}

// Define a estrutura da categoria, que contém uma lista de posts
export interface Category {
  id: number;
  name: string;
  posts: Post[];
}

// Interface raiz que representa a resposta completa da API/JSON
export interface BlogResponse {
  categories: Category[];
  carousel: Post[];
}

// Post detail interface (for single post page)
export interface PostDetail extends Post {
  content: string | SafeHtml;
  img?: string;
  resume?: string;
  date?: string;
  onlyVideo?: boolean;
}

// Category card interface (for favorites)
export interface CategoryCard {
  id: number;
  title: string;
  count: number;
  image: string;
}

// User interface
export interface User {
  name: string;
  role: string;
  description: string;
  level: number;
  avatarUrl: string;
}

// User stats interface
export interface UserStat {
  value: string;
  label: string;
  icon: string;
  color: string;
}

// Signup request interface
export interface SignupRequest {
  email: string | null;
  firebaseUid: string;
  name: string | null;
  photoUrl: string | null;
}

// Signup response interface
export interface SignupResponse {
  success: boolean;
  message?: string;
}