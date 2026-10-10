import {
  Menu,
  Search,
  ArrowLeft,
  Video,
  History,
  ThumbsUp,
  Clock,
  Download,
  LogOut,
  UserCircle,
  Plus,
  ShieldCheck,
  ListVideo,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import Logo from "./Logo";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import NotificationBell from "./NotificationBell";

interface HeaderProps {
  toggleSidebar?: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const {
    user,
    logout,
    handlegooglesignin,
    otpRequired,
    otpMethod,
    mobileRequired,
    mobile,
    setMobile,
    verifyOTP,
    resendOTP,
    tempEmail,
    isSignupFlow,
    demoLogin,
  } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const router = useRouter();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigningInLoading, setIsSigningInLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keep the search box in sync with the URL, and focus it with "/".
  useEffect(() => {
    if (router.pathname === "/search" && typeof router.query.q === "string") {
      setSearchQuery(router.query.q);
    }
  }, [router.pathname, router.query.q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.isContentEditable) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      searchRef.current?.blur();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");

    if (mobileRequired) {
      if (!mobile) {
        toast.error("Mobile number is required for sign-in in your region.");
        setOtpError("Mobile number is required.");
        return;
      }
      setIsSendingOtp(true);
      const result = await resendOTP(mobile);
      setIsSendingOtp(false);
      if (typeof result === 'string') {
        setOtpError(result);
      } else if (result) {
        toast.success("OTP sent to your mobile!");
        setOtpError("");
      } else {
        setOtpError("Failed to send OTP. Please check your number.");
      }
      return;
    }

    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      await verifyOTP(otp);
      toast.success("OTP is correct!");
      setOtp("");
      setOtpError("");
    } catch (error) {
      setOtpError("Invalid OTP. Please try again.");
    }
  };

  const handleVideoCall = () => {
    const socket = getSocket();
    if (!socket?.connected) {
      toast.error("Connection not established. Please try again.");
      return;
    }

    // Generate a unique participant ID for this user
    const participantId = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    socket.emit('create-room', (response: any) => {
      if (response.roomId) {
        // Create a unique link for this participant
        const callUrl = `${window.location.origin}/call/${response.roomId}?participant=${participantId}`;
        navigator.clipboard.writeText(callUrl).then(() => {
          toast.success("Video call link copied to clipboard! Share this link with your friend.");
        }).catch(() => {
          toast.success("Video call created! Share this link with your friend.");
        });
        router.push(`/call/${response.roomId}?participant=${participantId}`);
      } else {
        toast.error("Failed to create room. Please try again.");
      }
    });
  };

  const menuItem = "gap-3 rounded-lg px-2.5 py-2 cursor-pointer";

  return (
    <header className="glass sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-white/[0.06] px-3 sm:px-5">
      <div className={`items-center gap-2 ${showMobileSearch ? 'hidden md:flex' : 'flex'}`}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full lg:hidden"
          onClick={toggleSidebar}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
        <Logo />
      </div>

      {showMobileSearch && (
        <Button
          className="rounded-full md:hidden"
          variant="ghost"
          size="icon"
          onClick={() => setShowMobileSearch(false)}
          aria-label="Close search"
        >
          <ArrowLeft className="size-5" />
        </Button>
      )}

      <form
        onSubmit={handleSearch}
        className={`${showMobileSearch ? 'flex' : 'hidden md:flex'} mx-auto max-w-xl flex-1`}
        role="search"
      >
        <div className="group relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
          <Input
            ref={searchRef}
            type="search"
            placeholder="Search videos and channels"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus={showMobileSearch}
            className="h-11 rounded-full border-white/10 bg-white/[0.04] pl-11 pr-12 text-sm placeholder:text-muted-foreground/80 transition-all hover:border-white/15 focus-visible:border-brand/50 focus-visible:bg-white/[0.06] focus-visible:ring-4 focus-visible:ring-brand/15"
          />
          <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground md:block">
            /
          </kbd>
        </div>
      </form>

      <div className={`items-center gap-1.5 ${showMobileSearch ? 'hidden md:flex' : 'flex'}`}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full md:hidden"
          onClick={() => setShowMobileSearch(true)}
          aria-label="Search"
        >
          <Search className="size-5" />
        </Button>
        {user ? (
          <>
            <Button
              variant="ghost"
              onClick={handleVideoCall}
              className="h-10 gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 hover:bg-white/[0.08] sm:px-4"
              title="Start a video call"
            >
              <Video className="size-[18px]" />
              <span className="hidden text-sm sm:inline">Call</span>
            </Button>
            <NotificationBell userId={user._id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-1 rounded-full p-0.5 ring-2 ring-transparent transition-all hover:ring-white/15 focus-visible:outline-none focus-visible:ring-brand/60"
                  aria-label="Account menu"
                >
                  <Avatar className="size-9">
                    <AvatarImage src={user.image} />
                    <AvatarFallback className="bg-gradient-brand font-semibold text-white">
                      {user.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 rounded-2xl border-white/10 bg-popover/95 p-1.5 backdrop-blur-xl"
                align="end"
                sideOffset={8}
                forceMount
              >
                <DropdownMenuLabel className="flex items-center gap-3 px-2.5 py-2.5">
                  <Avatar className="size-10">
                    <AvatarImage src={user.image} />
                    <AvatarFallback className="bg-gradient-brand font-semibold text-white">
                      {user.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {user.name}
                    </p>
                    <p className="truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                {user?.channelname ? (
                  <DropdownMenuItem asChild className={menuItem}>
                    <Link href={`/channel/${user?._id}`}>
                      <UserCircle className="size-4" /> Your channel
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className={menuItem} onClick={() => setisdialogeopen(true)}>
                    <Plus className="size-4" /> Create channel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild className={menuItem}>
                  <Link href="/history"><History className="size-4" /> History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className={menuItem}>
                  <Link href="/liked"><ThumbsUp className="size-4" /> Liked videos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className={menuItem}>
                  <Link href="/watch-later"><Clock className="size-4" /> Watch later</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className={menuItem}>
                  <Link href="/playlists"><ListVideo className="size-4" /> Playlists</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className={menuItem}>
                  <Link href="/downloads"><Download className="size-4" /> Downloads</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem
                  onClick={logout}
                  className={`${menuItem} text-red-400 focus:bg-red-500/10 focus:text-red-300`}
                >
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
          <Button
            variant="ghost"
            onClick={() => demoLogin()}
            className="hidden h-10 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium hover:bg-white/[0.08] sm:inline-flex"
            title="Explore with a shared demo account, no sign-up needed"
          >
            Try demo
          </Button>
          <Button
            className="h-10 gap-2 rounded-full bg-white px-5 font-semibold text-black shadow-lg shadow-white/5 hover:bg-white/90"
            disabled={isSigningInLoading}
            onClick={async () => {
              setIsSigningInLoading(true);
              try {
                await handlegooglesignin();
              } finally {
                setIsSigningInLoading(false);
              }
            }}
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            {isSigningInLoading ? "Signing in…" : "Sign in"}
          </Button>
          </>
        )}
      </div>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />

      {/* OTP Verification Dialog */}
      {otpRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="animate-fade-up w-full max-w-md rounded-3xl border border-white/10 bg-surface p-7 shadow-2xl shadow-black/50">
            <div className="bg-gradient-brand mb-5 flex size-12 items-center justify-center rounded-2xl shadow-lg shadow-brand/30">
              <ShieldCheck className="size-6 text-white" />
            </div>
            <h2 className="mb-2 text-xl font-semibold tracking-tight">
              {isSignupFlow ? "Create your account" : (mobileRequired ? "Mobile verification" : "Verify your identity")}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              {isSignupFlow
                ? `Welcome! We've sent a 6-digit code to your email (${tempEmail}) to verify your account.`
                : (mobileRequired
                  ? "Your regional security policy requires a mobile number for verification."
                  : `Identity verified. We've sent a code to your ${otpMethod === 'email' ? `email (${tempEmail})` : `mobile (${mobile})`}.`
                )
              }
            </p>
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              {otpMethod === 'sms' && (mobileRequired || !mobile) && (
                <div className="space-y-1.5">
                  <label className="ml-1 text-xs font-medium text-muted-foreground">Mobile number</label>
                  <Input
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/[0.04]"
                  />
                </div>
              )}

              {!mobileRequired && (
                <div className="space-y-1.5">
                  <label className="ml-1 text-xs font-medium text-muted-foreground">6-digit code</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-14 rounded-xl border-white/10 bg-white/[0.04] text-center font-mono text-2xl tracking-[0.5em]"
                    maxLength={6}
                  />
                </div>
              )}

              {otpError && (
                <p className="ml-1 text-xs text-red-400">{otpError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSendingOtp}
                  className="bg-gradient-brand h-11 flex-1 rounded-full font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95"
                >
                  {mobileRequired ? (isSendingOtp ? "Sending…" : "Send SMS code") : "Verify"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-full px-5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  onClick={() => {
                    // This would ideally close the dialog and reset states
                    window.location.reload();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container"></div>
    </header>
  );
};

export default Header;
