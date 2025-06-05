import { AccountAllowanceApproveTransaction, AccountId, PrivateKey, TokenId, TransactionId, TransactionReceipt, TransferTransaction } from '@hashgraph/sdk'
import { client, TREASURY_ACCOUNT_ID, TREASURY_PRIVATE_KEY } from '@/step_definitions/token-service'
import assert from 'node:assert'
import { SDK_RESPONSES } from '@/utils/constants'

/**
 * Transfers a specified amount of a token from the treasury account to a given account.
 *
 * @param params - The parameters for the token transfer.
 * @param params.accountId - The AccountId of the recipient.
 * @param params.tokenId - The TokenId of the token to transfer.
 * @param params.amount - The amount of the token to transfer.
 */
export async function transferTokensFromTreasury ({ accountId, tokenId, amount }: { accountId: AccountId, tokenId: TokenId, amount: number }): Promise<void> {
  const transaction = new TransferTransaction()
    .addTokenTransfer(tokenId, TREASURY_ACCOUNT_ID, -amount)
    .addTokenTransfer(tokenId, accountId, amount)
    .freezeWith(client)

  const signTxTransfer = await transaction.sign(TREASURY_PRIVATE_KEY)
  const txTransferResponse = await signTxTransfer.execute(client)
  const receipt = await txTransferResponse.getReceipt(client)
  assert.equal(receipt.status.toString(), SDK_RESPONSES.SUCCESS)
}

/**
 * Submits a pre-built and signed transfer transaction to the Hedera network.
 *
 * @param params - The parameters for submitting the transaction.
 * @param params.tx - The TransferTransaction to submit.
 * @param params.privateKey - The PrivateKey to sign the transaction.
 * @returns A promise that resolves with the transaction receipt.
 */
export async function submitTransferTransaction ({ tx, privateKey }: { tx: TransferTransaction, privateKey: PrivateKey }): Promise<TransactionReceipt> {
  const signTxTransfer = await tx.sign(privateKey)
  const txTransferResponse = await signTxTransfer.execute(client)
  const receipt = await txTransferResponse.getReceipt(client)
  return receipt
}

/**
 * Approves a token allowance for a spender account and executes the transaction.
 *
 * @param params - The parameters for approving the token allowance.
 * @param params.tokenId - The TokenId of the token.
 * @param params.accountIdA - The AccountId of the owner (approver).
 * @param params.accountIdB - The AccountId of the spender.
 * @param params.amount - The amount of the token to approve for spending.
 * @param params.privateKey - The PrivateKey of the owner (approver) to sign the transaction.
 */
export async function approveTransferTransaction ({ tokenId, accountIdA, accountIdB, amount, privateKey }: { tokenId: TokenId, accountIdA: AccountId, accountIdB: AccountId, amount: number, privateKey: PrivateKey }): Promise<void> {
  const tx = new AccountAllowanceApproveTransaction()
    .approveTokenAllowance(
      tokenId,
      accountIdA,
      accountIdB,
      amount
    )
    .freezeWith(client)

  const signTxApprove = await tx.sign(privateKey)
  const txApproveResponse = await signTxApprove.execute(client)
  const receipt = await txApproveResponse.getReceipt(client)
  assert.equal(receipt.status.toString(), SDK_RESPONSES.SUCCESS)
}

/**
 * Represents a single account movement in a token transfer.
 */
interface AccountMove {
  /** The AccountId involved in the move. */
  accountId: AccountId
  /** The amount to transfer. Positive for credit, negative for debit. */
  amount: number // Positive = in, Negative = out
  /** If true, the transfer is an approved transfer (spender acting on behalf of owner). */
  approved?: boolean // true => addApprovedTokenTransfer
}

/**
 * Parameters for building a transfer transaction.
 */
interface BuildTransferTxParams {
  /** The AccountId that will pay for the transaction and generate the TransactionId. */
  payerAccountId: AccountId // Account that signs and generates the TransactionId
  /** The TokenId of the token being transferred. */
  tokenId: TokenId
  /** An array of account movements. */
  moves: AccountMove[]
}

/**
 * Returns a frozen TransferTransaction ready to be signed and executed.
 * @param params - The parameters for building the transfer transaction.
 * @returns A promise that resolves with the frozen TransferTransaction.
 */
export async function buildTransferTx ({
  payerAccountId,
  tokenId,
  moves
}: BuildTransferTxParams): Promise<TransferTransaction> {
  const tx = new TransferTransaction()

  for (const { accountId, amount, approved } of moves) {
    if (approved === true) {
      tx.addApprovedTokenTransfer(tokenId, accountId, amount)
    } else {
      tx.addTokenTransfer(tokenId, accountId, amount)
    }
  }

  tx.setTransactionId(TransactionId.generate(payerAccountId))
    .freezeWith(client)

  return tx
}
