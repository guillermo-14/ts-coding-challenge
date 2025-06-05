import { AccountCreateTransaction, AccountId, Hbar, PrivateKey } from '@hashgraph/sdk'
import { client } from '@/step_definitions/token-service'
import { SDK_RESPONSES } from './constants'
import assert from 'node:assert'

/**
 * Parameters for creating a new Hedera account.
 */
interface CreateAccountParams {
  /** Optional. The initial balance in HBAR for the new account. Defaults to 0 if not provided. */
  initialBalance?: number
}

/**
 * Creates a new Hedera account with a new ED25519 key pair.
 *
 * @param params - Optional parameters for account creation.
 * @param params.initialBalance - The initial HBAR balance for the account.
 * @returns A promise that resolves to an object containing the new account's AccountId and PrivateKey.
 */
export async function createAccount ({ initialBalance }: CreateAccountParams = {}) {
  const accountPrivateKey = await PrivateKey.generateED25519Async()
  const accountPublicKey = accountPrivateKey.publicKey

  let tx = new AccountCreateTransaction()
    .setKeyWithoutAlias(accountPublicKey)

  if (initialBalance) {
    tx = tx.setInitialBalance(new Hbar(initialBalance))
  }

  const txResponse = await tx.execute(client)
  const receipt = await txResponse.getReceipt(client)

  assert.equal(receipt.status.toString(), SDK_RESPONSES.SUCCESS)

  const accountId = receipt.accountId

  return {
    accountId,
    accountPrivateKey
  }
}
