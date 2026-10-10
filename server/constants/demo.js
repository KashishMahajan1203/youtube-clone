// Shared by the demo-login endpoint and the seed script.
export const DEMO_EMAIL_DOMAIN = "demo.yourtube.dev";
export const DEMO_USER_EMAIL = `demo@${DEMO_EMAIL_DOMAIN}`;

export const DEMO_USER = {
  email: DEMO_USER_EMAIL,
  name: "Demo Viewer",
  channelname: "Demo Channel",
  description: "A shared demo account for trying YourTube. Feel free to look around!",
  image: "",
};

// Demo login is on unless explicitly disabled.
export const isDemoLoginEnabled = () => process.env.ENABLE_DEMO_LOGIN !== "false";
