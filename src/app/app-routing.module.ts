import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component';
import { TempHomeComponent } from './components/temp-home/temp-home.component';

const routes: Routes = [
  {
    path: 'n/:network',
    loadChildren: () => import('./pages/network/network.module').then(m => m.NetworkModule)
  },
  {
    path: 'settings',
    loadChildren: () => import('./pages/settings/settings.module').then(m => m.SettingsModule)
  },
  {
    path: 'legal',
    loadChildren: () => import('./pages/legal/legal.module').then(m => m.LegalModule)
  },
  {path: '', component: TempHomeComponent, pathMatch: 'full'},
  {path: '**', component: PageNotFoundComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
