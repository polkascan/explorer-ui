import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-balances-transfer-list',
  templateUrl: './balances-transfer-list.component.html',
  styleUrls: ['./balances-transfer-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalancesTransferListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
