import { prisma } from '../lib/prisma';
import { UserInterest, InterestType, InteractionType } from '../generated/prisma';
import { contentClient } from '../clients/content.client';

export class InterestService {
  /**
   * Record user interaction and update interests
   */
  async recordInteraction(
    userId: string,
    contentType: string,
    contentId: string,
    interactionType: InteractionType,
    metadata?: any
  ): Promise<void> {
    // 1. Log the interaction
    await prisma.userInteraction.create({
      data: {
        userId,
        contentType,
        contentId,
        interactionType,
        durationSec: metadata?.durationSec,
        source: metadata?.source,
        metadata
      }
    });

    // 2. Update interests based on interaction
    await this.updateInterestsFromInteraction(userId, contentType, contentId, interactionType);
  }

  /**
   * Update user interests based on interaction
   */
  async updateInterestsFromInteraction(
    userId: string,
    contentType: string,
    contentId: string,
    interactionType: InteractionType
  ): Promise<void> {
    // Weight different interaction types
    const weights: Record<string, number> = {
      view: 0.1,
      dwell: 0.2,
      like: 0.5,
      comment: 0.7,
      save: 0.8,
      share: 0.9,
      click_product: 0.6,
      purchase: 1.0,
      follow: 0.7
    };

    const weight = weights[interactionType] || 0.1;

    if (contentType === 'post') {
      // Get post details to extract interests
      const post = await contentClient.getPost(contentId);
      if (!post) return;

      // Update category interest
      if (post.categoryId) {
        await this.updateInterest(userId, 'category', post.categoryId, weight);
      }

      // Update hashtag interests
      for (const hashtag of post.hashtags || []) {
        await this.updateInterest(userId, 'hashtag', hashtag, weight * 0.5);
      }

      // Update seller interest (if post has product tags)
      for (const tag of post.productTags || []) {
        if (tag.sellerId) {
          await this.updateInterest(userId, 'seller', tag.sellerId, weight * 0.3);
        }
      }
    }
  }

  /**
   * Update or create interest record
   */
  async updateInterest(
    userId: string,
    interestType: InterestType,
    interestValue: string,
    scoreIncrement: number
  ): Promise<void> {
    await prisma.userInterest.upsert({
      where: {
        userId_interestType_interestValue: {
          userId,
          interestType,
          interestValue
        }
      },
      create: {
        userId,
        interestType,
        interestValue,
        score: scoreIncrement,
        interactionCount: 1,
        lastInteractionAt: new Date()
      },
      update: {
        score: { increment: scoreIncrement },
        interactionCount: { increment: 1 },
        lastInteractionAt: new Date()
      }
    });
  }

  /**
   * Get user's top interests
   */
  async getUserInterests(userId: string, limit: number = 20): Promise<UserInterest[]> {
    return prisma.userInterest.findMany({
      where: { userId },
      orderBy: { score: 'desc' },
      take: limit
    });
  }

  /**
   * Get interests by type
   */
  async getInterestsByType(
    userId: string,
    interestType: InterestType,
    limit: number = 10
  ): Promise<UserInterest[]> {
    return prisma.userInterest.findMany({
      where: {
        userId,
        interestType
      },
      orderBy: { score: 'desc' },
      take: limit
    });
  }

  /**
   * Decay all interest scores (run periodically)
   * Older interests become less relevant
   */
  async decayInterests(decayFactor: number = 0.9): Promise<void> {
    // Decay interests not updated in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await prisma.$executeRaw`
      UPDATE user_interest
      SET score = score * ${decayFactor}
      WHERE last_interaction_at < ${sevenDaysAgo}
        AND score > 0.01
    `;

    // Delete very low scores
    await prisma.userInterest.deleteMany({
      where: {
        score: { lt: 0.01 }
      }
    });
  }

  /**
   * Get user interest summary
   */
  async getInterestSummary(userId: string): Promise<{
    categories: UserInterest[];
    hashtags: UserInterest[];
    sellers: UserInterest[];
  }> {
    const [categories, hashtags, sellers] = await Promise.all([
      this.getInterestsByType(userId, 'category', 5),
      this.getInterestsByType(userId, 'hashtag', 10),
      this.getInterestsByType(userId, 'seller', 5)
    ]);

    return { categories, hashtags, sellers };
  }
}

// Singleton instance
export const interestService = new InterestService();
