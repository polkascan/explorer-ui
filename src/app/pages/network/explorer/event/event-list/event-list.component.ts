import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { debounceTime, takeUntil, first, filter } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { RuntimeService } from '../../../../../services/runtime/runtime.service';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';


const temporaryListSize = 100;


@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventListComponent implements OnInit, OnDestroy {
  events: pst.Event[] = [];
  filters = new Map();

  palletControl: FormControl = new FormControl('');
  eventControl: FormControl = new FormControl('');
  filtersFormGroup: FormGroup = new FormGroup({
    eventModule: this.palletControl,
    eventName: this.eventControl
  });

  private network: string;
  private unsubscribeNewEventFn: null | (() => void);
  private destroyer: Subject<undefined> = new Subject();
  private onDestroyCalled = false;

  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private rs: RuntimeService,
              private cd: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.filtersFormGroup.valueChanges
      .pipe(
        debounceTime(100),  // Also to make sure eventControl reset has taken place
        takeUntil(this.destroyer)
      )
      .subscribe((values) => {
        this.unsubscribeNewEvent();
        this.events = [];
        this.cd.markForCheck();

        this.subscribeNewEvent();
        this.getEvents();
      });

    this.palletControl.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe(() => {
        this.eventControl.reset(null, {emitEvent: false});
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

          this.rs.getRuntime(network)
            .pipe(
              takeUntil(this.destroyer),
              filter((r) => r !== null),
              first()
            )
            .subscribe(async (runtime): Promise<void> => {
                const pallets = await this.rs.getRuntimePallets(network, (runtime as pst.Runtime).specVersion);
                const events = await this.rs.getRuntimeEvents(network, (runtime as pst.Runtime).specVersion);

                if (pallets) {
                  pallets.forEach((pallet) => {
                    this.filters.set(pallet, events ? events.filter((event) => pallet.pallet === event.pallet).sort() : []);
                  });
                  this.cd.markForCheck();
                }
            });
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
    if (this.palletControl.value) {
      filters.eventModule = this.palletControl.value;
    }
    if (this.eventControl.value) {
      filters.eventName = this.eventControl.value;
    }

    try {
      this.unsubscribeNewEventFn = await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.subscribeNewEvent(
        filters,
        (event: pst.Event) => {
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
    if (this.palletControl.value) {
      filters.eventModule = this.palletControl.value;
    }
    if (this.eventControl.value) {
      filters.eventName = this.eventControl.value;
    }

    try {
      const response: pst.ListResponse<pst.Event> =
        await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.getEvents(filters, temporaryListSize);
      if (!this.onDestroyCalled) {
        response.objects
          .filter((event) => {
            return !this.events.some((e) => e.blockNumber === event.blockNumber && e.eventIdx === event.eventIdx);
          })
          .forEach((event) => {
            this.events.push(event);
          });

        this.events.sort((a, b) => b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx);
        this.events.length = Math.min(this.events.length, temporaryListSize);
        this.cd.markForCheck();
      }
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  track(i: any, event: pst.Event): string {
    return `${event.blockNumber}-${event.eventIdx}`;
  }
}
