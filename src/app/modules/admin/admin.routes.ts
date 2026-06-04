import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-shell.page').then((m) => m.AdminShellPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.page').then((m) => m.AdminDashboardPage),
      },
      {
        path: 'missions',
        loadComponent: () =>
          import('./pages/missions/missions-list.page').then((m) => m.AdminMissionsListPage),
      },
      {
        path: 'missions/new',
        loadComponent: () =>
          import('./pages/missions/mission-form.page').then((m) => m.AdminMissionFormPage),
      },
      {
        path: 'missions/:id',
        loadComponent: () =>
          import('./pages/missions/mission-form.page').then((m) => m.AdminMissionFormPage),
      },
      {
        path: 'badges',
        loadComponent: () =>
          import('./pages/badges/badges-list.page').then((m) => m.AdminBadgesListPage),
      },
      {
        path: 'badges/new',
        loadComponent: () =>
          import('./pages/badges/badge-form.page').then((m) => m.AdminBadgeFormPage),
      },
      {
        path: 'badges/:id',
        loadComponent: () =>
          import('./pages/badges/badge-form.page').then((m) => m.AdminBadgeFormPage),
      },
      {
        path: 'levels',
        loadComponent: () =>
          import('./pages/levels/levels-list.page').then((m) => m.AdminLevelsListPage),
      },
      {
        path: 'levels/new',
        loadComponent: () =>
          import('./pages/levels/level-form.page').then((m) => m.AdminLevelFormPage),
      },
      {
        path: 'levels/:id',
        loadComponent: () =>
          import('./pages/levels/level-form.page').then((m) => m.AdminLevelFormPage),
      },
      {
        path: 'ledger',
        loadComponent: () =>
          import('./pages/ledger/ledger.page').then((m) => m.AdminLedgerPage),
      },
      {
        path: 'recompute',
        loadComponent: () =>
          import('./pages/recompute/recompute.page').then((m) => m.AdminRecomputePage),
      },
    ],
  },
];
