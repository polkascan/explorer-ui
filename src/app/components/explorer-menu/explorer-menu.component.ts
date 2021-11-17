import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VariablesService } from '../../services/variables.service';

@Component({
  templateUrl: 'explorer-menu.component.html',
  selector: 'explorer-menu',
  styleUrls: ['explorer-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ExplorerMenuComponent {
  network: Observable<string>;

  constructor(private vars: VariablesService) {
    this.network = this.vars.network.pipe(map((network) => {
      // Find image or something else?
      return network ? network : '';
    }));
  }
}

