import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { NetworkService } from '../../../../../../services/network.service';
import { PolkadaptService } from '../../../../../../services/polkadapt.service';
import { takeUntil } from 'rxjs/operators';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';


const temporaryListSize = 100;


@Component({
  selector: 'app-balances-transfer-list',
  templateUrl: './balances-transfer-list.component.html',
  styleUrls: ['./balances-transfer-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalancesTransferListComponent implements OnInit {
  transfers: pst.Transfer[] = [];

  private network: string;
  private unsubscribeNewTransferFn: null | (() => void);
  private destroyer: Subject<undefined> = new Subject();

  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private cd: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.ns.currentNetwork
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe((network: string) => {
        this.network = network;
        this.unsubscribeNewTransfer();

        if (network) {
          this.subscribeNewTransfer();
          this.getTransfers();
        }
      });
  }


  async subscribeNewTransfer(): Promise<void> {
    try {
      this.unsubscribeNewTransferFn = await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.subscribeNewTransfer(
        (transfer: pst.Transfer) => {
          if (!this.transfers.some((l) => l.blockNumber === transfer.blockNumber && l.eventIdx === transfer.eventIdx)) {
            this.transfers.splice(0, 0, transfer);
            this.transfers.sort((a, b) => b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx);
            this.transfers.length = Math.min(this.transfers.length, temporaryListSize);
            this.cd.markForCheck();
          }
        });
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  unsubscribeNewTransfer(): void {
    if (this.unsubscribeNewTransferFn) {
      this.unsubscribeNewTransferFn();
      this.unsubscribeNewTransferFn = null;
    }
  }


  async getTransfers(): Promise<void> {
    try {
      const response: pst.ListResponse<pst.Transfer> =
        await this.pa.run(this.ns.currentNetwork.value).polkascan.chain.getTransfers(temporaryListSize);

      response.objects
      .filter((transfer) => {
        return !this.transfers.some((l) => l.blockNumber === transfer.blockNumber && l.eventIdx === transfer.eventIdx);
      })
      .forEach((transfer) => {
        this.transfers.push(transfer);
      });

      this.transfers.sort((a, b) => b.blockNumber - a.blockNumber || b.eventIdx - a.eventIdx);
      this.transfers.length = Math.min(this.transfers.length, temporaryListSize);
      this.cd.markForCheck();
    } catch (e) {
      console.error(e);
      // Ignore for now...
    }
  }


  track(i: any, transfer: pst.Transfer): string {
    return `${transfer.blockNumber}-${transfer.eventIdx}`;
  }
}
