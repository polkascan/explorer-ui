import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewEncapsulation
} from '@angular/core';
import { NetworkService } from './services/network.service';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'polkascan-ui';

  private destroyer = new Subject();

  constructor(private host: ElementRef,
              private renderer: Renderer2,
              private networkService: NetworkService) {
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.networkService.currentNetwork
      .pipe(
        takeUntil(this.destroyer),
        distinctUntilChanged()
      )
      .subscribe((network) => {
        if (network) {
          this.renderer.setAttribute(this.host.nativeElement, 'attr-network', network);
        } else {
          this.renderer.removeAttribute(this.host.nativeElement, 'attr-network');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
  }
}
