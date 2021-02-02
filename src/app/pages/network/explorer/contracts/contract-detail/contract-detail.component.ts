import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-contract-detail',
  templateUrl: './contract-detail.component.html',
  styleUrls: ['./contract-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContractDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
