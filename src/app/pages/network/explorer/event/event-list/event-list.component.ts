import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { takeUntil } from 'rxjs/operators';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';


type psEvent = {
  blockNumber: number; // combined primary key blockNumber, eventIdx
  eventIdx: number; // combined primary key blockNumber, eventIdx
  extrinsicIdx: number | null;
  event: string | null;
  eventModule: string | null;
  eventName: string | null;
};


@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventListComponent implements OnInit, OnDestroy {
  events: psEvent[] = [];

  eventModuleControl: FormControl = new FormControl('');
  eventNameControl: FormControl = new FormControl('');
  filtersFormGroup: FormGroup = new FormGroup({
    eventModule: this.eventModuleControl,
    eventName: this.eventNameControl
  });

  private network: string;
  private unsubscribeNewEventFn: null | (() => void);
  private destroyer: Subject<undefined> = new Subject();
  private destroyed = false;

  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private cd: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.filtersFormGroup.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe((values) => {
        this.unsubscribeNewEvent();
        this.subscribeNewEvent();
      });

    this.eventModuleControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe(() => {
        this.eventNameControl.reset('', {emitEvent: false});
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
        }
      });
  }

  ngOnDestroy(): void {
    this.unsubscribeNewEvent();
    this.destroyed = true;
    this.destroyer.next();
    this.destroyer.complete();
  }


  async subscribeNewEvent(): Promise<void> {
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
          if (!this.destroyed) {
            if (!this.events.some((e) => e.blockNumber === event.blockNumber && e.eventIdx === event.eventIdx)) {
              this.events.push(event);
              this.events.sort((a, b) => a.blockNumber - b.blockNumber || a.eventIdx - b.eventIdx);
              this.cd.markForCheck();
            }
          }
        });
      if (this.destroyed) {
        this.unsubscribeNewEvent();
      }
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
}
