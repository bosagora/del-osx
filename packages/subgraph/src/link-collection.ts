import {
  AcceptedRequestItem as AcceptedRequestItemEvent,
  AddedRequestItem as AddedRequestItemEvent,
  RejectedRequestItem as RejectedRequestItemEvent,
  UpdatedLinkItem as UpdatedLinkItemEvent,
} from "../generated/LinkCollection/LinkCollection";
import {
  AcceptedRequestItem,
  AddedRequestItem,
  RejectedRequestItem,
  UpdatedLinkItem,
} from "../generated/schema";

export function handleAcceptedRequestItem(
  event: AcceptedRequestItemEvent
): void {
  let entity = new AcceptedRequestItem(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.LinkCollection_id = event.params.id;
  entity.email = event.params.email;
  entity.wallet = event.params.wallet;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleAddedRequestItem(event: AddedRequestItemEvent): void {
  let entity = new AddedRequestItem(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.LinkCollection_id = event.params.id;
  entity.email = event.params.email;
  entity.wallet = event.params.wallet;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleRejectedRequestItem(
  event: RejectedRequestItemEvent
): void {
  let entity = new RejectedRequestItem(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.LinkCollection_id = event.params.id;
  entity.email = event.params.email;
  entity.wallet = event.params.wallet;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleUpdatedLinkItem(event: UpdatedLinkItemEvent): void {
  let entity = new UpdatedLinkItem(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.email = event.params.email;
  entity.wallet1 = event.params.wallet1;
  entity.wallet2 = event.params.wallet2;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
