import mongoose from "mongoose";
import video from "../Modals/video.js";
import view from "../Modals/view.js";
import like from "../Modals/like.js";
import comment from "../Modals/comment.js";
import subscription from "../Modals/subscription.js";

// Creator Studio: analytics for the signed-in user's own channel.

const RANGES = [7, 28, 90];
const DAY = 24 * 60 * 60 * 1000;

function validTimeZone(tz) {
  if (typeof tz !== "string" || !tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

// "YYYY-MM-DD" for a date as seen in `timeZone` (en-CA formats it that way).
const dayKey = (date, timeZone) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

/** Count documents per day; days without any come back as 0. */
async function dailyCounts(model, match, days, timeZone) {
  const since = new Date(Date.now() - days * DAY);
  const rows = await model.aggregate([
    { $match: { ...match, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: timeZone } },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDay = new Map(rows.map((r) => [r._id, r.count]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(Date.now() - i * DAY), timeZone);
    out.push({ date: key, value: byDay.get(key) || 0 });
  }
  return out;
}

const sum = (series) => series.reduce((n, d) => n + d.value, 0);

/** Count in the previous period of the same length, for "% vs previous". */
const previousCount = (model, match, days) =>
  model.countDocuments({
    ...match,
    createdAt: { $gte: new Date(Date.now() - 2 * days * DAY), $lt: new Date(Date.now() - days * DAY) },
  });

// GET /studio/overview?days=28&tz=Asia/Kolkata
export const getoverview = async (req, res) => {
  const days = RANGES.includes(Number(req.query.days)) ? Number(req.query.days) : 28;
  const timeZone = validTimeZone(req.query.tz);
  const channelId = req.userId;
  try {
    const myVideos = await video
      .find({ uploader: channelId })
      .select("videotitle views Like Dislike thumbnail thumbnailTime filepath createdAt");
    const ids = myVideos.map((v) => v._id);

    const viewMatch = { channel: channelId };
    const subMatch = { channel: new mongoose.Types.ObjectId(channelId) };
    const likeMatch = { videoid: { $in: ids }, type: { $ne: "dislike" } };

    const [views, subscribers, likes, prevViews, prevSubs, prevLikes, totalSubs, totalComments, top] =
      await Promise.all([
        dailyCounts(view, viewMatch, days, timeZone),
        dailyCounts(subscription, subMatch, days, timeZone),
        dailyCounts(like, likeMatch, days, timeZone),
        previousCount(view, viewMatch, days),
        previousCount(subscription, subMatch, days),
        previousCount(like, likeMatch, days),
        subscription.countDocuments(subMatch),
        comment.countDocuments({ videoid: { $in: ids } }),
        view.aggregate([
          { $match: { ...viewMatch, createdAt: { $gte: new Date(Date.now() - days * DAY) } } },
          { $group: { _id: "$video", views: { $sum: 1 } } },
          { $sort: { views: -1 } },
          { $limit: 5 },
        ]),
      ]);

    const byId = new Map(myVideos.map((v) => [String(v._id), v]));
    const topVideos = top
      .map((t) => ({ video: byId.get(String(t._id)), periodViews: t.views }))
      .filter((t) => t.video);

    return res.status(200).json({
      days,
      timeZone,
      totals: {
        videos: myVideos.length,
        views: myVideos.reduce((n, v) => n + (v.views || 0), 0),
        likes: myVideos.reduce((n, v) => n + (v.Like || 0), 0),
        dislikes: myVideos.reduce((n, v) => n + (v.Dislike || 0), 0),
        comments: totalComments,
        subscribers: totalSubs,
      },
      period: {
        views: { value: sum(views), previous: prevViews },
        subscribers: { value: sum(subscribers), previous: prevSubs },
        likes: { value: sum(likes), previous: prevLikes },
      },
      series: { views, subscribers, likes },
      topVideos,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// GET /studio/videos — the channel's videos with per-video stats.
export const getstudiovideos = async (req, res) => {
  try {
    const myVideos = await video.find({ uploader: req.userId }).sort({ createdAt: -1 }).lean();
    const counts = await comment.aggregate([
      { $match: { videoid: { $in: myVideos.map((v) => v._id) } } },
      { $group: { _id: "$videoid", count: { $sum: 1 } } },
    ]);
    const commentsBy = new Map(counts.map((c) => [String(c._id), c.count]));
    return res
      .status(200)
      .json(myVideos.map((v) => ({ ...v, comments: commentsBy.get(String(v._id)) || 0 })));
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
