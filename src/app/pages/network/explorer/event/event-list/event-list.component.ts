import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { ListResponse } from '../../../../../../../polkadapt/projects/polkascan/src/lib/polkascan.types';


type psEvent = {
  blockNumber: number; // combined primary key blockNumber, eventIdx
  eventIdx: number; // combined primary key blockNumber, eventIdx
  extrinsicIdx: number | null;
  event: string | null;
  eventModule: string | null;
  eventName: string | null;
};

const temporaryListSize = 100;


@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventListComponent implements OnInit, OnDestroy {
  events: psEvent[] = [];
  filters = new Map();  // TODO get filters through a query.

  eventModuleControl: FormControl = new FormControl('');
  eventNameControl: FormControl = new FormControl('');
  filtersFormGroup: FormGroup = new FormGroup({
    eventModule: this.eventModuleControl,
    eventName: this.eventNameControl
  });

  private network: string;
  private unsubscribeNewEventFn: null | (() => void);
  private destroyer: Subject<undefined> = new Subject();
  private onDestroyCalled = false;

  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private cd: ChangeDetectorRef) {
    // TODO remove these temporary filters when a query is available.
    this.filters.set('AuthorityDiscovery', []);
    this.filters.set('Authorship', []);
    this.filters.set('Babe', []);
    this.filters.set('Balances', ['BalanceSet', 'Deposit', 'DustLow', 'Endowed', 'Reserved']);
    this.filters.set('Bounties', ['BountyAwarded', 'BountyBecameActive', 'BountyCanceled', 'BountyClaimed', 'BountyExtended']);
    this.filters.set('Council', ['Approved', 'Closed', 'Disapproved', 'Executed', 'MemberExecuted', 'Proposed', 'Voted']);
  }

  ngOnInit(): void {
    this.filtersFormGroup.valueChanges
      .pipe(
        debounceTime(100),  // Also to make sure eventNameControl reset has taken place
        takeUntil(this.destroyer)
      )
      .subscribe((values) => {
        this.unsubscribeNewEvent();
        this.events = [];
        this.cd.markForCheck();

        this.subscribeNewEvent();
        this.getEvents();
      });

    this.eventModuleControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe(() => {
        this.eventNameControl.reset(null, {emitEvent: false});
      });

    this.ns.currentNetwork
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe((network: string) => {
        this.filtersFormGroup.reset({}, {emitEvent: false});
        this.network = network;
        this.unsubscribeNewEvent();

        if (network) {
          this.subscribeNewEvent();
          this.getEvents();
        }
      });
  }


  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
    this.unsubscribeNewEvent();
  }


  async subscribeNewEvent(): Promise<void> {
    if (this.onDestroyCalled) {
      // Component is already in process of destruction or destroyed.
      this.unsubscribeNewEvent();
      return;
    }

    const filters: any = {};
    if (this.eventModuleControl.value) {
      filters.eventModule = this.eventModuleControl.value;
    }
    if (this.eventNameControl.value) {
      filters.eventName = this.eventNameControl.value;
    }

    try {
      this.unsubscribeNewEventFn = await this.pa.run(this.ns.currentNetwork.value).polkascan.subscribeNewEvent(
        filters,
        (event: psEvent) => {
          if (!this.onDestroyCalled) {
            if (!this.events.some((e) => e.blockNumber === event.blockNumber && e.eventIdx === event.eventIdx)) {
              this.events.splice(0, 0, event);
              this.events.sort((a, b) => b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx);
              this.events.length = Math.min(this.events.length, temporaryListSize);
              this.cd.markForCheck();
            }
          } else {
            // If still listening but component is already destroyed.
            this.unsubscribeNewEvent();
          }
        });
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  unsubscribeNewEvent(): void {
    if (this.unsubscribeNewEventFn) {
      this.unsubscribeNewEventFn();
      this.unsubscribeNewEventFn = null;
    }
  }


  async getEvents(): Promise<void> {
    if (this.onDestroyCalled) {
      // Component is already in process of destruction or destroyed.
      return;
    }

    const filters: any = {};
    if (this.eventModuleControl.value) {
      filters.eventModule = this.eventModuleControl.value;
    }
    if (this.eventNameControl.value) {
      filters.eventName = this.eventNameControl.value;
    }

    try {
      const response: ListResponse<psEvent> = await this.pa.run(this.ns.currentNetwork.value).polkascan.getEvents(filters, 100);
      if (!this.onDestroyCalled) {
        response.objects
          .filter((event) => {
            return !this.events.some((e) => e.blockNumber === event.blockNumber && e.eventIdx === event.eventIdx);
          })
          .forEach((event) => {
            this.events.push(event);
          });

        this.events.length = Math.min(this.events.length, temporaryListSize);
        this.events.sort((a, b) => b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx);
        this.cd.markForCheck();
      }
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  trackByIdFn(i: any, event: psEvent): string {
    return `${event.blockNumber}-${event.eventIdx}`;
  }
}
