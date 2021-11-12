import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { NetworkService } from '../../services/network.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  templateUrl: 'explorer-menu.component.html',
  selector: 'explorer-menu',
  styleUrls: ['explorer-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ExplorerMenuComponent {
  network: Observable<string>;

  constructor(private ns: NetworkService) {
    this.network = this.ns.currentNetwork.pipe(map((network) => {
      // Find image or something else?
      return network ? network : '';
    }));
  }
}

