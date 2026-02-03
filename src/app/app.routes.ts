import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./modules/home/home.page').then(m => m.HomePage) },
  { path: 'news/:slug', loadComponent: () => import('./modules/news/news.page').then(m => m.NewsPageComponent) },
  { path: 'login', loadComponent: () => import('./modules/login/login.page').then(m => m.LoginPage) },
  {
    path: 'favorites',
    loadComponent: () => import('./modules/favorites/favorites.page').then(m => m.FavoritesPage),
    canActivate: [authGuard],
    children: [
      { path: ':category', loadComponent: () => import('./modules/favorites/category/category.page').then(m => m.CategoryPage) },
    ]
  },
  {
    path: 'profile',
    loadComponent: () => import('./modules/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [authGuard],
  },
];
