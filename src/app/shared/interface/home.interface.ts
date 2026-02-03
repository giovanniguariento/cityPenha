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
  posts: Post[];
}