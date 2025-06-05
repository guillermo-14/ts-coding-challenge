import { KeyList, PrivateKey, TopicCreateTransaction, TopicInfoQuery } from '@hashgraph/sdk'
import { client } from '@/step_definitions/create-simple-topic'
import assert from 'node:assert'
import { SDK_RESPONSES } from '@/utils/constants'

/**
 * Creates a new topic on the Hedera network.
 * @param {object} params - The parameters for creating the topic.
 * @param {string} params.memo - The memo for the topic.
 * @param {PrivateKey | KeyList} params.submitKey - The key used to sign transactions for this topic.
 * @returns {Promise<string | undefined>} A promise that resolves to the ID of the created topic, or undefined if creation fails.
 */
export async function createTopic ({ memo, submitKey }: { memo: string, submitKey: PrivateKey | KeyList }) {
  const tx = new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setSubmitKey(submitKey)

  const txCreateTopicResponse = await tx.execute(client)
  const receiptCreateTopicTx = await txCreateTopicResponse.getReceipt(client)
  assert.equal(receiptCreateTopicTx.status.toString(), SDK_RESPONSES.SUCCESS)

  const topicId = receiptCreateTopicTx.topicId?.toString()
  return topicId
}

/**
 * Retrieves information about a topic from the Hedera network.
 * @param {object} params - The parameters for fetching topic information.
 * @param {string} params.topicId - The ID of the topic to retrieve information for.
 * @returns {Promise<{topicMemo: string, submitKey: KeyList | PrivateKey | null}>} A promise that resolves to an object containing the topic's memo and submit key.
 */
export async function getTopicInfo ({ topicId }: { topicId: string }) {
  const topicInfoQuery = new TopicInfoQuery()
    .setTopicId(topicId)
  const { topicMemo, submitKey } = await topicInfoQuery.execute(client)
  return { topicMemo, submitKey }
}
