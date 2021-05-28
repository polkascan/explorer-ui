import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class VariablesService {
  network = new BehaviorSubject<string>('none');
  blockNumber = new BehaviorSubject<number>(0);
}
