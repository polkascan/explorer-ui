import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExplorerComponent } from './explorer.component';

const routes: Routes = [
  {
    path: '',
    component: ExplorerComponent,
  },
  {
    path: 'block',
    loadChildren: () => import('./block/block.module').then(m => m.BlockModule)
  },
  {
    path: 'transaction',
    loadChildren: () => import('./transaction/transaction.module').then(m => m.TransactionModule)
  },
  {
    path: 'inherent',
    loadChildren: () => import('./inherent/inherent.module').then(m => m.InherentModule)
  },
  {
    path: 'extrinsic',
    loadChildren: () => import('./extrinsic/extrinsic.module').then(m => m.ExtrinsicModule)
  },
  {
    path: 'event',
    loadChildren: () => import('./event/event.module').then(m => m.EventModule)
  },
  {
    path: 'log',
    loadChildren: () => import('./log/log.module').then(m => m.LogModule)
  },
  {
    path: 'runtime',
    loadChildren: () => import('./runtime/runtime.module').then(m => m.RuntimePallet)
  },
  {
    path: 'account',
    loadChildren: () => import('./account/account.module').then(m => m.AccountModule)
  },
  {
    path: 'contracts',
    loadChildren: () => import('./contracts/contracts.module').then(m => m.ContractsModule)
  },
  {
    path: 'session',
    loadChildren: () => import('./session/session.module').then(m => m.SessionModule)
  },
  {
    path: 'democracy',
    loadChildren: () => import('./democracy/democracy.module').then(m => m.DemocracyModule)
  },
  {
    path: 'council',
    loadChildren: () => import('./council/council.module').then(m => m.CouncilModule)
  },
  {
    path: 'technical-committee',
    loadChildren: () => import('./technical-committee/technical-committee.module').then(m => m.TechnicalCommitteeModule)
  },
  {
    path: 'treasury',
    loadChildren: () => import('./treasury/treasury.module').then(m => m.TreasuryModule)
  },
  {
    path: 'balances',
    loadChildren: () => import('./balances/balances.module').then(m => m.BalancesModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExplorerRoutingModule {
}
