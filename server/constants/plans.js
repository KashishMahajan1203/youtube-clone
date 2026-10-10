/**
 * PLAN CONFIGURATION
 * ------------------
 * Central source of truth for:
 * 1. Plan pricing (used by payment flow)
 * 2. Watch-time limits (used by video access control)
 */

export const PLANS = {
  FREE: "FREE",
  BRONZE: "BRONZE",
  SILVER: "SILVER",
  GOLD: "GOLD",
};

/**
 * Pricing in INR (monthly)
 * Used by Razorpay order creation
 */
export const PLAN_PRICING = {
  [PLANS.BRONZE]: 10,
  [PLANS.SILVER]: 50,
  [PLANS.GOLD]: 100,
};

/**
 * Watch-time rules in seconds
 * Used by backend middleware to enforce limits
 * Everyone gets 5 minutes free, premium plans get additional time
 */
export const PLAN_RULES = {
  [PLANS.FREE]: {
    maxWatchTime: 5 * 60, // 5 minutes
  },
  [PLANS.BRONZE]: {
    maxWatchTime: 14 * 60, // 14 minutes (5 free + 9 premium)
  },
  [PLANS.SILVER]: {
    maxWatchTime: 10 * 60, // 10 minutes
  },
  [PLANS.GOLD]: {
    maxWatchTime: Infinity, // unlimited
  },
};
