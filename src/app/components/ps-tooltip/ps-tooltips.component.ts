import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewEncapsulation
} from '@angular/core';
import { TooltipsService } from '../../services/tooltips.service';
import { Subscription } from 'rxjs';

@Component({
  template: '',
  selector: 'ps-tooltips',
  styleUrls: ['ps-tooltips.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PsTooltipsComponent implements OnInit, OnDestroy {
  private subscription: Subscription;

  constructor(private notificationService: TooltipsService,
              private hostElm: ElementRef,
              private renderer: Renderer2) {
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngOnInit(): void {
    this.notificationService.notify.subscribe((text: string) => {
      const element = this.renderer.createElement('div');
      this.renderer.addClass(element, 'ps-tooltip-item')
      this.renderer.setProperty(element, 'innerHTML', text);

      this.renderer.appendChild(this.hostElm.nativeElement, element);
      window.setTimeout(() => {
        this.renderer.removeChild(this.hostElm, element);
      }, 5000);
    });
  }
}
