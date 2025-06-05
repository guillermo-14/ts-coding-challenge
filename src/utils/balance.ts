import { AccountBalanceQuery, AccountId, PrivateKey, ReceiptStatusError, TokenAssociateTransaction, TokenId } from '@hashgraph/sdk'
import { client } from '@/step_definitions/token-service'
import assert from 'node:assert'
import { SDK_RESPONSES } from '@/utils/constants'

/**
 * Retrieves the HBAR balance of a specified account.
 *
 * @param accountId - The AccountId of the account to query.
 * @returns A promise that resolves to the HBAR balance in tinybars, converted to a number.
 */
export async function getHbarBalance (accountId: AccountId): Promise<number> {
  const query = new AccountBalanceQuery()
    .setAccountId(accountId)
  const balance = await query.execute(client)
  return balance.hbars.toBigNumber().toNumber()
}

/**
 * Retrieves the balance of a specific token for a given account.
 *
 * @param params - The parameters for fetching the token balance.
 * @param params.accountId - The AccountId of the account.
 * @param params.tokenId - The TokenId of the token.
 * @param params.privateKey - The PrivateKey of the account (required for `ensureTokenAssociated`).
 * @returns A promise that resolves to the token balance (number) or 0 if the token is not held.
 */
export async function getTokenBalance ({ accountId, tokenId, privateKey }: { accountId: AccountId, tokenId: TokenId, privateKey: PrivateKey }): Promise<number> {
  await ensureTokenAssociated({ accountId, tokenId, privateKey })

  const query = new AccountBalanceQuery()
    .setAccountId(accountId)

  const balance = await query.execute(client)
  return balance.tokens?._map.get(tokenId.toString())?.toNumber() ?? 0
}

/**
 * Ensures that a token is associated with an account.
 * If the token is not associated, it will attempt to associate it.
 * If the token is already associated, it will do nothing and return false.
 * Throws an error if the association fails for reasons other than the token already being associated.
 *
 * @param params - The parameters for ensuring token association.
 * @param params.accountId - The AccountId of the account.
 * @param params.tokenId - The TokenId of the token to associate.
 * @param params.privateKey - The PrivateKey of the account to sign the association transaction if needed.
 * @returns A promise that resolves to true if a new association was made, false if already associated.
 */
export async function ensureTokenAssociated ({ accountId, tokenId, privateKey }: { accountId: AccountId, tokenId: TokenId, privateKey: PrivateKey }): Promise<boolean> {
  const tx = new TokenAssociateTransaction()
    .setAccountId(accountId)
    .setTokenIds([tokenId])
    .freezeWith(client)

  const signTxAssociate = await tx.sign(privateKey)

  try {
    const receipt = await (await signTxAssociate.execute(client)).getReceipt(client)
    assert.equal(receipt.status.toString(), SDK_RESPONSES.SUCCESS)
    return true
  } catch (error) {
    if (error instanceof ReceiptStatusError && error.status.toString() === SDK_RESPONSES.TOKEN_ALREADY_ASSOCIATED_ERROR) {
      return false // Already associated
    }
    throw error // Other errors
  }
}
