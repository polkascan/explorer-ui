import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-terms-of-use',
  templateUrl: './terms-of-use.component.html',
  styleUrls: ['./terms-of-use.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TermsOfUseComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
