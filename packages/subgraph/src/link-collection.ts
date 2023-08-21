import {
  AcceptedRequestItem as AcceptedRequestItemEvent,
  AddedRequestItem as AddedRequestItemEvent,
  RejectedRequestItem as RejectedRequestItemEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  UpdatedLinkItem as UpdatedLinkItemEvent
} from "../generated/LinkCollection/LinkCollection"
import {
  AcceptedRequestItem,
  AddedRequestItem,
  RejectedRequestItem,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  UpdatedLinkItem
} from "../generated/schema"

export function handleAcceptedRequestItem(
  event: AcceptedRequestItemEvent
): void {
  let entity = new AcceptedRequestItem(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.LinkCollection_id = event.params.id
  entity.hash = event.params.hash
  entity.sender = event.params.sender

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleAddedRequestItem(event: AddedRequestItemEvent): void {
  let entity = new AddedRequestItem(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.LinkCollection_id = event.params.id
  entity.email = event.params.email
  entity.wallet = event.params.wallet

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRejectedRequestItem(
  event: RejectedRequestItemEvent
): void {
  let entity = new RejectedRequestItem(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.LinkCollection_id = event.params.id
  entity.hash = event.params.hash
  entity.sender = event.params.sender

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoleAdminChanged(event: RoleAdminChangedEvent): void {
  let entity = new RoleAdminChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.previousAdminRole = event.params.previousAdminRole
  entity.newAdminRole = event.params.newAdminRole

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoleGranted(event: RoleGrantedEvent): void {
  let entity = new RoleGranted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
  let entity = new RoleRevoked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUpdatedLinkItem(event: UpdatedLinkItemEvent): void {
  let entity = new UpdatedLinkItem(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.hash = event.params.hash
  entity.sender1 = event.params.sender1
  entity.sender2 = event.params.sender2

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
