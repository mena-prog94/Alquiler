import { Routes } from '@angular/router';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  // src/app/app.routes.ts
{
  path: 'registro',
  loadComponent: () => import('./pages/registro/registro.page').then(m => m.RegisterPage)
},
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then( m => m.DashboardPage)
  },
  {
    path: 'clientes',
    loadComponent: () => import('./pages/clientes/clientes.page').then( m => m.ClientesPage)
  },
   {
    path: 'cliente/nuevo', // Formulario para registrar cliente
    loadComponent: () => import('./pages/clientes/clientes.page').then( m => m.ClientesPage)
  },
  {
    path: 'clientes/:id',
    loadComponent: () => import('./pages/detalle-cliente/detalle-cliente.page').then(m => m.DetalleClientePage)
  },
  {
    path: 'detalle-cliente',
    loadComponent: () => import('./pages/detalle-cliente/detalle-cliente.page').then( m => m.DetalleClientePage)
  },
 
  {
    path: 'recibos',
    loadComponent: () => import('./pages/recibos/recibos.page').then( m => m.RecibosPage)
  },
   {
    path: 'detalle-recibo/:id', 
    loadComponent: () => import('./pages/detalle-recibo/detalle-recibo.page').then( m => m.DetalleReciboPage)
  },
  {
    path: 'detalle-recibo',
    loadComponent: () => import('./pages/detalle-recibo/detalle-recibo.page').then( m => m.DetalleReciboPage)
  },
  {
    path: 'vivienda',
    loadComponent: () => import('./pages/vivienda/vivienda.page').then( m => m.ViviendaPage)
  },
  {
    path: 'detalle-vivienda',
    loadComponent: () => import('./pages/detalle-vivienda/detalle-vivienda.page').then( m => m.DetalleViviendaPage)
  },
   {
    path: 'vivienda/editar/:id', // <-- AGREGADO: Ruta para editar vivienda existente reutilizando el formulario
    loadComponent: () => import('./pages/vivienda/vivienda.page').then( m => m.ViviendaPage)
  },
  {
    path: 'viviendas/:id', // Vista del detalle de la vivienda
    loadComponent: () => import('./pages/detalle-vivienda/detalle-vivienda.page').then( m => m.DetalleViviendaPage)
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil.page').then( m => m.PerfilPage)
  },
];
