// Keep in sync with server/constants/categories.js
export const CATEGORIES = [
  "Music",
  "Gaming",
  "Education",
  "Technology",
  "Entertainment",
  "Comedy",
  "Sports",
  "News",
  "Travel",
  "Food",
  "Lifestyle",
  "Science",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
