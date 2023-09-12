import { ChatMessage, UserNotice } from '@twurple/chat'

import type { TwitchMessage, TwitchMessageType } from '../types'
import useTransformText from './useTransformText'
import useTransformUser from './useTransformUser'
import useRewards from './useRewards'

/**
 * Hook that returns the function {@link transformMessage}
 */
export default function useTransformMessage() {
  const { getReward } = useRewards()
  const { transformText } = useTransformText()
  const { transformUser } = useTransformUser()

  /**
   * Transforms {@link ChatMessage}/{@link UserNotice} from Twurple into
   * {@link TwitchMessage}
   *
   * Returns `undefined` if {@link UserNotice} doesn't contain a message
   * {@link ChatMessage} always contains a message
   */
  async function transformMessage(
    typeData: TwitchMessageType,
    twurpleMessage: ChatMessage | UserNotice,
    text?: string,
  ): Promise<TwitchMessage | undefined> {
    if (import.meta.env.DEV && import.meta.env.MODE === 'debug') {
      console.log(
        `%cMessage ${twurpleMessage.id}`,
        'background-color: black; color: white; padding: 5px 10px; border-radius: 10px 10px 0 0; display: inline-block; margin-top: 10px; border: 1px solid gray;',
      )

      console.log('Twurple Message Data', twurpleMessage)
    }

    // UserNotices don't always have user messages
    if (twurpleMessage instanceof UserNotice) {
      text = twurpleMessage.text
    }
    if (!text) return

    const { type } = typeData

    const twitchMessage: TwitchMessage = {
      id: twurpleMessage.id,

      first: twurpleMessage.tags.get('first-msg') === '1',
      date: twurpleMessage.date,

      text,
      parts: transformText(text, twurpleMessage.emoteOffsets, type === 'cheer'),

      user: await transformUser(twurpleMessage.userInfo),

      tags: twurpleMessage.tags,
      ...typeData,
    }

    if (type !== 'basic') {
      // non-basic types never overlap, so further transforms aren't necessary
      return twitchMessage
    }

    // highlighted message
    if (twurpleMessage.tags.get('msg-id') === 'highlighted-message') {
      return { ...twitchMessage, type: 'highlight' }
    }

    // channel point redemption message
    const rewardId = twurpleMessage.tags.get('custom-reward-id')
    if (rewardId) {
      const reward = getReward(rewardId)
      if (reward) {
        const redeem = {
          id: reward.id,
          name: reward.title,
          cost: reward.cost,
          image: reward.getImageUrl(4),
          color: reward.backgroundColor,
        }

        return { ...twitchMessage, type: 'redeem', redeem }
      }
    }

    // reply message
    const getReplyData = (tagPart: string) =>
      twurpleMessage.tags.get(`reply-parent-${tagPart}`) || ''
    const replyId = getReplyData('msg-id')
    if (replyId) {
      const reply = {
        id: replyId,
        text: getReplyData('msg-body'),
        user: {
          id: getReplyData('user-id'),
          userName: getReplyData('user-login'),
          displayName: getReplyData('display-name'),
        },
      }

      return { ...twitchMessage, type: 'reply', reply }
    }

    // basic message
    return twitchMessage
  }

  return { transformMessage }
}
