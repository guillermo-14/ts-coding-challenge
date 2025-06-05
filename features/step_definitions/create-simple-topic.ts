import { Before, Given, setDefaultTimeout, Then, When } from '@cucumber/cucumber'
import {
  AccountId,
  Client,
  KeyList,
  PrivateKey,
  TopicMessageQuery, TopicMessageSubmitTransaction
} from '@hashgraph/sdk'
import { accounts } from '../../src/config'
import assert from 'node:assert'
import { getHbarBalance } from '@/utils/balance'
import { TIMEOUT } from '@/utils/constants'
import { createTopic, getTopicInfo } from '@/utils/topic'
import { createAccount } from '@/utils/account'

// Pre-configured client for test network (testnet)
export const client = Client.forTestnet()

// Set the operator with the account ID and private key
const acc = accounts[0]
const account: AccountId = AccountId.fromString(acc.id)
const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey)

setDefaultTimeout(TIMEOUT)

Before(function () {
  this.account = account
  this.privKey = privKey
  client.setOperator(this.account, privKey)
})

//= ====================SCENARIO 1==========================================
Given(/^a first account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const hbarBalance = await getHbarBalance(this.account)
  // [🧪 Test] Check that the account has more than the expected balance
  assert.ok(hbarBalance > expectedBalance)
})

When(/^A topic is created with the memo "([^"]*)" with the first account as the submit key$/, async function (memo: string) {
  // Create the topic
  const topicId = await createTopic({ memo, submitKey: this.privKey })
  this.topicId = topicId

  // Get the topic info
  const { topicMemo, submitKey } = await getTopicInfo({ topicId })

  // [🧪 Test] Check that the topic memo is the same as the one we created
  assert.equal(topicMemo, memo)

  // [🧪 Test] Check that the submit key is the same as the one with the first account
  const publicKey = this.privKey.publicKey
  assert.equal(submitKey?.toString(), publicKey.toString())
})

When(/^The message "([^"]*)" is published to the topic$/, async function (message: string) {
  const txSubmitMessage = new TopicMessageSubmitTransaction()
    .setTopicId(this.topicId)
    .setMessage(message)

  await txSubmitMessage.execute(client)

  const getMessage = txSubmitMessage.getMessage()

  // [🧪 Test] Check that the message is published to the topic
  assert.equal(getMessage?.toString(), message)
})

Then(/^The message "([^"]*)" is received by the topic and can be printed to the console$/, async function (message: string) {
  const messageReceived = await new Promise((resolve, reject) => {
    new TopicMessageQuery()
      .setTopicId(this.topicId)
      .setStartTime(0)
      .subscribe(
        client,
        (error) => console.error(error),
        (message) => resolve((Buffer.from(message?.contents).toString()))
      )
  })

  // [🧪 Test] Check that the message is received by the topic
  assert.equal(messageReceived, message)
})

//= ====================SCENARIO 2=========================================
Given(/^A second account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const { accountId, accountPrivateKey } = await createAccount({ initialBalance: expectedBalance + 1 })
  this.secondAccountId = accountId
  this.secondAccountPrivateKey = accountPrivateKey

  const hbarBalance = await getHbarBalance(accountId)
  this.secondAccountBalance = hbarBalance

  // [🧪 Test] Check that the second account has more than the expected balance
  assert.ok(hbarBalance > expectedBalance)
})

Given(/^A (\d+) of (\d+) threshold key with the first and second account$/, async function (threshold: number, totalKeys: number) {
  const privateKeyList = [this.privKey, this.secondAccountPrivateKey]
  const publicKeyList = privateKeyList.map(key => key.publicKey)

  const thresholdKey = new KeyList(publicKeyList, threshold)
  this.thresholdKey = thresholdKey

  const sizeThresholdKey = thresholdKey.toArray().length

  // [🧪 Test] Check that the threshold key size is equal to the total keys
  assert.equal(sizeThresholdKey, totalKeys)
})

When(/^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/, async function (memo: string) {
  // Create the tx
  const topicId = await createTopic({ memo, submitKey: this.thresholdKey })
  this.topicId = topicId

  // Get the topic info
  const { topicMemo, submitKey } = await getTopicInfo({ topicId })

  // [🧪 Test] Check that the topic memo is the same as the one we created
  assert.equal(topicMemo, memo)

  // [🧪 Test] Check that the submit key is the same as the one with the threshold key
  assert.equal(submitKey?.toString(), this.thresholdKey.toString())
})
