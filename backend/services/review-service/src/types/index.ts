// =============================================================================
// Review Types
// =============================================================================

export interface CreateReviewDTO {
  productId: string;
  variantId?: string;
  orderId?: string;
  orderItemId?: string;
  sellerId?: string;
  brandId?: string;
  productName: string;
  variantName?: string;
  productImageUrl?: string;
  reviewerName: string;
  reviewerImageUrl?: string;
  rating: number;
  title?: string;
  reviewText?: string;
  qualityRating?: number;
  valueRating?: number;
  fitRating?: number;
  isVerified?: boolean;
  purchasedAt?: Date;
  deliveredAt?: Date;
}

export interface UpdateReviewDTO {
  rating?: number;
  title?: string;
  reviewText?: string;
  qualityRating?: number;
  valueRating?: number;
  fitRating?: number;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden' | 'removed';

export interface ReviewQuery {
  page?: number;
  limit?: number;
  rating?: number;
  hasPhotos?: boolean;
  isVerified?: boolean;
  status?: ReviewStatus;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
}

// =============================================================================
// Review Image Types
// =============================================================================

export interface AddImageDTO {
  imageUrl: string;
  thumbnailUrl?: string;
  altText?: string;
  displayOrder?: number;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

// =============================================================================
// Vote Types
// =============================================================================

export type VoteType = 'helpful' | 'unhelpful';

export interface VoteDTO {
  voteType: VoteType;
}

// =============================================================================
// Report Types
// =============================================================================

export type ReportReason =
  | 'spam'
  | 'fake_review'
  | 'inappropriate_content'
  | 'wrong_product'
  | 'offensive_language'
  | 'personal_information'
  | 'copyright'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export interface ReportDTO {
  reason: ReportReason;
  description?: string;
}

// =============================================================================
// Reply Types
// =============================================================================

export type ResponderType = 'seller' | 'brand_manager' | 'admin';

export type ReplyStatus = 'visible' | 'hidden' | 'removed';

export interface CreateReplyDTO {
  responderType: ResponderType;
  responderName: string;
  replyText: string;
}

export interface UpdateReplyDTO {
  replyText: string;
}

// =============================================================================
// Review Request Types
// =============================================================================

export type RequestChannel = 'in_app' | 'email' | 'push' | 'sms';

export type RequestStatus = 'pending' | 'sent' | 'opened' | 'completed' | 'expired' | 'skipped';

export interface CreateReviewRequestDTO {
  userId: string;
  orderId: string;
  orderItemId?: string;
  productId: string;
  variantId?: string;
  productName: string;
  productImageUrl?: string;
  channel?: RequestChannel;
  eligibleAt: Date;
  expiresAt: Date;
}

export interface ReviewRequestQuery {
  page?: number;
  limit?: number;
  status?: RequestStatus;
}

// =============================================================================
// Moderation Types
// =============================================================================

export type ModerationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type QueueStatus = 'pending' | 'in_progress' | 'completed';

export type ModerationDecision = 'approved' | 'rejected' | 'needs_edit' | 'escalated';

export interface ModerationQuery {
  page?: number;
  limit?: number;
  status?: QueueStatus;
  priority?: ModerationPriority;
}

export interface ModerationDecisionDTO {
  decision: ModerationDecision;
  notes?: string;
  rejectionReason?: string;
}

// =============================================================================
// Summary Types
// =============================================================================

export interface ReviewSummary {
  productId: string;
  totalReviews: number;
  totalWithPhotos: number;
  totalVerified: number;
  avgRating: number | null;
  rating5Count: number;
  rating4Count: number;
  rating3Count: number;
  rating2Count: number;
  rating1Count: number;
  avgQualityRating: number | null;
  avgValueRating: number | null;
  avgFitRating: number | null;
  topKeywords: string[];
  lastReviewAt: Date | null;
}

// =============================================================================
// Pagination
// =============================================================================

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
