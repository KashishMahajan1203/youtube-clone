// Imported first by helpers.js so tests never use a developer's real
// server/.env services. dotenv doesn't overwrite variables that already
// exist, so setting them to "" keeps them disabled even after a module
// calls dotenv.config().
for (const key of [
  "CLOUDINARY_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "TWILIO_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "DB_URL",
]) {
  process.env[key] = "";
}
process.env.NODE_ENV = "test";
