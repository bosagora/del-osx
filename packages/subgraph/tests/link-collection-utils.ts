import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import {
  AcceptedRequestItem,
  AddedRequestItem,
  RejectedRequestItem,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  UpdatedLinkItem
} from "../generated/LinkCollection/LinkCollection"

export function createAcceptedRequestItemEvent(
  id: BigInt,
  hash: Bytes,
  sender: Address
): AcceptedRequestItem {
  let acceptedRequestItemEvent = changetype<AcceptedRequestItem>(newMockEvent())

  acceptedRequestItemEvent.parameters = new Array()

  acceptedRequestItemEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  acceptedRequestItemEvent.parameters.push(
    new ethereum.EventParam("hash", ethereum.Value.fromFixedBytes(hash))
  )
  acceptedRequestItemEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return acceptedRequestItemEvent
}

export function createAddedRequestItemEvent(
  id: BigInt,
  email: Bytes,
  wallet: Address
): AddedRequestItem {
  let addedRequestItemEvent = changetype<AddedRequestItem>(newMockEvent())

  addedRequestItemEvent.parameters = new Array()

  addedRequestItemEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  addedRequestItemEvent.parameters.push(
    new ethereum.EventParam("email", ethereum.Value.fromFixedBytes(email))
  )
  addedRequestItemEvent.parameters.push(
    new ethereum.EventParam("wallet", ethereum.Value.fromAddress(wallet))
  )

  return addedRequestItemEvent
}

export function createRejectedRequestItemEvent(
  id: BigInt,
  hash: Bytes,
  sender: Address
): RejectedRequestItem {
  let rejectedRequestItemEvent = changetype<RejectedRequestItem>(newMockEvent())

  rejectedRequestItemEvent.parameters = new Array()

  rejectedRequestItemEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  rejectedRequestItemEvent.parameters.push(
    new ethereum.EventParam("hash", ethereum.Value.fromFixedBytes(hash))
  )
  rejectedRequestItemEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return rejectedRequestItemEvent
}

export function createRoleAdminChangedEvent(
  role: Bytes,
  previousAdminRole: Bytes,
  newAdminRole: Bytes
): RoleAdminChanged {
  let roleAdminChangedEvent = changetype<RoleAdminChanged>(newMockEvent())

  roleAdminChangedEvent.parameters = new Array()

  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "previousAdminRole",
      ethereum.Value.fromFixedBytes(previousAdminRole)
    )
  )
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "newAdminRole",
      ethereum.Value.fromFixedBytes(newAdminRole)
    )
  )

  return roleAdminChangedEvent
}

export function createRoleGrantedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleGranted {
  let roleGrantedEvent = changetype<RoleGranted>(newMockEvent())

  roleGrantedEvent.parameters = new Array()

  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleGrantedEvent
}

export function createRoleRevokedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleRevoked {
  let roleRevokedEvent = changetype<RoleRevoked>(newMockEvent())

  roleRevokedEvent.parameters = new Array()

  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleRevokedEvent
}

export function createUpdatedLinkItemEvent(
  hash: Bytes,
  sender1: Address,
  sender2: Address
): UpdatedLinkItem {
  let updatedLinkItemEvent = changetype<UpdatedLinkItem>(newMockEvent())

  updatedLinkItemEvent.parameters = new Array()

  updatedLinkItemEvent.parameters.push(
    new ethereum.EventParam("hash", ethereum.Value.fromFixedBytes(hash))
  )
  updatedLinkItemEvent.parameters.push(
    new ethereum.EventParam("sender1", ethereum.Value.fromAddress(sender1))
  )
  updatedLinkItemEvent.parameters.push(
    new ethereum.EventParam("sender2", ethereum.Value.fromAddress(sender2))
  )

  return updatedLinkItemEvent
}
