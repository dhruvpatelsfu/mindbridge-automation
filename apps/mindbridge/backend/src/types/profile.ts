export type SubscriptionTier = 'free' | 'pro'

export const SUBSCRIPTION_TIERS = ['free', 'pro'] as const satisfies ReadonlyArray<SubscriptionTier>

export interface ProfileRow {
  user_id: string
  date_of_birth: string | null
  region: string | null
  subscription_tier: SubscriptionTier | null
  updated_at: string
}

export interface Profile {
  userId: string
  name: string
  email: string
  dateOfBirth: string | null
  region: string | null
  subscriptionTier: SubscriptionTier | null
  updatedAt: string
}
