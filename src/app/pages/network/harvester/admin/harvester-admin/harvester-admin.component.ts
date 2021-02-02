import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-harvester-admin',
  templateUrl: './harvester-admin.component.html',
  styleUrls: ['./harvester-admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HarvesterAdminComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
