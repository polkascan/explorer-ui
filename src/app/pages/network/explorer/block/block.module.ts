import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlockListComponent } from './block-list/block-list.component';
import { BlockDetailComponent } from './block-detail/block-detail.component';
import { BlockRoutingModule } from './block-routing.module';


@NgModule({
  declarations: [BlockListComponent, BlockDetailComponent],
  imports: [
    CommonModule,
    BlockRoutingModule
  ]
})
export class BlockModule { }
