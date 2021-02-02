import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-inherent-list',
  templateUrl: './inherent-list.component.html',
  styleUrls: ['./inherent-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InherentListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
