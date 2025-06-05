import { AccountId, PrivateKey, TokenSupplyType, TokenType } from '@hashgraph/sdk'
import { accounts } from '@/src/config'

export const MAX_SUPPLY_REACHED_ERROR = 'TOKEN_MAX_SUPPLY_REACHED'

export const TIMEOUT = 20000

export const SDK_RESPONSES = {
  SUCCESS: 'SUCCESS',
  MAX_SUPPLY_REACHED_ERROR: 'TOKEN_MAX_SUPPLY_REACHED',
  TOKEN_ALREADY_ASSOCIATED_ERROR: 'TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT'
}
export const TEST_TOKEN_CONFIG = {
  TYPE: TokenType.FungibleCommon,
  NAME: 'Test Token',
  SYMBOL: 'HTT',
  DECIMALS: 2,
  TREASURY_ACCOUNT_ID: AccountId.fromString(accounts[0].id),
  TREASURY_PRIVATE_KEY: PrivateKey.fromStringED25519(accounts[0].privateKey),
  SUPPLY_TYPE: TokenSupplyType.Finite,
  MAX_SUPPLY: 1000,
  INITIAL_SUPPLY: 1000
}
