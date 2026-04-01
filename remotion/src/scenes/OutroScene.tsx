import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800", "900"], subsets: ["latin"] });

export const OutroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 12 } });
  const titleOp = interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(spring({ frame: frame - 10, fps, config: { damping: 15 } }), [0, 1], [60, 0]);

  const priceOp = interpolate(frame, [35, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const priceScale = spring({ frame: frame - 35, fps, config: { damping: 10, stiffness: 120 } });

  const trialOp = interpolate(frame, [55, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const ctaOp = interpolate(frame, [70, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaScale = spring({ frame: frame - 70, fps, config: { damping: 8 } });

  // Pulsing glow
  const pulse = 1 + Math.sin(frame * 0.1) * 0.03;

  const moreFeatures = [
    "📊 Reports & Analytics",
    "📅 Timetable & Scheduling",
    "📝 Term Exams",
    "📚 Study Materials",
    "📢 Announcements",
    "🔄 Academic Year Reset",
  ];

  return (
    <AbsoluteFill style={{ fontFamily, justifyContent: "center", alignItems: "center" }}>
      {/* Glow */}
      <div style={{
        position: "absolute", width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
        top: "30%", left: "50%", transform: `translate(-50%, -50%) scale(${pulse})`,
      }} />

      {/* Logo */}
      <div style={{
        width: 120, height: 120, borderRadius: 30,
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${logoScale})`,
        boxShadow: "0 20px 60px rgba(99,102,241,0.5)",
      }}>
        <span style={{ fontSize: 56, fontWeight: 900, color: "white" }}>T</span>
      </div>

      {/* Title */}
      <div style={{ transform: `translateY(${titleY}px)`, opacity: titleOp, marginTop: 25, textAlign: "center" }}>
        <span style={{ fontSize: 60, fontWeight: 900, color: "white" }}>Tutly</span>
        <span style={{ fontSize: 28, fontWeight: 400, color: "rgba(255,255,255,0.5)", marginLeft: 10 }}>by UpSkillr</span>
      </div>

      {/* More features grid */}
      <div style={{
        marginTop: 40, display: "flex", flexWrap: "wrap", gap: 12,
        justifyContent: "center", padding: "0 40px", maxWidth: 900,
      }}>
        {moreFeatures.map((f, i) => {
          const delay = 20 + i * 6;
          const op = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const s = spring({ frame: frame - delay, fps, config: { damping: 15 } });
          return (
            <div key={i} style={{
              opacity: op, transform: `scale(${s})`,
              background: "rgba(255,255,255,0.08)", borderRadius: 16,
              padding: "14px 22px", border: "1px solid rgba(255,255,255,0.1)",
            }}>
              <span style={{ fontSize: 22, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{f}</span>
            </div>
          );
        })}
      </div>

      {/* Price */}
      <div style={{ opacity: priceOp, transform: `scale(${priceScale})`, marginTop: 50, textAlign: "center" }}>
        <span style={{ fontSize: 72, fontWeight: 900, color: "white" }}>₹1,199</span>
        <span style={{ fontSize: 28, fontWeight: 400, color: "rgba(255,255,255,0.5)" }}>/month</span>
      </div>

      {/* Trial */}
      <div style={{ opacity: trialOp, marginTop: 12 }}>
        <span style={{
          fontSize: 28, fontWeight: 700,
          background: "linear-gradient(90deg, #10b981, #34d399)",
          backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent",
        }}>
          21 Days Free Trial
        </span>
      </div>

      {/* CTA */}
      <div style={{
        opacity: ctaOp, transform: `scale(${ctaScale * pulse})`, marginTop: 40,
        background: "linear-gradient(135deg, #f96167, #f9a825)",
        borderRadius: 60, padding: "20px 60px",
        boxShadow: "0 15px 40px rgba(249,97,103,0.4)",
      }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: "white" }}>
          Start Your Free Trial →
        </span>
      </div>

      {/* Website */}
      <div style={{ opacity: ctaOp, marginTop: 25 }}>
        <span style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>
          tutlybyupskillr.lovable.app
        </span>
      </div>
    </AbsoluteFill>
  );
};
