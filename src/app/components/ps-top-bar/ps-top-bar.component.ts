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
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AppConfig } from '../../app-config';
import { VariablesService } from '../../services/variables.service';

@Component({
  templateUrl: 'ps-top-bar.component.html',
  selector: 'ps-top-bar',
  styleUrls: ['ps-top-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PsTopBarComponent implements OnInit, OnDestroy {
  networks: string[];
  networkControl: FormControl = new FormControl('');
  languageControl: FormControl = new FormControl('');

  private destroyer = new Subject();

  constructor(private host: ElementRef,
              private renderer: Renderer2,
              private cd: ChangeDetectorRef,
              private router: Router,
              private config: AppConfig,
              public vars: VariablesService) {
  }

  ngOnInit(): void {
    this.networks = Object.keys(this.config.networks);

    this.networkControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroyer)
      )
      .subscribe((value) => {
        this.router.navigateByUrl(`/n/${value}`);
      });

    this.vars.network
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

