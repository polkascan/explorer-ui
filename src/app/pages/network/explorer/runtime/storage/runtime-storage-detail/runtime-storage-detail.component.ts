import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-runtime-storage-detail',
  templateUrl: './runtime-storage-detail.component.html',
  styleUrls: ['./runtime-storage-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeStorageDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
