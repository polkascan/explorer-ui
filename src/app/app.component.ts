import { ChangeDetectionStrategy, Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { VariablesService } from './services/variables.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnDestroy {
  private destroyer = new Subject();

  constructor(public vars: VariablesService) {
  }

  ngOnDestroy(): void {
    this.destroyer.next();
  }
}
