import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  templateUrl: 'explorer-menu.component.html',
  selector: 'explorer-menu',
  styleUrls: ['explorer-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ExplorerMenuComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('menuContainer') menuContainer: ElementRef;

  private subscription: Subscription;

  constructor(private router: Router,
              private renderer: Renderer2) {
  }


  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (this.menuContainer) {
          this.renderer.setStyle(this.menuContainer.nativeElement, 'pointer-events', 'none');
        }
      }
    });
  }

  ngAfterViewInit() {
    if (this.menuContainer && this.menuContainer.nativeElement) {
      this.renderer.listen(this.menuContainer.nativeElement, 'mouseleave', () => {
        this.renderer.removeStyle(this.menuContainer.nativeElement, 'pointer-events');
      })
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

