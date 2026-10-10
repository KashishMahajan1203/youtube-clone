import watchsession from "../Modals/watchsession.js";
import users from "../Modals/Auth.js";
import { PLAN_RULES } from "../constants/plans.js";

export const checkWatchTimeLimit = async (req, res, next) => {
  const { videoId } = req.params;
  const userId = req.userId; // from the verified session token

  try {
    // Get user plan
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if plan is active
    const currentDate = new Date();
    if (user.plan !== "FREE" && user.planExpiry && user.planExpiry < currentDate) {
      return res.status(403).json({ message: "Plan expired. Please renew your subscription." });
    }

    // Get plan limits
    const planLimits = PLAN_RULES[user.plan];
    if (!planLimits) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    // For unlimited plans, allow access
    if (planLimits.maxWatchTime === Infinity) {
      return next();
    }

    // Get current watch time for this user-video combination
    const session = await watchsession.findOne({ userId, videoId });
    const currentWatchTime = session ? session.watchTime : 0;

    // Check if limit exceeded
    if (currentWatchTime >= planLimits.maxWatchTime) {
      return res.status(403).json({
        message: "Watch time limit exceeded for your plan",
        limit: planLimits.maxWatchTime,
        watched: currentWatchTime,
        remaining: 0
      });
    }

    // Allow access
    next();
  } catch (error) {
    console.error("Watch time check error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
