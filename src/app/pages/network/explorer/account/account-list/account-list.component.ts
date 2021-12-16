import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-account-list',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountListComponent implements OnInit {

  constructor(private router: Router,
              private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    const explorerRoute = this.route.pathFromRoot.find(routePart => routePart.snapshot.url[0]?.path === 'explorer');
    this.router.navigate(['.'], {relativeTo: explorerRoute});
  }
}
