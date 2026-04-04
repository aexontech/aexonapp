import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Building2,
  MessageCircle,
} from "lucide-react";
import { Monogram } from "./Logo";
import { aexonConnect } from "../lib/aexonConnect";

type LoginType = "personal" | "institusi";
type InstitusiRole = "doctor" | "admin";
type ViewMode = "login" | "forgot" | "register";

interface LauncherProps {
  onLogin: (
    role: "doctor" | "admin",
    email: string,
    fullName: string,
    plan: "subscription" | "enterprise" | "trial" | null,
    trialDaysLeft: number | null,
    enterpriseId?: string,
  ) => void;
}

/* ─── Left brand panel (always visible) ─── */

const BrandPanel = () => (
  <div
    style={{
      position: "relative",
      width: "35%",
      minHeight: "100vh",
      background: "#0C1E35",
      overflow: "hidden",
      padding: "48px 44px",
      display: "flex",
      flexDirection: "column",
    }}
  >
    {/* Overlapping circles — dominant bottom-right, spread up naturally */}
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Circle 1 — largest, anchored bottom-right */}
      <div
        style={{
          position: "absolute",
          width: 550,
          height: 550,
          bottom: "-10%",
          left: "18%",
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 40%, rgba(56,155,215,0.36) 0%, rgba(40,125,185,0.24) 50%, rgba(25,85,145,0.10) 100%)",
        }}
      />
      {/* Circle 2 — overlaps right, bleeds off edge */}
      <div
        style={{
          position: "absolute",
          width: 480,
          height: 480,
          bottom: "-5%",
          left: "40%",
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 42%, rgba(60,160,218,0.33) 0%, rgba(42,128,188,0.22) 50%, rgba(26,82,142,0.09) 100%)",
        }}
      />
      {/* Circle 3 — spreads up-left from cluster */}
      <div
        style={{
          position: "absolute",
          width: 440,
          height: 440,
          bottom: "15%",
          left: "-2%",
          borderRadius: "50%",
          background: "radial-gradient(circle at 45% 38%, rgba(50,148,208,0.30) 0%, rgba(38,118,178,0.20) 50%, rgba(22,78,138,0.08) 100%)",
        }}
      />
      {/* Circle 4 — smaller, highest point of spread */}
      <div
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          bottom: "35%",
          left: "42%",
          borderRadius: "50%",
          background: "radial-gradient(circle at 42% 45%, rgba(65,165,222,0.26) 0%, rgba(48,135,195,0.16) 50%, rgba(28,88,148,0.06) 100%)",
        }}
      />
      {/* Teal accent — nestled in overlap */}
      <div
        style={{
          position: "absolute",
          width: 140,
          height: 140,
          bottom: "18%",
          left: "35%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13,148,136,0.22) 0%, rgba(13,140,128,0.08) 70%, transparent 100%)",
        }}
      />
    </div>

    {/* Logo */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 96,
        position: "relative",
        zIndex: 1,
      }}
    >
      <Monogram bg="#0C1E35" fg="#FFFFFF" dot="#2563EB" size={40} />
      <span
        className="font-aexon"
        style={{ fontSize: 24, color: "#FFFFFF" }}
      >
        Aexon
      </span>
    </div>

    {/* Bottom content */}
    <div style={{ marginTop: "auto", position: "relative", zIndex: 1 }}>
      <h1
        className="font-aexon"
        style={{
          fontSize: 42,
          lineHeight: 1.1,
          color: "#FFFFFF",
          marginBottom: 16,
        }}
      >
        Precision &amp; Serenity in Clinical Data.
      </h1>
      <p
        style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: 15,
          lineHeight: 1.7,
          marginBottom: 40,
          maxWidth: 340,
        }}
      >
        Streamlined clinical documentation for healthcare professionals.
      </p>
    </div>
  </div>
);

/* ─── Main component ─── */

export default function Launcher({ onLogin }: LauncherProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("login");
  const [loginType, setLoginType] = useState<LoginType>("personal");
  const [institusiRole, setInstitusiRole] = useState<InstitusiRole>("doctor");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const [regName, setRegName] = useState("");
  const [regStr, setRegStr] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regSip, setRegSip] = useState("");
  const [regSpecialization, setRegSpecialization] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  // ── App version (otomatis dari Electron, fallback hardcoded) ──
  const [appVersion, setAppVersion] = useState("1.2.0");
  useEffect(() => {
    window.aexonPlatform?.getAppVersion?.().then((v: string) => {
      if (v) setAppVersion(v);
    }).catch(() => {});
  }, []);

  /* ── Shared styles ── */

  const underlineInput: React.CSSProperties = {
    width: "100%",
    border: "none",
    borderBottom: "2px solid #E2E8F0",
    padding: "12px 0",
    fontSize: 15,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    background: "transparent",
    color: "#0C1E35",
    outline: "none",
  };

  const backBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "none",
    border: "none",
    color: "#0D9488",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 32,
    padding: 0,
  };

  const errorStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    fontSize: 13,
    color: "#DC2626",
    marginTop: 4,
  };

  /* ── Handlers (original logic, unchanged) ── */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data: loginData, error: loginError } = await aexonConnect.login(
        email,
        password,
        rememberMe,
      );

      if (loginError || !loginData) {
        // Check if error is email not verified
        if (
          loginError?.toLowerCase().includes("email") &&
          (loginError?.toLowerCase().includes("confirm") ||
            loginError?.toLowerCase().includes("verif"))
        ) {
          setError(
            "Silakan verifikasi akun Anda melalui email yang terdaftar.",
          );
        } else if (
          loginError === "Invalid login credentials" ||
          loginError === "Invalid credentials"
        ) {
          setError("Email atau password salah. Periksa kembali.");
        } else {
          setError(
            loginError ?? "Koneksi gagal. Periksa internet dan coba lagi.",
          );
        }
        setIsLoading(false);
        return;
      }

      const user = loginData?.user;

      if (!user) {
        setError(
          "Gagal memuat profil pengguna. Pastikan email dan password benar atau hubungi admin.",
        );
        setIsLoading(false);
        return;
      }

      if (loginType === "personal" && user.enterprise_id) {
        setError(
          "Akun ini terdaftar sebagai akun institusi. Pilih tab Institusi.",
        );
        setIsLoading(false);
        return;
      }
      if (loginType === "institusi" && !user.enterprise_id) {
        setError("Akun ini bukan akun institusi. Pilih tab Personal.");
        setIsLoading(false);
        return;
      }
      if (
        loginType === "institusi" &&
        institusiRole === "admin" &&
        user.role !== "admin"
      ) {
        setError("Akun ini adalah Dokter Institusi. Pilih Dokter Institusi.");
        setIsLoading(false);
        return;
      }
      if (
        loginType === "institusi" &&
        institusiRole === "doctor" &&
        user.role !== "doctor"
      ) {
        setError("Akun ini adalah Admin Institusi. Pilih Admin Institusi.");
        setIsLoading(false);
        return;
      }

      const { data: subStatus } = await aexonConnect.getSubscription();

      // Device session — non-blocking, login tetap lanjut meski endpoint gagal
      try {
        const deviceId = (await import("../lib/aexonConnect")).getDeviceId();
        await aexonConnect.createDeviceSession(deviceId);
      } catch {
        console.warn("[Launcher] createDeviceSession gagal, login tetap dilanjutkan.");
      }

      // Electron: init encrypted storage dengan password user
      if (window.aexonStorage) {
        const userId = user.email.replace(/[^a-zA-Z0-9]/g, '_');
        try {
          const initResult = await window.aexonStorage.initUser(userId, password);
          if (!initResult.success) {
            console.error("[Launcher] initUser gagal:", initResult.error);
          }
        } catch (err) {
          console.warn("[Launcher] aexonStorage.initUser error:", err);
        }
      }

      let plan: "subscription" | "enterprise" | "trial" | null = subStatus?.plan_type ?? null;

      let trialDaysLeft: number | null = subStatus?.trial_days_left ?? null;

      onLogin(
        user.role ?? "doctor",
        user.email ?? "",
        user.full_name ?? user.email ?? "",
        plan,
        trialDaysLeft,
        user.enterprise_id ?? undefined,
      );
    } catch (err: any) {
      setError(err.message ?? "Koneksi gagal. Periksa internet dan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");

    try {
      const { error: resetErr } = await aexonConnect.resetPassword(resetEmail);
      if (resetErr) throw new Error(resetErr);
      setResetSent(true);
    } catch (err: any) {
      setResetError(err.message || "Gagal mengirim link reset. Coba lagi.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError("");

    if (regPassword.length < 8) {
      setRegError("Password minimal 8 karakter.");
      setRegLoading(false);
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError("Konfirmasi password tidak cocok.");
      setRegLoading(false);
      return;
    }

    try {
      const { error: regErr } = await aexonConnect.register({
        email: regEmail,
        password: regPassword,
        full_name: regName.trim(),
        str_number: regStr.trim() || undefined,
        sip_number: regSip.trim() || undefined,
        specialization: regSpecialization.trim() || undefined,
      });

      if (regErr) {
        if (
          regErr.includes("already registered") ||
          regErr.includes("already exists")
        ) {
          throw new Error(
            "Email sudah terdaftar. Gunakan email lain atau login.",
          );
        }
        throw new Error(regErr);
      }

      setRegSuccess(true);
    } catch (err: any) {
      setRegError(err.message || "Pendaftaran gagal. Coba lagi.");
    } finally {
      setRegLoading(false);
    }
  };

  /* ── Render: right panel content ── */

  const renderLogin = () => (
    <>
      {/* Tabs — plain text with teal underline */}
      <div
        style={{
          display: "flex",
          gap: 32,
          borderBottom: "1px solid #E2E8F0",
          marginBottom: 32,
        }}
      >
        {(["personal", "institusi"] as LoginType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setLoginType(t);
              setError("");
            }}
            style={{
              background: "none",
              border: "none",
              borderBottom: loginType === t ? "2px solid #0D9488" : "2px solid transparent",
              paddingBottom: 14,
              fontSize: 14,
              fontWeight: loginType === t ? 700 : 400,
              color: loginType === t ? "#0C1E35" : "#94A3B8",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: "all 200ms",
            }}
          >
            {t === "personal" ? "Personal" : "Institusi"}
          </button>
        ))}
      </div>

      {/* Institusi sub-role — plain text underline, no pill/box */}
      <AnimatePresence mode="wait">
        {loginType === "institusi" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                display: "flex",
                gap: 24,
                marginBottom: 28,
              }}
            >
              {(["doctor", "admin"] as InstitusiRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setInstitusiRole(r)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: institusiRole === r
                      ? "2px solid #0C1E35"
                      : "2px solid transparent",
                    paddingBottom: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    color: institusiRole === r ? "#0C1E35" : "#94A3B8",
                    cursor: "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: "all 200ms",
                  }}
                >
                  {r === "doctor" ? "Dokter Institusi" : "Admin Institusi"}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleLogin}
        style={{ display: "flex", flexDirection: "column", gap: 0 }}
      >
        {/* Email — underline only */}
        <div style={{ marginBottom: 24 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            style={{
              ...underlineInput,
              opacity: isLoading ? 0.5 : 1,
            }}
            placeholder={loginType === "personal" ? "Email" : "Email Institusi"}
            required
          />
        </div>

        {/* Password — underline only */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              style={{
                ...underlineInput,
                paddingRight: 40,
                opacity: isLoading ? 0.5 : 1,
              }}
              placeholder="Password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {showPassword ? (
                <EyeOff style={{ width: 16, height: 16 }} />
              ) : (
                <Eye style={{ width: 16, height: 16 }} />
              )}
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#64748B" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: "#0D9488", cursor: "pointer" }}
              />
              Ingat saya
            </label>
            <button
              type="button"
              onClick={() => {
                setViewMode("forgot");
                setResetEmail(email);
              }}
              style={{
                background: "none",
                border: "none",
                fontSize: 13,
                color: "#64748B",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Lupa password?
            </button>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={errorStyle}
          >
            <AlertCircle
              style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }}
            />
            <span>{error}</span>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
          style={{
            width: "100%",
            marginTop: 20,
            fontSize: 15,
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {isLoading ? (
            <>
              <Loader2
                style={{
                  width: 16,
                  height: 16,
                  animation: "spin 1s linear infinite",
                }}
              />
              Masuk...
            </>
          ) : (
            <>Masuk{loginType === "institusi" ? ` sebagai ${institusiRole === "doctor" ? "Dokter" : "Admin"}` : ""}</>
          )}
        </button>

        {loginType === "personal" && (
          <button
            type="button"
            onClick={() => {
              setViewMode("register");
              setRegError("");
              setRegSuccess(false);
            }}
            className="btn-secondary"
            style={{ width: "100%", marginTop: 12 }}
          >
            Daftar Akun Baru
          </button>
        )}

        {loginType === "institusi" && (
          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#94A3B8",
              marginTop: 20,
            }}
          >
            Belum terdaftar?{" "}
            <button
              type="button"
              onClick={() => {
                setViewMode("register");
                setRegError("");
                setRegSuccess(false);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#0D9488",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
                fontSize: 13,
              }}
            >
              Hubungi Admin
            </button>
          </p>
        )}
      </form>

      <p
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "#CBD5E1",
          marginTop: 28,
        }}
      >
        v{appVersion} &middot; &copy; 2026 PT Aexon Inovasi Teknologi
      </p>
    </>
  );

  const renderForgot = () => (
    <>
      <button
        onClick={() => {
          setViewMode("login");
          setResetSent(false);
          setResetError("");
        }}
        style={backBtnStyle}
      >
        <ChevronLeft style={{ width: 16, height: 16 }} />
        Kembali
      </button>

      {resetSent ? (
        <div style={{ textAlign: "center", paddingTop: 24 }}>
          <Mail
            style={{
              width: 40,
              height: 40,
              color: "#0D9488",
              margin: "0 auto 20px",
            }}
          />
          <h2
            className="font-aexon"
            style={{ fontSize: 26, color: "#0C1E35", marginBottom: 8 }}
          >
            Link Terkirim!
          </h2>
          <p
            style={{ fontSize: 14, color: "#475569", marginBottom: 4 }}
          >
            Link reset telah dikirim ke:
          </p>
          <p
            style={{
              fontWeight: 700,
              color: "#0C1E35",
              marginBottom: 24,
            }}
          >
            {resetEmail}
          </p>
          <p
            style={{
              fontSize: 14,
              color: "#64748B",
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            Periksa inbox email kamu. Link berlaku selama 1 jam.
          </p>
          <button
            onClick={() => {
              setViewMode("login");
              setResetSent(false);
            }}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            Kembali ke Login
          </button>
        </div>
      ) : (
        <>
          <h2
            className="font-aexon"
            style={{ fontSize: 26, color: "#0C1E35", marginBottom: 8 }}
          >
            Reset Password
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "#64748B",
              marginBottom: 32,
              lineHeight: 1.6,
            }}
          >
            Masukkan email terdaftar. Kami akan mengirimkan link untuk
            membuat password baru.
          </p>

          <form
            onSubmit={handleResetPassword}
            style={{ display: "flex", flexDirection: "column", gap: 24 }}
          >
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              style={underlineInput}
              placeholder="Email terdaftar"
              required
            />

            {resetError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={errorStyle}
              >
                <AlertCircle
                  style={{
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <span>{resetError}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={resetLoading}
              className="btn-primary"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {resetLoading ? (
                <Loader2
                  style={{
                    width: 16,
                    height: 16,
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : null}
              Kirim Link Reset
            </button>
          </form>
        </>
      )}
    </>
  );

  const renderRegisterInstitusi = () => (
    <>
      <button onClick={() => setViewMode("login")} style={backBtnStyle}>
        <ChevronLeft style={{ width: 16, height: 16 }} />
        Kembali ke Login
      </button>

      <div style={{ paddingTop: 8 }}>
        <Building2
          style={{
            width: 40,
            height: 40,
            color: "#0C1E35",
            marginBottom: 20,
          }}
        />
        <h2
          className="font-aexon"
          style={{ fontSize: 26, color: "#0C1E35", marginBottom: 12 }}
        >
          Daftar Akun Institusi
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#64748B",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          Untuk mendaftarkan institusi Anda (rumah sakit, klinik, atau
          fasilitas kesehatan), silakan hubungi tim Aexon terlebih
          dahulu. Kami akan membantu proses onboarding dan memberikan
          kode institusi untuk akun Anda.
        </p>

        <div
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <a
            href="https://wa.me/6281234567890"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: "100%",
              padding: "14px 0",
              background: "#25D366",
              color: "white",
              fontWeight: 700,
              borderRadius: 12,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              textDecoration: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <MessageCircle style={{ width: 16, height: 16 }} />
            Hubungi Aexon via WhatsApp
          </a>
          <a
            href="mailto:cs@aexon.id"
            style={{
              width: "100%",
              padding: "14px 0",
              background: "white",
              color: "#0C1E35",
              fontWeight: 700,
              borderRadius: 12,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              textDecoration: "none",
              border: "2px solid #0C1E35",
              cursor: "pointer",
            }}
          >
            <Mail style={{ width: 16, height: 16 }} />
            Kirim Email ke Aexon
          </a>
        </div>

        <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 28, textAlign: "center" }}>
          Sudah punya kode institusi? Login dengan tab Institusi.
        </p>
      </div>
    </>
  );

  const renderRegisterPersonal = () => (
    <>
      <button
        onClick={() => {
          setViewMode("login");
          setRegError("");
          setRegSuccess(false);
        }}
        style={backBtnStyle}
      >
        <ChevronLeft style={{ width: 16, height: 16 }} />
        Kembali ke Login
      </button>

      {regSuccess ? (
        <div style={{ textAlign: "center", paddingTop: 24 }}>
          <Mail
            style={{
              width: 40,
              height: 40,
              color: "#0D9488",
              margin: "0 auto 20px",
            }}
          />
          <h2
            className="font-aexon"
            style={{ fontSize: 26, color: "#0C1E35", marginBottom: 8 }}
          >
            Pendaftaran berhasil!
          </h2>
          <p
            style={{ fontSize: 14, color: "#475569", marginBottom: 4 }}
          >
            Link verifikasi dikirim ke:
          </p>
          <p
            style={{
              fontWeight: 700,
              color: "#0C1E35",
              marginBottom: 24,
            }}
          >
            {regEmail}
          </p>
          <p
            style={{
              fontSize: 14,
              color: "#64748B",
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            Klik link di email untuk mengaktifkan akun.
          </p>
          <button
            onClick={() => {
              setViewMode("login");
              setRegSuccess(false);
            }}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            Kembali ke Login
          </button>
        </div>
      ) : (
        <>
          <h2
            className="font-aexon"
            style={{ fontSize: 26, color: "#0C1E35", marginBottom: 4 }}
          >
            Daftar Akun Personal
          </h2>
          <p style={{ fontSize: 14, color: "#64748B", marginBottom: 28 }}>
            Mulai 7-day free trial Anda.
          </p>

          <form
            onSubmit={handleRegister}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            <div>
              <label
                className="section-label"
                style={{ display: "block", marginBottom: 6 }}
              >
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                disabled={regLoading}
                style={{
                  ...underlineInput,
                  opacity: regLoading ? 0.5 : 1,
                }}
                placeholder="Nama lengkap (tanpa gelar)"
                required
              />
            </div>

            <div>
              <label
                className="section-label"
                style={{ display: "block", marginBottom: 6 }}
              >
                Email *
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                disabled={regLoading}
                style={{
                  ...underlineInput,
                  opacity: regLoading ? 0.5 : 1,
                }}
                placeholder="Email aktif"
                required
              />
            </div>

            <div>
              <label
                className="section-label"
                style={{ display: "block", marginBottom: 6 }}
              >
                Password *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={regShowPassword ? "text" : "password"}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={regLoading}
                  style={{
                    ...underlineInput,
                    paddingRight: 40,
                    opacity: regLoading ? 0.5 : 1,
                  }}
                  placeholder="Min. 8 karakter"
                  required
                />
                <button
                  type="button"
                  onClick={() => setRegShowPassword(!regShowPassword)}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#64748B",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {regShowPassword ? (
                    <EyeOff style={{ width: 16, height: 16 }} />
                  ) : (
                    <Eye style={{ width: 16, height: 16 }} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                className="section-label"
                style={{ display: "block", marginBottom: 6 }}
              >
                Konfirmasi Password *
              </label>
              <input
                type={regShowPassword ? "text" : "password"}
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                disabled={regLoading}
                style={{
                  ...underlineInput,
                  opacity: regLoading ? 0.5 : 1,
                }}
                placeholder="Ulangi password"
                required
              />
            </div>

            <div>
              <label
                className="section-label"
                style={{ display: "block", marginBottom: 6 }}
              >
                Nomor STR (opsional)
              </label>
              <input
                type="text"
                value={regStr}
                onChange={(e) => setRegStr(e.target.value)}
                disabled={regLoading}
                style={{
                  ...underlineInput,
                  opacity: regLoading ? 0.5 : 1,
                }}
                placeholder="Nomor Surat Tanda Registrasi"
              />
            </div>

            <div>
              <label
                className="section-label"
                style={{ display: "block", marginBottom: 6 }}
              >
                Nomor SIP (opsional)
              </label>
              <input
                type="text"
                value={regSip}
                onChange={(e) => setRegSip(e.target.value)}
                disabled={regLoading}
                style={{
                  ...underlineInput,
                  opacity: regLoading ? 0.5 : 1,
                }}
                placeholder="Surat Izin Praktik"
              />
            </div>

            <div>
              <label
                className="section-label"
                style={{ display: "block", marginBottom: 6 }}
              >
                Spesialisasi (opsional)
              </label>
              <input
                type="text"
                value={regSpecialization}
                onChange={(e) => setRegSpecialization(e.target.value)}
                disabled={regLoading}
                style={{
                  ...underlineInput,
                  opacity: regLoading ? 0.5 : 1,
                }}
                placeholder="Contoh: Gastroenterohepatologi"
              />
            </div>

            {regError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={errorStyle}
              >
                <AlertCircle
                  style={{
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <span>{regError}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={regLoading}
              className="btn-primary"
              style={{
                width: "100%",
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {regLoading ? (
                <Loader2
                  style={{
                    width: 16,
                    height: 16,
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : null}
              Daftar
            </button>
          </form>
        </>
      )}
    </>
  );

  /* ── Determine right panel content ── */

  let rightContent: React.ReactNode;
  if (viewMode === "forgot") {
    rightContent = renderForgot();
  } else if (viewMode === "register") {
    rightContent =
      loginType === "institusi"
        ? renderRegisterInstitusi()
        : renderRegisterPersonal();
  } else {
    rightContent = renderLogin();
  }

  /* ── Main layout ── */

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#FFFFFF",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <BrandPanel />

      <div
        style={{
          width: "65%",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 80px",
          overflowY: "auto",
        }}
      >
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ width: "100%", maxWidth: 420 }}
        >
          {rightContent}
        </motion.div>
      </div>
    </div>
  );
}