import { TokenCreateTransaction, TokenId, TokenInfoQuery, TokenMintTransaction, TokenSupplyType } from '@hashgraph/sdk'
import { client, TREASURY_PRIVATE_KEY } from '@/step_definitions/token-service'
import { SDK_RESPONSES, TEST_TOKEN_CONFIG } from '@/utils/constants'
import assert from 'node:assert'

/**
 * Parameters for creating a test token.
 */
interface CreateTokenParams {
  /** Optional. If true, creates a token with a fixed supply defined in TEST_TOKEN_CONFIG. Defaults to false. */
  fixedSupply?: boolean
  /** Optional. If true, creates a token with an initial supply defined in TEST_TOKEN_CONFIG. Defaults to false. */
  initialSupply?: boolean
}

/**
 * Creates a new test token (Fungible Common) on the Hedera network.
 * The token configuration (name, symbol, decimals, treasury) is taken from `TEST_TOKEN_CONFIG`.
 *
 * @param params - Optional parameters for token creation, such as fixed supply or initial supply.
 * @returns A promise that resolves with the TokenId of the newly created token.
 */
export async function createTestToken ({ fixedSupply = false, initialSupply = false }: CreateTokenParams = {}) {
  let tx = new TokenCreateTransaction()
    .setTokenType(TEST_TOKEN_CONFIG.TYPE)
    .setTokenName(TEST_TOKEN_CONFIG.NAME)
    .setTokenSymbol(TEST_TOKEN_CONFIG.SYMBOL)
    .setDecimals(TEST_TOKEN_CONFIG.DECIMALS)
    .setTreasuryAccountId(TEST_TOKEN_CONFIG.TREASURY_ACCOUNT_ID)
    .setSupplyKey(TEST_TOKEN_CONFIG.TREASURY_PRIVATE_KEY)

  if (fixedSupply) {
    tx = tx.setSupplyType(TEST_TOKEN_CONFIG.SUPPLY_TYPE)
    tx = tx.setMaxSupply(TEST_TOKEN_CONFIG.MAX_SUPPLY)
    tx = tx.setInitialSupply(TEST_TOKEN_CONFIG.INITIAL_SUPPLY)
  } else if (initialSupply) {
    tx = tx.setInitialSupply(TEST_TOKEN_CONFIG.INITIAL_SUPPLY)
  }

  tx = tx.freezeWith(client)

  const signTx = await tx.sign(TREASURY_PRIVATE_KEY)
  const txResponse = await signTx.execute(client)
  const receipt = await txResponse.getReceipt(client)

  assert.equal(receipt.status.toString(), SDK_RESPONSES.SUCCESS)

  return receipt.tokenId
}

/**
 * Parameters for retrieving test token information.
 */
interface GetTestTokenInfoParams {
  /** The TokenId of the token to query. */
  tokenId: TokenId
}

/**
 * Retrieves information for a given test token.
 *
 * @param params - Parameters for token info query.
 * @param params.tokenId - The TokenId of the token.
 * @returns A promise that resolves with the TokenInfo object.
 */
export async function getTestTokenInfo ({ tokenId }: GetTestTokenInfoParams) {
  const tx = new TokenInfoQuery()
    .setTokenId(tokenId)

  const tokenInfo = await tx.execute(client)
  // console.log({tokenInfo})
  return tokenInfo
}

/**
 * Parameters for minting new test tokens.
 */
interface MintTestTokenParams {
  /** The TokenId of the token to mint. */
  tokenId: TokenId
  /** The amount of tokens to mint. */
  amount: number
}

/**
 * Mints a specified amount of a test token.
 *
 * @param params - Parameters for minting tokens.
 * @param params.tokenId - The TokenId of the token.
 * @param params.amount - The amount of tokens to mint.
 * @returns A promise that resolves to true if the minting transaction is successful.
 */
export async function mintTestToken ({ tokenId, amount }: MintTestTokenParams) {
  const tx = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setAmount(amount)
    .freezeWith(client)

  const signTx = await tx.sign(TREASURY_PRIVATE_KEY)
  const txResponse = await signTx.execute(client)
  const receipt = await txResponse.getReceipt(client)

  assert.equal(receipt.status.toString(), SDK_RESPONSES.SUCCESS)

  return true
}
