import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExplorerComponent } from './explorer.component';
import { ExplorerRoutingModule } from './explorer-routing.module';


@NgModule({
  declarations: [ExplorerComponent],
  imports: [
    CommonModule,
    ExplorerRoutingModule
  ]
})
export class ExplorerModule {
}
