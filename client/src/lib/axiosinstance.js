import axios from "axios";
import { getToken, SESSION_EXPIRED } from "./session";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001",
  withCredentials: true,
});

// Attach the session token to every request.
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 with AUTH_REQUIRED while we think we're signed in means the session
// expired or was revoked: tell the app to sign out.
axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      error?.response?.status === 401 &&
      error.response.data?.code === "AUTH_REQUIRED" &&
      getToken() &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event(SESSION_EXPIRED));
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
