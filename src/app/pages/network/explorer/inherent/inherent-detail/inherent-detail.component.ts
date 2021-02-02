import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-inherent-detail',
  templateUrl: './inherent-detail.component.html',
  styleUrls: ['./inherent-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InherentDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
