import {
  AcceptedRequestItem as AcceptedRequestItemEvent,
  AddedRequestItem as AddedRequestItemEvent,
  RejectedRequestItem as RejectedRequestItemEvent,
  UpdatedLinkItem as UpdatedLinkItemEvent,
} from "../generated/LinkCollection/LinkCollection";
import { LinkItems, RequestItems } from "../generated/schema";

export function handleAddedRequestItem(event: AddedRequestItemEvent): void {
  let entity = new RequestItems(event.params.id);
  entity.email = event.params.email;
  entity.wallet = event.params.wallet;
  entity.email = event.params.email;
  entity.status = "REQUESTED";

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleAcceptedRequestItem(
  event: AcceptedRequestItemEvent
): void {
  let entity = RequestItems.load(event.params.id);
  if (entity === null) {
    entity = new RequestItems(event.params.id);
  }
  entity.email = event.params.email;
  entity.wallet = event.params.wallet;
  entity.email = event.params.email;
  entity.status = "ACCEPTED";

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  let linkEntity = LinkItems.load(event.params.email);
  if (linkEntity === null) {
    linkEntity = new LinkItems(event.params.email);
  }
  linkEntity.wallet = event.params.wallet;
  linkEntity.blockNumber = event.block.number;
  linkEntity.blockTimestamp = event.block.timestamp;
  linkEntity.transactionHash = event.transaction.hash;
  linkEntity.save();
}

export function handleRejectedRequestItem(
  event: RejectedRequestItemEvent
): void {
  let entity = RequestItems.load(event.params.id);
  if (entity === null) {
    entity = new RequestItems(event.params.id);
  }
  entity.email = event.params.email;
  entity.wallet = event.params.wallet;
  entity.email = event.params.email;
  entity.status = "REJECTED";

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleUpdatedLinkItem(event: UpdatedLinkItemEvent): void {
  let linkEntity = LinkItems.load(event.params.email);
  if (linkEntity === null) {
    linkEntity = new LinkItems(event.params.email);
  }
  linkEntity.wallet = event.params.wallet2;
  linkEntity.blockNumber = event.block.number;
  linkEntity.blockTimestamp = event.block.timestamp;
  linkEntity.transactionHash = event.transaction.hash;
  linkEntity.save();
}
