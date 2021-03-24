import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { ListResponse } from '../../../../../../../polkadapt/projects/polkascan/src/lib/polkascan.types';


type psExtrinsic = {
  blockNumber: number; // combined primary key blockNumber, extrinsicIdx
  extrinsicIdx: number; // combined primary key blockNumber, extrinsicIdx
  callModule: string | null;
  callName: string | null;
  signed: number | null;
};

const temporaryListSize = 100;


@Component({
  selector: 'app-extrinsic-list',
  templateUrl: './extrinsic-list.component.html',
  styleUrls: ['./extrinsic-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicListComponent implements OnInit, OnDestroy {
  extrinsics: psExtrinsic[] = [];

  signedControl: FormControl = new FormControl(true);
  filtersFormGroup: FormGroup = new FormGroup({
    signed: this.signedControl,
  });

  private network: string;
  private unsubscribeNewExtrinsicFn: null | (() => void);
  private destroyer: Subject<undefined> = new Subject();
  private onDestroyCalled = false;

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
        this.unsubscribeNewExtrinsic();
        this.extrinsics = [];
        this.cd.markForCheck();

        this.subscribeNewExtrinsic();
        this.getExtrinsics();
      });

    this.ns.currentNetwork
      .pipe(
        debounceTime(100),
        takeUntil(this.destroyer)
      )
      .subscribe((network: string) => {
        this.network = network;
        this.unsubscribeNewExtrinsic();

        if (network) {
          this.subscribeNewExtrinsic();
          this.getExtrinsics();
        }
      });
  }


  ngOnDestroy(): void {
    this.onDestroyCalled = true;
    this.destroyer.next();
    this.destroyer.complete();
    this.unsubscribeNewExtrinsic();
  }


  async subscribeNewExtrinsic(): Promise<void> {
    if (this.onDestroyCalled) {
      // Component is already in process of destruction or destroyed.
      this.unsubscribeNewExtrinsic();
      return;
    }

    const filters: any = {};
    if (this.signedControl.value === true) {
      // If true, singed only is being set. There is no need for a not signed check.
      filters.signed = 1;
    }

    try {
      this.unsubscribeNewExtrinsicFn = await this.pa.run(this.ns.currentNetwork.value).polkascan.subscribeNewExtrinsic(
        filters,
        (extrinsic: psExtrinsic) => {
          if (!this.onDestroyCalled) {
            if (!this.extrinsics.some((e) => e.blockNumber === extrinsic.blockNumber && e.extrinsicIdx === extrinsic.extrinsicIdx)) {
              this.extrinsics.splice(0, 0, extrinsic);
              this.extrinsics.sort((a, b) => b.blockNumber - a.blockNumber || b.extrinsicIdx - a.extrinsicIdx);
              this.extrinsics.length = Math.min(this.extrinsics.length, temporaryListSize);
              this.cd.markForCheck();
            }
          } else {
            // If still listening but component is already destroyed.
            this.unsubscribeNewExtrinsic();
          }
        });
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  unsubscribeNewExtrinsic(): void {
    if (this.unsubscribeNewExtrinsicFn) {
      this.unsubscribeNewExtrinsicFn();
      this.unsubscribeNewExtrinsicFn = null;
    }
  }


  async getExtrinsics(): Promise<void> {
    if (this.onDestroyCalled) {
      // Component is already in process of destruction or destroyed.
      return;
    }

    const filters: any = {};
    if (this.signedControl.value === true) {
      // If true, singed only is being set. There is no need for a not signed check.
      filters.signed = 1;
    }

    try {
      const response: ListResponse<psExtrinsic> = await this.pa.run(this.ns.currentNetwork.value).polkascan.getExtrinsics(filters, 100);
      if (!this.onDestroyCalled) {
        response.objects
          .filter((extrinsic) => {
            return !this.extrinsics.some((e) => e.blockNumber === extrinsic.blockNumber && e.extrinsicIdx === extrinsic.extrinsicIdx);
          })
          .forEach((extrinsic) => {
            this.extrinsics.push(extrinsic);
          });

        this.extrinsics.length = Math.min(this.extrinsics.length, temporaryListSize);
        this.extrinsics.sort((a, b) => b.blockNumber - a.blockNumber || b.extrinsicIdx - a.extrinsicIdx);
        this.cd.markForCheck();
      }
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  trackByIdFn(i: any, extrinsic: psExtrinsic): string {
    return `${extrinsic.blockNumber}-${extrinsic.extrinsicIdx}`;
  }
}
