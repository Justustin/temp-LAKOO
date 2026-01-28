/**
 * Feed Fanout Job
 * 
 * Handles fan-out of new posts to followers' feeds.
 * Triggered by: post.created event from content-service
 */

import { feedRepository } from '../repositories/feed.repository';

export interface PostCreatedEvent {
  postId: string;
  userId: string;
  publishedAt: string;
}

/**
 * Handle post.created event
 * Fan out post to all followers' feeds
 */
export async function handlePostCreated(event: PostCreatedEvent): Promise<void> {
  const { postId, userId, publishedAt } = event;

  console.log(`[FeedFanout] Fanning out post ${postId} from user ${userId}`);

  try {
    const count = await feedRepository.fanOutToFollowers(
      userId,
      postId,
      new Date(publishedAt)
    );

    console.log(`[FeedFanout] Successfully fanned out to ${count} followers`);
  } catch (error) {
    console.error(`[FeedFanout] Error fanning out post ${postId}:`, error);
    throw error;
  }
}

/**
 * Handle post.deleted event
 * Remove deleted post from all feeds
 */
export interface PostDeletedEvent {
  postId: string;
}

export async function handlePostDeleted(event: PostDeletedEvent): Promise<void> {
  const { postId } = event;

  console.log(`[FeedFanout] Removing post ${postId} from all feeds`);

  try {
    await feedRepository.removeFromAllFeeds(postId);
    console.log(`[FeedFanout] Successfully removed post ${postId} from all feeds`);
  } catch (error) {
    console.error(`[FeedFanout] Error removing post ${postId}:`, error);
    throw error;
  }
}
