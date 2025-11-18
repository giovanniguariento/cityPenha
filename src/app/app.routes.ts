import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'home' },
    { path: 'home', loadComponent: () => import('./modules/home/home.page').then(m => m.Home) },
    { path: 'news/:id', loadComponent: () => import('./modules/news/news.page').then(m => m.NewsPageComponent) }
];
