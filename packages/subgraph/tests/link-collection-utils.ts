import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import {
  AcceptedRequestItem,
  AddedRequestItem,
  RejectedRequestItem,
  UpdatedLinkItem
} from "../generated/LinkCollection/LinkCollection"

export function createAcceptedRequestItemEvent(
  id: BigInt,
  email: Bytes,
  wallet: Address
): AcceptedRequestItem {
  let acceptedRequestItemEvent = changetype<AcceptedRequestItem>(newMockEvent())

  acceptedRequestItemEvent.parameters = new Array()

  acceptedRequestItemEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  acceptedRequestItemEvent.parameters.push(
    new ethereum.EventParam("email", ethereum.Value.fromFixedBytes(email))
  )
  acceptedRequestItemEvent.parameters.push(
    new ethereum.EventParam("wallet", ethereum.Value.fromAddress(wallet))
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
  email: Bytes,
  wallet: Address
): RejectedRequestItem {
  let rejectedRequestItemEvent = changetype<RejectedRequestItem>(newMockEvent())

  rejectedRequestItemEvent.parameters = new Array()

  rejectedRequestItemEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  rejectedRequestItemEvent.parameters.push(
    new ethereum.EventParam("email", ethereum.Value.fromFixedBytes(email))
  )
  rejectedRequestItemEvent.parameters.push(
    new ethereum.EventParam("wallet", ethereum.Value.fromAddress(wallet))
  )

  return rejectedRequestItemEvent
}

export function createUpdatedLinkItemEvent(
  email: Bytes,
  wallet1: Address,
  wallet2: Address
): UpdatedLinkItem {
  let updatedLinkItemEvent = changetype<UpdatedLinkItem>(newMockEvent())

  updatedLinkItemEvent.parameters = new Array()

  updatedLinkItemEvent.parameters.push(
    new ethereum.EventParam("email", ethereum.Value.fromFixedBytes(email))
  )
  updatedLinkItemEvent.parameters.push(
    new ethereum.EventParam("wallet1", ethereum.Value.fromAddress(wallet1))
  )
  updatedLinkItemEvent.parameters.push(
    new ethereum.EventParam("wallet2", ethereum.Value.fromAddress(wallet2))
  )

  return updatedLinkItemEvent
}
