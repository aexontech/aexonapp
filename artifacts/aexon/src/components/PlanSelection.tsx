import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Loader2, CheckCircle2,
  Calendar, ArrowRight, RefreshCw, CreditCard,
} from "lucide-react";
import { aexonConnect, Plan } from "../lib/aexonConnect";
import { useToast } from "./ToastProvider";

interface PlanSelectionProps {
  onSelectPlan: (plan: Plan) => void;
  onBack: () => void;
}

const FONT = "'Plus Jakarta Sans', sans-serif";

export default function PlanSelection({ onSelectPlan, onBack }: PlanSelectionProps) {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fmt = (n: number) => "Rp" + n.toLocaleString("id-ID");

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data, error } = await aexonConnect.getPlans();
        if (error || !data) { showToast("Gagal memuat paket", "error"); return; }
        setPlans(data);
      } catch { showToast("Gagal memuat paket", "error"); }
      finally { setLoading(false); }
    }
    fetchPlans();
  }, []);

  const monthly = plans.find((p) => p.billing_cycle === "monthly");
  const annual = plans.find((p) => p.billing_cycle === "annual");

  const savingsPct = monthly && annual
    ? Math.round((1 - (annual.price / 12) / monthly.price) * 100)
    : 0;

  const PlanCard = ({ plan, highlighted }: { plan: Plan; highlighted: boolean }) => {
    const isAnnual = plan.billing_cycle === "annual";
    const hasBeta = plan.original_price !== null && plan.original_price > plan.price;
    const pricePerMonth = isAnnual ? Math.round(plan.price / 12) : plan.price;
    const originalPerMonth = isAnnual && plan.original_price
      ? Math.round(plan.original_price / 12)
      : plan.original_price ?? null;
    const features = (plan.features ?? []).filter(
      (f: string) => !/^hemat\s+rp/i.test(f.trim())
    );

    return (
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: isAnnual ? 0.12 : 0.06 }}
        whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(12,30,53,0.14)" }}
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          border: highlighted ? "2px solid #0C1E35" : "1px solid #E8ECF1",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: highlighted ? "0 8px 32px rgba(12,30,53,0.10)" : "none",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          transition: "border-color 200ms",
        }}
      >
        {highlighted && (
          <div style={{
            position: "absolute", top: 0, left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)",
            color: "#ffffff",
            fontSize: 10, fontWeight: 800,
            padding: "6px 18px", borderRadius: "0 0 10px 10px",
            letterSpacing: "0.06em",
            fontFamily: FONT, whiteSpace: "nowrap",
            zIndex: 1,
          }}>
            PALING HEMAT
          </div>
        )}

        <div style={{
          padding: highlighted ? "48px 32px 32px" : "32px 32px 32px",
          flex: 1, display: "flex", flexDirection: "column",
        }}>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 28 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: isAnnual
                ? "linear-gradient(135deg, #60A5FA, #2563EB)"
                : "#F1F5F9",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isAnnual ? "0 4px 14px rgba(37,99,235,0.2)" : "none",
            }}>
              {isAnnual
                ? <CreditCard style={{ width: 22, height: 22, color: "#fff" }} />
                : <Calendar style={{ width: 22, height: 22, color: "#64748B" }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3 style={{
                  fontSize: 18, fontWeight: 800, color: "#0C1E35",
                  margin: 0, fontFamily: FONT, lineHeight: 1.2,
                }}>
                  {hasBeta ? "Beta" : "Standard"} — {isAnnual ? "Tahunan" : "Bulanan"}
                </h3>
                {isAnnual && savingsPct > 0 && (
                  <span style={{
                    backgroundColor: "#ECFDF5", color: "#059669",
                    fontSize: 11, fontWeight: 800, padding: "3px 10px",
                    borderRadius: 999, whiteSpace: "nowrap",
                    border: "1px solid #BBF7D0", lineHeight: 1,
                    fontFamily: FONT,
                  }}>
                    Hemat {savingsPct}%
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: "#94A3B8", margin: "6px 0 0", fontFamily: FONT, lineHeight: 1.4 }}>
                {isAnnual ? "Komitmen 12 bulan, harga terbaik" : "Fleksibel, tanpa komitmen"}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: "#F1F5F9", marginBottom: 28 }} />

          {/* Pricing */}
          <div style={{ marginBottom: 32 }}>
            <p style={{
              fontSize: 14, color: "#94A3B8",
              textDecoration: originalPerMonth ? "line-through" : "none",
              margin: "0 0 6px", fontWeight: 500, fontFamily: FONT,
              visibility: originalPerMonth ? "visible" : "hidden",
            }}>
              {originalPerMonth ? `${fmt(originalPerMonth)}/bulan` : "placeholder"}
            </p>

            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 16 }}>
              <span style={{
                fontSize: 40, fontWeight: 900, color: "#0C1E35",
                fontFamily: FONT, lineHeight: 1,
              }}>
                {fmt(pricePerMonth)}
              </span>
              <span style={{ fontSize: 14, color: "#94A3B8", fontWeight: 500, fontFamily: FONT }}>/bulan</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 28, marginBottom: 12 }}>
              {hasBeta && (
                <>
                  <span style={{
                    backgroundColor: "#FFF7ED", color: "#EA580C",
                    fontSize: 10, fontWeight: 800, padding: "4px 12px",
                    borderRadius: 999, letterSpacing: "0.04em",
                    border: "1px solid #FED7AA", fontFamily: FONT,
                    whiteSpace: "nowrap",
                  }}>
                    HARGA BETA
                  </span>
                  {originalPerMonth && (
                    <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: FONT }}>
                      Normal {fmt(originalPerMonth)}
                    </span>
                  )}
                </>
              )}
            </div>

            <p style={{
              fontSize: 13, color: "#64748B", margin: 0, fontWeight: 500, fontFamily: FONT,
              visibility: isAnnual ? "visible" : "hidden",
            }}>
              {isAnnual ? `Ditagih ${fmt(plan.price)}/tahun` : "placeholder"}
            </p>
          </div>

          <button
            onClick={() => onSelectPlan(plan)}
            style={{
              width: "100%", padding: "14px 0", marginTop: 0,
              background: highlighted
                ? "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)"
                : "transparent",
              color: highlighted ? "#ffffff" : "#0C1E35",
              border: highlighted ? "none" : "2px solid #0C1E35",
              borderRadius: 12, fontSize: 15, fontWeight: 800,
              cursor: "pointer", fontFamily: FONT,
              boxShadow: highlighted ? "0 2px 8px rgba(12,30,53,0.15)" : "none",
              transition: "all 150ms",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
            onMouseEnter={(e) => {
              if (highlighted) {
                e.currentTarget.style.background = "linear-gradient(135deg, #152d4f, #1a3a5f)";
              } else {
                e.currentTarget.style.backgroundColor = "#0C1E35";
                e.currentTarget.style.color = "#ffffff";
              }
            }}
            onMouseLeave={(e) => {
              if (highlighted) {
                e.currentTarget.style.background = "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)";
              } else {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#0C1E35";
              }
            }}
          >
            Mulai Berlangganan
            {highlighted && <ArrowRight style={{ width: 15, height: 15 }} />}
          </button>
        </div>

        {features.length > 0 && (
          <div style={{ padding: "0 32px 32px", borderTop: "1px solid #F1F5F9" }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "#94A3B8",
              letterSpacing: "0.07em", margin: "20px 0 14px",
              fontFamily: FONT, textTransform: "uppercase",
            }}>
              {isAnnual ? "SEMUA FITUR" : "SEMUA FITUR"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {features.slice(0, 4).map((f: string, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <CheckCircle2 style={{ width: 15, height: 15, color: "#0D9488", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, fontFamily: FONT }}>{f}</span>
                </div>
              ))}
              {features.length > 4 && (
                <p style={{ fontSize: 12, color: "#94A3B8", margin: "4px 0 0 25px", fontFamily: FONT }}>
                </p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#F4F6F8", overflow: "hidden" }}>

      <div style={{
        backgroundColor: "#fff", borderBottom: "1px solid #E8ECF1",
        padding: "14px 28px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
      }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#64748B", fontFamily: FONT }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0C1E35")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Kembali
        </button>
        <div style={{ height: 16, width: 1, backgroundColor: "#E2E8F0" }} />
        <span style={{ fontSize: 16, fontWeight: 800, color: "#0C1E35", fontFamily: FONT }}>Pilih Paket</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 80px" }} className="custom-scrollbar">
        <div style={{ maxWidth: 780, margin: "0 auto" }}>

          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            style={{
              borderRadius: 16, marginBottom: 28, position: "relative",
              background: "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)",
              overflow: "hidden",
            }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "60px 60px, 40px 40px" }} />
            <div style={{ position: "relative", padding: "36px 32px", textAlign: "center" }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.08em", marginBottom: 16, fontFamily: FONT,
              }}>
                PAKET LANGGANAN
              </p>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", margin: "0 0 10px", fontFamily: FONT, lineHeight: 1.2 }}>
                Mulai menggunakan Aexon.
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: FONT, lineHeight: 1.6, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
                Coba Aexon selama 7 hari untuk melihat bagaimana dokumentasi klinis dapat menjadi lebih sederhana.
              </p>
            </div>
          </motion.div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <Loader2 className="animate-spin" style={{ width: 28, height: 28, color: "#CBD5E1", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, color: "#94A3B8", fontFamily: FONT }}>Memuat paket...</p>
            </div>
          ) : plans.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <RefreshCw style={{ width: 28, height: 28, color: "#CBD5E1", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, color: "#94A3B8", fontFamily: FONT }}>Tidak ada paket tersedia</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
              {monthly && <PlanCard plan={monthly} highlighted={false} />}
              {annual && <PlanCard plan={annual} highlighted={true} />}
              {!monthly && !annual && plans.map((p) => (
                <PlanCard key={p.id} plan={p} highlighted={!!p.is_popular} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}