// Currently some icons are made by svg, will be replaced later with actual icons
// Facevook login is broken
// This file is massive and might break

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const KEYFRAMES = `
  @keyframes loginFadeUp {
    from { opacity: 0; transform: translateY(30px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes stepIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .login-page-wrap    { animation: loginFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
  .step-content-anim  { animation: stepIn 0.26s cubic-bezier(0.16,1,0.3,1) both; }
`;

// Press animation helpers

const bp = {
  onMouseDown:  e => { e.currentTarget.style.transform = "scale(0.96)"; },
  onMouseUp:    e => { e.currentTarget.style.transform = "scale(1)";    },
  onTouchStart: e => { e.currentTarget.style.transform = "scale(0.96)"; },
  onTouchEnd:   e => { e.currentTarget.style.transform = "scale(1)";    },
};

// Base primitives

function Field({ type = "text", placeholder, value, onChange, onKeyDown, autoComplete = "off" }) {
  return (
    <input
      className="block w-full px-[18px] py-[14px] rounded-2xl border border-transparent bg-white text-[15px] text-[#111] outline-none box-border font-[inherit] transition-colors duration-[180ms] ease-in focus:border-violet-400/30 placeholder:text-[#bbb]"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      autoComplete={autoComplete}
      autoCapitalize="none"
      spellCheck={false}
    />
  );
}

function PBtn({ children, onClick, disabled, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...bp}
      className={`w-full py-[15px] rounded-2xl border-none bg-violet-600 text-white text-[15px] font-bold font-[inherit] transition-[transform,opacity] duration-150 ${disabled ? "opacity-50 cursor-default" : "cursor-pointer"} ${className}`}
    >
      {children}
    </button>
  );
}

function GBtn({ children, onClick, disabled, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...bp}
      className={`w-full py-[15px] rounded-2xl border-none bg-white text-[#111] text-[15px] font-bold font-[inherit] transition-[transform,opacity] duration-150 ${disabled ? "opacity-50 cursor-default" : "cursor-pointer"} ${className}`}
    >
      {children}
    </button>
  );
}

function Err({ msg }) {
  if (!msg) return null;
  return (
    <p className="text-center text-red-500 text-[13.5px] font-semibold m-0">
      {msg}
    </p>
  );
}

function PencilIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

// Social brand icons

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return <img src="src/assets/OAuth_Icons/facebook.png" width="18" height="18" />;
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.264 5.633 5.9-5.633zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function DiscordIcon() {
  return <img src="src/assets/OAuth_Icons/discord.png" width="20" height="20" />;
}

// Social login UI

function SocialDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-black/10" />
      <span className="text-[12px] text-[#bbb] font-semibold tracking-wide select-none">or continue with</span>
      <div className="flex-1 h-px bg-black/10" />
    </div>
  );
}

const SOCIAL_PROVIDERS = [
  { id: "google",   label: "Google",   Icon: GoogleIcon,   bg: "bg-white",      text: "text-[#111]", border: "border border-gray-200",    shadow: "shadow-sm shadow-gray-200/80" },
  { id: "facebook", label: "Facebook", Icon: FacebookIcon, bg: "bg-[#0080ff]",  text: "text-white",  border: "border border-[#1a8fff]",   shadow: "shadow-sm shadow-[#0080ff]/40", disabled: true },
  { id: "x",        label: "X",        Icon: XIcon,        bg: "bg-[#0f0f0f]",  text: "text-white",  border: "border border-[#2a2a2a]",   shadow: "shadow-sm shadow-black/30" },
  { id: "discord",  label: "Discord",  Icon: DiscordIcon,  bg: "bg-[#5865F2]",  text: "text-white",  border: "border border-[#6e7af4]",   shadow: "shadow-sm shadow-[#5865F2]/40" },
];

function SocialLoginButtons({ onSocial }) {
  return (
    <div className="flex gap-2">
      {SOCIAL_PROVIDERS.map(({ id, label, Icon, bg, text, border, shadow }) => {
        const isDisabled = id === "facebook"; // FACEBOOK DOESNT WORK AT THE MOMENT
        return (
          <button
            disabled={isDisabled}
            key={id}
            onClick={() => onSocial(id)}
            {...bp}
            title={isDisabled ? `${label} login is temporarily unavailable` : `Continue with ${label}`}
            className={`flex-1 py-[13px] rounded-2xl ${bg} ${text} ${border} ${shadow} flex items-center justify-center transition-[transform,opacity] duration-150
              ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}

// Step components

function LoginStep({
  identifier, setIdentifier,
  loginPw, setLoginPw,
  error, loading,
  onLogin, onForgot, onRegister, onSocial,
}) {
  return (
    <div className="px-6 pt-11 pb-7 flex flex-col gap-3">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-[9px] mb-2">
          <img src="src/assets/Tasker_logo.svg" alt="Tasker logo" />
          <span className="xl tracking-tight">Tasker</span>
        </div>
        <p className="text-gray-400 text-[13.5px] m-0">Stay on track, together.</p>
      </div>

      <Field
        placeholder="Enter @handle or email"
        value={identifier}
        onChange={e => setIdentifier(e.target.value.replace(/\s/g, ""))}
        autoComplete="username"
        onKeyDown={e => e.key === "Enter" && onLogin()}
      />
      <Field
        type="password"
        placeholder="Password"
        value={loginPw}
        onChange={e => setLoginPw(e.target.value)}
        autoComplete="current-password"
        onKeyDown={e => e.key === "Enter" && onLogin()}
      />

      <button
        onClick={onForgot}
        className="bg-transparent border-none text-violet-600 text-[13.5px] font-semibold cursor-pointer text-center py-[2px] px-0 font-[inherit]"
      >
        Forgot your password?
      </button>

      <Err msg={error} />

      <div className="flex flex-col gap-2 mt-1">
        <GBtn onClick={onLogin} disabled={loading}>{loading ? "…" : "Log In"}</GBtn>
        <PBtn onClick={onRegister}>Create Account</PBtn>
      </div>

      <SocialDivider />
      <SocialLoginButtons onSocial={onSocial} />
    </div>
  );
}

function ForgotStep({ forgotId, setForgotId, sent, error, loading, onSubmit, onBack }) {
  return (
    <div className="px-6 pt-9 pb-7 flex flex-col gap-3.5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13.5px] text-gray-500 hover:text-gray-700 font-semibold cursor-pointer mb-1 px-0 py-1 bg-transparent border-none font-[inherit] transition-colors duration-150"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to login
      </button>

      <div>
        <h2 className="m-0 mb-1.5 text-[21px] font-extrabold text-[#1a1a2e]">Reset Password</h2>
        <p className="m-0 text-gray-400 text-[13.5px]">Enter your email or username and we'll send a reset link.</p>
      </div>

      {sent ? (
        <div className="bg-white rounded-2xl p-[18px] text-center">
          <p className="m-0 text-emerald-600 font-bold text-[14.5px]">✓ Check your inbox!</p>
          <p className="mt-1.5 mb-0 text-gray-400 text-[13px]">If that account exists, a reset link is on its way.</p>
        </div>
      ) : (
        <>
          <Field
            placeholder="Email or @username"
            value={forgotId}
            onChange={e => setForgotId(e.target.value.replace(/\s/g, ""))}
            autoComplete="email"
            onKeyDown={e => e.key === "Enter" && onSubmit()}
          />
          <Err msg={error} />
          <PBtn onClick={onSubmit} disabled={loading}>{loading ? "…" : "Send Reset Link"}</PBtn>
        </>
      )}
    </div>
  );
}

function RegisterStep({
  username, setUsername,
  displayName, setDisplayName,
  email, setEmail,
  regPw, setRegPw,
  error, loading,
  onNext, onBack, onSocial,
}) {
  return (
    <div className="px-6 pt-9 pb-7 flex flex-col gap-3">
      <h2 className="m-0 mb-2 text-[20px] text-center text-[#1a1a2e]" style={{ fontFamily: "kronaone" }}>
        Account Details
      </h2>

      <Field
        placeholder="Display Name"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        autoComplete="name"
        onKeyDown={e => e.key === "Enter" && onNext()}
      />
      <div className="flex flex-col gap-1">
        <Field
          placeholder="Handle"
          value={username}
          onChange={e => setUsername(e.target.value.replace(/\s/g, ""))}
          autoComplete="username"
          onKeyDown={e => e.key === "Enter" && onNext()}
        />
        <small className="text-[#847C96] px-1" style={{ fontFamily: "inter" }}>
          Your handle cannot be changed after it's set
        </small>
      </div>
      <Field
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
        onKeyDown={e => e.key === "Enter" && onNext()}
      />
      <Field
        type="password"
        placeholder="Password"
        value={regPw}
        onChange={e => setRegPw(e.target.value)}
        autoComplete="new-password"
        onKeyDown={e => e.key === "Enter" && onNext()}
      />

      <Err msg={error} />

      <div className="flex gap-2.5 mt-1 justify-center">
        <button onClick={onBack} {...bp} className="px-6 py-[10px] rounded-[40px] border border-gray-300 bg-white text-[#1a1a2e] text-[13px] font-bold font-[inherit] cursor-pointer transition-[transform,opacity] duration-150">Back</button>
        <button onClick={onNext} disabled={loading} {...bp} className={`px-8 py-[10px] rounded-[40px] border-none bg-[#0D0028] text-white text-[13px] font-bold font-[inherit] transition-[transform,opacity] duration-150 ${loading ? "opacity-50 cursor-default" : "cursor-pointer"}`}>
          {loading ? "…" : "Next"}
        </button>
      </div>

      <SocialDivider />
      <SocialLoginButtons onSocial={onSocial} />
    </div>
  );
}

function ProfileStep({
  profileName, setProfileName, isPrivate, setIsPrivate,
  avatarPrev, bannerPrev, avatarRef, bannerRef,
  defaultAvatarUrl, defaultBannerUrl,
  onAvatarChange, onBannerChange,
  loading, onBack, onNext, username,
}) {
  const bannerSrc = bannerPrev || defaultBannerUrl || null;
  const avatarSrc = avatarPrev || defaultAvatarUrl || null;

  return (
    <div>
      <div className="px-6 pt-6 pb-0 text-center">
        <h2 className="m-0 mb-4 text-[20px] text-[#1a1a2e]" style={{ fontFamily: "kronaone" }}>Profile</h2>
        <div className="h-px bg-black/[0.07]" />
      </div>

      <div
        className="relative h-[156px] cursor-pointer"
        style={bannerSrc
          ? { backgroundImage: `url(${bannerSrc})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: "linear-gradient(135deg, #C4B5FD, #DDD6FE, #E9D5FF)" }
        }
        onClick={() => bannerRef.current?.click()}
      >
        <div className="absolute inset-0 bg-black/[0.10]" />
        <button
          onClick={e => { e.stopPropagation(); bannerRef.current?.click(); }}
          {...bp}
          className="absolute top-3 right-3 w-[34px] h-[34px] rounded-full border-none bg-white/[0.88] cursor-pointer flex items-center justify-center text-[#555] z-[10] transition-transform duration-150"
        >
          <PencilIcon size={15} />
        </button>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={onBannerChange} />
      </div>

      <div className="flex justify-center -mt-[44px] mb-[10px] relative z-[20]">
        <div
          className="relative w-[88px] h-[88px] rounded-[20px] border-[3px] border-[rgba(244,240,255,0.97)] overflow-hidden bg-violet-200 cursor-pointer shadow-lg"
          onClick={e => { e.stopPropagation(); avatarRef.current?.click(); }}
        >
          {avatarSrc
            ? <img src={avatarSrc} className="w-full h-full object-cover" alt="avatar" />
            : <div className="w-full h-full bg-violet-300" />
          }
          <div className="absolute inset-0 bg-black/[0.28] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <span className="text-white"><PencilIcon size={20} /></span>
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
      </div>

      <div className="px-6 pt-0 pb-0 flex flex-col gap-3">
        <div className="text-center flex flex-col items-center gap-[6px]">
          <input
            className="border border-[#1a1a2e] rounded-[40px] px-[18px] py-[6px] text-[15px] font-bold text-[#1a1a2e] text-center bg-transparent outline-none font-[inherit] inline-block min-w-[120px] max-w-[80%] transition-shadow duration-[180ms] focus:shadow-[0_0_0_2px_rgba(124,58,237,0.20)]"
            value={profileName}
            onChange={e => setProfileName(e.target.value)}
            placeholder="Display name"
            maxLength={40}
          />
          <p className="m-0 text-[13px] text-[#847C96]" style={{ fontFamily: "inter" }}>@{username}</p>
          <p className="m-0 text-[12px] text-[#C4C9D4]" style={{ fontFamily: "inter" }}>Tap to edit</p>
        </div>

        <div className="bg-white rounded-2xl px-[18px] py-3.5 flex items-center justify-between">
          <span className="text-[15px] font-bold text-[#1a1a2e]" style={{ fontFamily: "inter" }}>Private Profile</span>
          <button
            onClick={() => setIsPrivate(v => !v)}
            className={`relative w-[52px] h-[28px] rounded-[14px] border-none cursor-pointer p-0 transition-colors duration-[220ms] ease-in-out ${isPrivate ? "bg-violet-600" : "bg-gray-200"}`}
          >
            <span
              className="absolute top-[4px] w-5 h-5 rounded-full bg-white transition-[left] duration-[220ms] ease-in-out block shadow-sm"
              style={{ left: isPrivate ? 28 : 4 }}
            />
          </button>
        </div>
      </div>

      <div className="px-6 pt-4 pb-7 flex gap-2 justify-center">
        {[
          { label: "Back",                           fn: onBack, dark: false, disabled: false },
          { label: loading ? "…" : "Create Account", fn: onNext, dark: true,  disabled: loading },
        ].map(({ label, fn, dark, disabled }) => (
          <button
            key={label}
            onClick={fn}
            disabled={disabled}
            {...bp}
            className={`px-6 py-[10px] rounded-[40px] border-none text-[13px] font-bold font-[inherit] transition-[transform,opacity] duration-150 ${dark ? "bg-[#0D0028] text-white" : "bg-white text-[#1a1a2e]"} ${disabled ? "opacity-50 cursor-default" : "cursor-pointer"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Main component

export default function Login() {

  // useEffect(() => {
  //   const gradient = "linear-gradient(148deg, #5B21B6 0%, #7C3AED 45%, #8B5CF6 100%)";
  //   document.body.style.background = gradient;
  //   document.getElementById("root").style.background = gradient;
  //   return () => {
  //     document.body.style.background = "";
  //     document.getElementById("root").style.background = "";
  //   };
  // }, []);

  const { user, setUser } = useUser();
  const navigate = useNavigate();

  const [step, setStep]       = useState("login");
  const [stepKey, setStepKey] = useState(0);
  const [exiting, setExiting] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [loginPw, setLoginPw]       = useState("");

  const [forgotId, setForgotId]     = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [username, setUsername]       = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]             = useState("");
  const [regPw, setRegPw]             = useState("");

  const [profileName, setProfileName] = useState("");
  const [isPrivate, setIsPrivate]     = useState(false);
  const [avatarFile, setAvatarFile]   = useState(null);
  const [bannerFile, setBannerFile]   = useState(null);
  const [avatarPrev, setAvatarPrev]   = useState(null);
  const [bannerPrev, setBannerPrev]   = useState(null);
  const [previewAvatarNum, setPreviewAvatarNum] = useState(null);

  const [pendingRegistration, setPendingRegistration] = useState(null);

  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const avatarRef = useRef(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const oauthUid  = params.get("oauth_uid");
    const oauthError = params.get("oauth_error");

    // OAuth success callback
    if (oauthUid) {
      window.history.replaceState({}, "", window.location.pathname);
      const isNew = params.get("oauth_new") === "1";

      fetch(`/api/users/${oauthUid}`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then(userData => {
          if (userData?.id) {
            setUser(userData);
            exit(isNew ? "/onboarding" : "/home");
          } else {
            setError("OAuth login failed — account not found.");
          }
        })
        .catch(err => {
          console.error("OAuth user fetch failed:", err);
          setError("Network error during login. Please try again.");
        });

      return;
    }

    // OAuth error callback
    if (oauthError) {
      window.history.replaceState({}, "", window.location.pathname);
      setError(decodeURIComponent(oauthError));
      return;
    }

    // Already logged in
    if (user) {
      navigate("/home", { replace: true });
    }
  }, []);

  // Transitions

  const go = (nextStep, prep) => {
    setError("");
    prep?.();
    setStep(nextStep);
    setStepKey(k => k + 1);
  };

  const exit = (path) => {
    setExiting(true);
    const shouldAnimate = path === "/home" || path === "/onboarding";
    setTimeout(() =>
      navigate(path, {
        state: { entering: shouldAnimate ? true : undefined },
      }),
      370
    );
  };

  // API handlers

  const doLogin = async () => {
    if (!identifier.trim() || !loginPw.trim()) return setError("Please fill in all fields.");
    setLoading(true);
    try {
      const res  = await fetch("/api/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier: identifier.trim().toLowerCase(), password: loginPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError("Wrong username/email or password."); return; }
      setUser(data.user);
      exit("/home");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async () => {
    if (!username.trim() || !email.trim() || !regPw.trim()) return setError("Please fill in all fields.");
    if (!EMAIL_RE.test(email)) return setError("Enter a valid email address.");
    if (regPw.length < 6)     return setError("Password must be at least 6 characters.");

    const randomAvatarNum = Math.floor(Math.random() * 6) + 1;
    setPreviewAvatarNum(randomAvatarNum);

    setPendingRegistration({
      username:     username.trim(),
      password:     regPw,
      display_name: displayName.trim() || username.trim(),
      email:        email.trim().toLowerCase(),
      avatar_num:   randomAvatarNum,
    });

    setProfileName(displayName.trim() || username.trim());
    setIsPrivate(false);
    go("profile");
  };

  const doForgot = async () => {
    if (!forgotId.trim()) return setError("Enter your email or username.");
    setLoading(true);
    await new Promise(r => setTimeout(r, 650));
    setLoading(false);
    setForgotSent(true);
  };

  const doProfile = async () => {
    if (!pendingRegistration) { exit("/onboarding"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          username:     pendingRegistration.username,
          password:     pendingRegistration.password,
          display_name: profileName.trim() || pendingRegistration.display_name,
          email:        pendingRegistration.email,
          is_private:   isPrivate,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed."); return; }

      const newUser = data.user;
      const uid     = newUser.id;

      let avatarUrl = null;
      let bannerUrl = null;

      if (avatarFile) {
        const form = new FormData();
        form.append("file", avatarFile);
        const r = await fetch("/api/upload", { method: "POST", headers: { "X-User-Id": uid }, body: form });
        const d = await r.json();
        if (d.url) avatarUrl = d.url;
      }

      if (bannerFile) {
        const form = new FormData();
        form.append("file", bannerFile);
        const r = await fetch("/api/upload", { method: "POST", headers: { "X-User-Id": uid }, body: form });
        const d = await r.json();
        if (d.url) bannerUrl = d.url;
      }

      if (avatarUrl || bannerUrl) {
        const updateBody = {};
        if (avatarUrl) updateBody.avatar_url = avatarUrl;
        if (bannerUrl) updateBody.banner_url  = bannerUrl;
        await fetch(`/api/users/${uid}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json", "X-User-Id": uid },
          body:    JSON.stringify(updateBody),
        });
        if (avatarUrl) newUser.avatar = [{ url: avatarUrl }];
        if (bannerUrl) newUser.banner = [{ url: bannerUrl }];
      }

      setPendingRegistration(null);
      setPreviewAvatarNum(null);
      setUser(newUser);
      exit("/onboarding");
    } catch (err) {
      console.error("Registration error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Social OAuth 
  const doSocialLogin = (provider) => {
    window.location.href = `/api/auth/${provider}`;
  };

  const isProfile        = step === "profile";
  const previewAvatarUrl = previewAvatarNum
    ? `/static/avatars/no-profile_${previewAvatarNum}.png`
    : null;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        className={`login-page-wrap min-h-full flex items-center justify-center transition-[opacity,transform] duration-[370ms] ease-in-out ${isProfile ? "py-8 px-5" : "py-10 px-5"} ${exiting ? "opacity-0 -translate-y-5" : ""}`}
        style={{ background: "linear-gradient(148deg, #5B21B6 0%, #7C3AED 45%, #8B5CF6 100%)" }}
      >
        <div className="w-full max-w-[372px] bg-[rgba(244,240,255,0.97)] rounded-[32px] overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]">
          <div key={stepKey} className="step-content-anim">
            {step === "login" && (
              <LoginStep
                identifier={identifier}    setIdentifier={setIdentifier}
                loginPw={loginPw}          setLoginPw={setLoginPw}
                error={error}              loading={loading}
                onLogin={doLogin}
                onForgot={() => go("forgot")}
                onRegister={() => go("register")}
                onSocial={doSocialLogin}
              />
            )}
            {step === "forgot" && (
              <ForgotStep
                forgotId={forgotId}  setForgotId={setForgotId}
                sent={forgotSent}    error={error}   loading={loading}
                onSubmit={doForgot}
                onBack={() => go("login", () => { setForgotId(""); setForgotSent(false); })}
              />
            )}
            {step === "register" && (
              <RegisterStep
                username={username}       setUsername={setUsername}
                displayName={displayName} setDisplayName={setDisplayName}
                email={email}             setEmail={setEmail}
                regPw={regPw}             setRegPw={setRegPw}
                error={error}             loading={loading}
                onNext={doRegister}
                onBack={() => go("login", () => setError(""))}
                onSocial={doSocialLogin}
              />
            )}
            {step === "profile" && (
              <ProfileStep
                profileName={profileName}   setProfileName={setProfileName}
                isPrivate={isPrivate}       setIsPrivate={setIsPrivate}
                avatarPrev={avatarPrev}     bannerPrev={bannerPrev}
                avatarRef={avatarRef}       bannerRef={bannerRef}
                defaultAvatarUrl={avatarPrev ? null : previewAvatarUrl}
                defaultBannerUrl={null}
                onAvatarChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setAvatarFile(f); setAvatarPrev(URL.createObjectURL(f)); }
                }}
                onBannerChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setBannerFile(f); setBannerPrev(URL.createObjectURL(f)); }
                }}
                loading={loading}
                onBack={() => {
                  setPendingRegistration(null);
                  setPreviewAvatarNum(null);
                  go("register");
                }}
                onNext={doProfile}
                username={pendingRegistration?.username || username}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}