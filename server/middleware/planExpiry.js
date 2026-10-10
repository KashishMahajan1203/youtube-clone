import users from "../Modals/Auth.js";

export const checkPlanExpiry = async (req, res, next) => {
  const userId = req.userId; // from the verified session token
  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentDate = new Date();
    if (user.plan !== "FREE" && user.planExpiry && user.planExpiry > currentDate) {
      // Plan is active
      next();
    } else if (user.plan === "FREE") {
      // Free plan, allow limited access
      next();
    } else {
      // Plan expired
      return res.status(403).json({ message: "Plan expired. Please renew your subscription." });
    }
  } catch (error) {
    console.error("Plan expiry check error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
