import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { AppConfig } from '../../app-config';


@Component({
  templateUrl: 'temp-home.component.html',
  styleUrls: ['temp-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class TempHomeComponent implements OnInit {
  networks: string[];

  constructor(private config: AppConfig) {
  }

  ngOnInit(): void {
    this.networks = Object.keys(this.config.networks);
  }
}
