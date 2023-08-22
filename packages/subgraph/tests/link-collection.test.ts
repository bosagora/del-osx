import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import { AcceptedRequestItem } from "../generated/schema"
import { AcceptedRequestItem as AcceptedRequestItemEvent } from "../generated/LinkCollection/LinkCollection"
import { handleAcceptedRequestItem } from "../src/link-collection"
import { createAcceptedRequestItemEvent } from "./link-collection-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let id = BigInt.fromI32(234)
    let email = Bytes.fromI32(1234567890)
    let wallet = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newAcceptedRequestItemEvent = createAcceptedRequestItemEvent(
      id,
      email,
      wallet
    )
    handleAcceptedRequestItem(newAcceptedRequestItemEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AcceptedRequestItem created and stored", () => {
    assert.entityCount("AcceptedRequestItem", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AcceptedRequestItem",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "email",
      "1234567890"
    )
    assert.fieldEquals(
      "AcceptedRequestItem",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "wallet",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
