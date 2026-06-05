import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './modules/admin/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./modules/home/home.page').then(m => m.HomePage) },
  { path: 'discovery', loadComponent: () => import('./modules/discovery/discovery.page').then(m => m.DiscoveryPage) },
  {
    path: 'discovery/topics',
    loadComponent: () => import('./modules/discovery/topics/topics.page').then(m => m.DiscoveryTopicsPage),
  },
  { path: 'noticias/:categorySlug/:slug', loadComponent: () => import('./modules/news/news.page').then(m => m.NewsPageComponent) },
  { path: 'login', loadComponent: () => import('./modules/login/login.page').then(m => m.LoginPage) },
  {
    path: 'favorites',
    loadComponent: () => import('./modules/favorites/favorites.page').then(m => m.FavoritesPage),
    canActivate: [authGuard],
  },
  {
    path: 'favorites/:folderId',
    loadComponent: () => import('./modules/favorites/category/category.page').then(m => m.CategoryPage),
    canActivate: [authGuard],
  },
  {
    path: 'profile/edit',
    loadComponent: () =>
      import('./modules/profile/edit-profile/edit-profile.page').then((m) => m.EditProfilePage),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./modules/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [authGuard],
  },
  {
    path: 'frequencia',
    loadComponent: () => import('./modules/frequencia/frequencia.page').then(m => m.FrequenciaPage),
  },
  {
    path: 'missions',
    loadComponent: () => import('./modules/missions/missions.page').then(m => m.MissionsPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./modules/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
];
