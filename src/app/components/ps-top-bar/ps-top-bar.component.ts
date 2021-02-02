import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewEncapsulation
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { NetworkService } from '../../services/network.service';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  templateUrl: 'ps-top-bar.component.html',
  selector: 'ps-top-bar',
  styleUrls: ['ps-top-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PsTopBarComponent implements OnInit, OnDestroy {
  networkControl: FormControl = new FormControl('');
  languageControl: FormControl = new FormControl('');

  private destroyer = new Subject();

  constructor(private host: ElementRef,
              private renderer: Renderer2,
              private cd: ChangeDetectorRef,
              private router: Router,
              private networkService: NetworkService) {
  }

  ngOnInit(): void {
    this.networkControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroyer)
      )
      .subscribe((value) => {
        this.router.navigateByUrl(`/n/${value}`);
      });

    this.networkService.currentNetwork
      .pipe(
        takeUntil(this.destroyer),
        distinctUntilChanged()
      )
      .subscribe((network) => {
        if (network) {
          this.networkControl.setValue(network, {onlySelf: true, emitEvent: false});
        } else {
          this.networkControl.reset('', {onlySelf: true, emitEvent: false});
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
  }
}

