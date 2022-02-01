import { Injectable } from '@angular/core';
import { ReplaySubject, Subject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class TooltipsService {

  notify = new Subject<string>();
  history = new ReplaySubject(20);

  constructor() {
    this.notify.subscribe(this.history);
  }
}
