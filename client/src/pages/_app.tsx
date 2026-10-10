import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
import { UserProvider } from "../lib/AuthContext";
import { useState } from "react";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export default function App({ Component, pageProps }: AppProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <ThemeProvider attribute="class" forcedTheme="dark">
      <UserProvider>
        <Head>
          <title>YourTube — Video streaming platform</title>
          <meta
            name="description"
            content="A full-stack video streaming platform with real-time notifications, playlists, comment translation and WebRTC video calls."
          />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#0a0a0d" />
        </Head>
        <div
          className={`${geistSans.variable} ${geistMono.variable} relative min-h-screen bg-background font-sans text-foreground`}
        >
          {/* Ambient brand glow behind the top of the page */}
          <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,61,90,0.10),transparent_70%)]" />
          <Header toggleSidebar={toggleSidebar} />
          <Toaster />
          <div className="relative flex">
            <Sidebar
              isOpen={isSidebarOpen}
              closeSidebar={() => setIsSidebarOpen(false)}
            />
            <div className="min-w-0 flex-1">
              <Component {...pageProps} />
            </div>
          </div>
        </div>
      </UserProvider>
    </ThemeProvider>
  );
}
