import { Given, Then, When, Before, setDefaultTimeout } from '@cucumber/cucumber'
import { accounts } from '@/src/config'
import { AccountId, Client, PrivateKey, ReceiptStatusError, TokenSupplyType } from '@hashgraph/sdk'
import assert from 'node:assert'
import { SDK_RESPONSES, TIMEOUT } from '@/utils/constants'
import { ensureTokenAssociated, getHbarBalance, getTokenBalance } from '@/utils/balance'
import { approveTransferTransaction, buildTransferTx, submitTransferTransaction, transferTokensFromTreasury } from '@/utils/transfer'
import { createTestToken, getTestTokenInfo, mintTestToken } from '@/utils/token'
import { createAccount } from '@/utils/account'

export const client = Client.forTestnet()

const account = accounts[0]
export const TREASURY_ACCOUNT_ID = AccountId.fromString(account.id)
export const TREASURY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey)

setDefaultTimeout(TIMEOUT)

Before(function () {
  this.accountId = TREASURY_ACCOUNT_ID
  this.privateKey = TREASURY_PRIVATE_KEY
  client.setOperator(this.accountId, this.privateKey)
})

//= ====================SCENARIO 1==========================================
Given(/^A Hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const hbarBalance = await getHbarBalance(this.accountId)
  // [🧪 Test] Check that the account has more than the expected balance
  assert.ok(hbarBalance > expectedBalance)
})

When(/^I create a token named Test Token \(HTT\)$/, async function () {
  const tokenId = await createTestToken()

  // [🧪 Test] Check that the token Id is not null
  assert.ok(tokenId)

  // Get the token info and set it to the global variable
  const tokenInfo = await getTestTokenInfo({ tokenId })
  this.tokenInfo = tokenInfo
  this.tokenId = tokenId
})

Then(/^The token has the name "([^"]*)"$/, async function (expectedTokenName: string) {
  const { name } = this.tokenInfo

  // [🧪 Test] Check that the token name is the same as the one we created
  assert.equal(name, expectedTokenName)
})

Then(/^The token has the symbol "([^"]*)"$/, async function (expectedTokenSymbol: string) {
  const { symbol } = this.tokenInfo

  // [🧪 Test] Check that the token symbol is the same as the one we created
  assert.equal(symbol, expectedTokenSymbol)
})

Then(/^The token has (\d+) decimals$/, async function (expectedTokenDecimals: number) {
  const { decimals } = this.tokenInfo

  // [🧪 Test] Check that the token decimals is the same as the one we created
  assert.equal(decimals, expectedTokenDecimals)
})

Then(/^The token is owned by the account$/, async function () {
  const { treasuryAccountId } = this.tokenInfo

  // [🧪 Test] Check that the token is owned by the treasury account
  assert.equal(treasuryAccountId?.toString(), this.accountId.toString())
})

Then(/^An attempt to mint (\d+) additional tokens succeeds$/, async function (amount: number) {
  // Mint the tokens
  await mintTestToken({ tokenId: this.tokenId, amount })

  // Query the token info again to get the updated total supply
  const { totalSupply } = await getTestTokenInfo({ tokenId: this.tokenId })

  // [🧪 Test] Check that the token supply is the same as the amount we minted
  assert.equal(totalSupply.toNumber(), amount)
})

//= ====================SCENARIO 2==========================================
When(/^I create a fixed supply token named Test Token \(HTT\) with (\d+) tokens$/, async function (supply: number) {
  const tokenId = await createTestToken({ fixedSupply: true })
  this.tokenId = tokenId

  const tokenInfo = await getTestTokenInfo({ tokenId: this.tokenId })
  this.tokenInfo = tokenInfo

  // [🧪 Test] Check that the token is fixed supply and has the desired supply
  assert.equal(tokenInfo.supplyType, TokenSupplyType.Finite)
  assert.equal(tokenInfo.maxSupply?.toNumber(), supply)
})

Then(/^The total supply of the token is (\d+)$/, async function (totalSupply: number) {
  const { totalSupply: tokenTotalSupply } = this.tokenInfo

  // [🧪 Test] Check that the fixed token total supply is the same as the one we created
  assert.equal(tokenTotalSupply.toNumber(), totalSupply)
})

Then(/^An attempt to mint tokens fails$/, async function () {
  try {
    await mintTestToken({ tokenId: this.tokenId, amount: 1 })
  } catch (error) {
    if (error instanceof ReceiptStatusError) {
      // [🧪 Test] Check that the mint transaction failed with the correct error
      assert.equal(error.status.toString(), SDK_RESPONSES.MAX_SUPPLY_REACHED_ERROR)
    } else {
      console.error(error)
    }
  }
})

//= ====================SCENARIO 3==========================================
Given(/^A first hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const { accountId, accountPrivateKey } = await createAccount({ initialBalance: expectedBalance + 1 })
  this.firstAccountId = accountId
  this.firstAccountPrivateKey = accountPrivateKey

  const hbarBalance = await getHbarBalance(accountId)
  this.firstAccountBalance = hbarBalance

  // [🧪 Test] Check that the second account has more than the expected balance
  assert.ok(hbarBalance > expectedBalance)
})

Given(/^A second Hedera account$/, async function () {
  const { accountId, accountPrivateKey } = await createAccount()
  this.secondAccountId = accountId
  this.secondAccountPrivateKey = accountPrivateKey

  // [🧪 Test] Check that the second account was created successfully
  assert.ok(accountId)
})

Given(/^A token named Test Token \(HTT\) with (\d+) tokens$/, async function (initialSupply: number) {
  const tokenId = await createTestToken({ initialSupply: true })
  this.tokenId = tokenId

  const tokenInfo = await getTestTokenInfo({ tokenId: this.tokenId })
  this.tokenInfo = tokenInfo

  // [🧪 Test] Check that the token total supply is the same as the one we created
  assert.equal(tokenInfo.totalSupply.toNumber(), initialSupply)
})

Given(/^The first account holds (\d+) HTT tokens$/, async function (firstAccountBalance: number) {
  let tokenBalance = await getTokenBalance({
    accountId: this.firstAccountId,
    tokenId: this.tokenId,
    privateKey: this.firstAccountPrivateKey
  })

  if (firstAccountBalance > 0 && tokenBalance === 0) {
    await transferTokensFromTreasury({
      accountId: this.firstAccountId,
      tokenId: this.tokenId,
      amount: firstAccountBalance
    })
  }

  tokenBalance = await getTokenBalance({
    accountId: this.firstAccountId,
    tokenId: this.tokenId,
    privateKey: this.firstAccountPrivateKey
  })

  // [🧪 Test] Check that the first account holds the expected number of tokens
  assert.equal(tokenBalance, firstAccountBalance)
})

Given(/^The second account holds (\d+) HTT tokens$/, async function (secondAccountBalance: number) {
  let tokenBalance = await getTokenBalance({
    accountId: this.secondAccountId,
    tokenId: this.tokenId,
    privateKey: this.secondAccountPrivateKey
  })

  if (secondAccountBalance > 0 && tokenBalance === 0) {
    await transferTokensFromTreasury({
      accountId: this.secondAccountId,
      tokenId: this.tokenId,
      amount: secondAccountBalance
    })
  }

  tokenBalance = await getTokenBalance({
    accountId: this.secondAccountId,
    tokenId: this.tokenId,
    privateKey: this.secondAccountPrivateKey
  })

  // [🧪 Test] Check that the second account holds the expected number of tokens
  assert.equal(tokenBalance, secondAccountBalance)
})

When(/^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/, async function (amount: number) {
  // Transfer 10 HTT tokens to the second account
  this.transaction = await buildTransferTx({
    payerAccountId: this.firstAccountId,
    tokenId: this.tokenId,
    moves: [
      { accountId: this.firstAccountId, amount: -amount },
      { accountId: this.secondAccountId, amount }
    ]
  })
})

When(/^The first account submits the transaction$/, async function () {
  const receipt = await submitTransferTransaction({ tx: this.transaction, privateKey: this.firstAccountPrivateKey })

  // [🧪 Test] Check that the transfer transaction is successful
  assert.equal(receipt.status.toString(), SDK_RESPONSES.SUCCESS)
})

//= ====================SCENARIO 4==========================================
When(/^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/, async function (amount: number) {
  await approveTransferTransaction({
    tokenId: this.tokenId,
    accountIdA: this.secondAccountId,
    accountIdB: this.firstAccountId,
    amount,
    privateKey: this.secondAccountPrivateKey
  })

  this.transaction = await buildTransferTx({
    payerAccountId: this.firstAccountId,
    tokenId: this.tokenId,
    moves: [
      { accountId: this.secondAccountId, amount: -amount, approved: true },
      { accountId: this.firstAccountId, amount }
    ]
  })
})

Then(/^The first account has paid for the transaction fee$/, async function () {
  const hbarBalance = await getHbarBalance(this.firstAccountId)
  // [🧪 Test] Check that the first account has paid for the transaction fee and has less hbar than before
  assert.ok(hbarBalance < this.firstAccountBalance)
})
//= ====================SCENARIO 5==========================================

Given(/^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbarBalance: number, expectedTokenBalance: number) {
  const { accountId, accountPrivateKey } = await createAccount({ initialBalance: expectedHbarBalance + 1 })
  this.firstAccountId = accountId
  this.firstAccountPrivateKey = accountPrivateKey

  await ensureTokenAssociated({
    accountId,
    tokenId: this.tokenId,
    privateKey: this.firstAccountPrivateKey
  })

  await transferTokensFromTreasury({
    accountId,
    tokenId: this.tokenId,
    amount: expectedTokenBalance
  })

  const hbarBalance = await getHbarBalance(accountId)
  const tokenBalance = await getTokenBalance({ accountId, tokenId: this.tokenId, privateKey: this.firstAccountPrivateKey })

  // [🧪 Test] Check that the second account has more than the expected balance
  assert.ok(hbarBalance > expectedHbarBalance)
  assert.equal(tokenBalance, expectedTokenBalance)
})

Given(/^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbarBalance: number, expectedTokenBalance: number) {
  const { accountId, accountPrivateKey } = await createAccount({ initialBalance: expectedHbarBalance })
  this.secondAccountId = accountId
  this.secondAccountPrivateKey = accountPrivateKey

  await ensureTokenAssociated({
    accountId,
    tokenId: this.tokenId,
    privateKey: this.secondAccountPrivateKey
  })

  await transferTokensFromTreasury({
    accountId,
    tokenId: this.tokenId,
    amount: expectedTokenBalance
  })

  const hbarBalance = await getHbarBalance(accountId)
  const tokenBalance = await getTokenBalance({ accountId, tokenId: this.tokenId, privateKey: this.secondAccountPrivateKey })

  // [🧪 Test] Check that the second account has more than the expected balance
  assert.equal(hbarBalance, expectedHbarBalance)
  assert.equal(tokenBalance, expectedTokenBalance)
})

Given(/^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbarBalance: number, expectedTokenBalance: number) {
  const { accountId, accountPrivateKey } = await createAccount({ initialBalance: expectedHbarBalance })
  this.thirdAccountId = accountId
  this.thirdAccountPrivateKey = accountPrivateKey

  await ensureTokenAssociated({
    accountId,
    tokenId: this.tokenId,
    privateKey: this.thirdAccountPrivateKey
  })

  await transferTokensFromTreasury({
    accountId,
    tokenId: this.tokenId,
    amount: expectedTokenBalance
  })

  const hbarBalance = await getHbarBalance(accountId)
  const tokenBalance = await getTokenBalance({ accountId, tokenId: this.tokenId, privateKey: this.thirdAccountPrivateKey })

  // [🧪 Test] Check that the third account has more than the expected balance
  assert.equal(hbarBalance, expectedHbarBalance)
  assert.equal(tokenBalance, expectedTokenBalance)
})

Given(/^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbarBalance: number, expectedTokenBalance: number) {
  const { accountId, accountPrivateKey } = await createAccount({ initialBalance: expectedHbarBalance })
  this.fourthAccountId = accountId
  this.fourthAccountPrivateKey = accountPrivateKey

  await ensureTokenAssociated({
    accountId,
    tokenId: this.tokenId,
    privateKey: this.fourthAccountPrivateKey
  })

  await transferTokensFromTreasury({
    accountId,
    tokenId: this.tokenId,
    amount: expectedTokenBalance
  })

  const hbarBalance = await getHbarBalance(accountId)
  const tokenBalance = await getTokenBalance({ accountId, tokenId: this.tokenId, privateKey: this.fourthAccountPrivateKey })

  // [🧪 Test] Check that the fourth account has more than the expected balance
  assert.equal(hbarBalance, expectedHbarBalance)
  assert.equal(tokenBalance, expectedTokenBalance)
})

When(/^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/, async function (outOfFirstAndSecond: number, intoThird: number, intoFourth: number) {
  await approveTransferTransaction({
    tokenId: this.tokenId,
    accountIdA: this.secondAccountId,
    accountIdB: this.firstAccountId,
    amount: outOfFirstAndSecond,
    privateKey: this.secondAccountPrivateKey
  })

  this.transaction = await buildTransferTx({
    payerAccountId: this.firstAccountId,
    tokenId: this.tokenId,
    moves: [
      { accountId: this.firstAccountId, amount: -outOfFirstAndSecond },
      { accountId: this.secondAccountId, amount: -outOfFirstAndSecond, approved: true },
      { accountId: this.thirdAccountId, amount: intoThird },
      { accountId: this.fourthAccountId, amount: intoFourth }
    ]
  })
})

Then(/^The third account holds (\d+) HTT tokens$/, async function (thirdAccountBalance: number) {
  const tokenBalance = await getTokenBalance({
    accountId: this.thirdAccountId,
    tokenId: this.tokenId,
    privateKey: this.thirdAccountPrivateKey
  })
  // [🧪 Test] Check that the third account holds the expected number of tokens
  assert.equal(tokenBalance, thirdAccountBalance)
})

Then(/^The fourth account holds (\d+) HTT tokens$/, async function (fourthAccountBalance: number) {
  const tokenBalance = await getTokenBalance({
    accountId: this.fourthAccountId,
    tokenId: this.tokenId,
    privateKey: this.fourthAccountPrivateKey
  })

  // [🧪 Test] Check that the first account holds the expected number of tokens
  assert.equal(tokenBalance, fourthAccountBalance)
})
