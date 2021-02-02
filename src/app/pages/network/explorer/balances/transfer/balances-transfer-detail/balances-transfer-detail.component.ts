import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-balances-transfer-detail',
  templateUrl: './balances-transfer-detail.component.html',
  styleUrls: ['./balances-transfer-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalancesTransferDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
