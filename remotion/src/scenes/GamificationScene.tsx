import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["600", "700", "800"], subsets: ["latin"] });

export const GamificationScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeScale = spring({ frame, fps, config: { damping: 12 } });
  const titleOp = interpolate(frame, [5, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(spring({ frame: frame - 5, fps, config: { damping: 15 } }), [0, 1], [50, 0]);
  const imgScale = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 80 } });
  const imgOp = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const features = ["XP points & streaks", "Badges & trophies", "Reward store", "Student competition"];

  // Floating particles for energy
  const particles = Array.from({ length: 8 }, (_, i) => ({
    x: 100 + i * 120,
    y: 300 + Math.sin(frame * 0.05 + i * 2) * 50,
    size: 6 + Math.sin(frame * 0.08 + i) * 3,
    opacity: 0.3 + Math.sin(frame * 0.06 + i) * 0.2,
  }));

  return (
    <AbsoluteFill style={{ fontFamily, padding: 50 }}>
      {/* Energy particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: "50%",
          background: "#fbbf24", opacity: p.opacity,
        }} />
      ))}

      <div style={{
        transform: `scale(${badgeScale})`,
        background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
        borderRadius: 50, padding: "12px 30px", alignSelf: "flex-start", marginTop: 80, marginLeft: 20,
      }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: 2 }}>
          🏆 Feature 3
        </span>
      </div>

      <div style={{ transform: `translateY(${titleY}px)`, opacity: titleOp, marginTop: 30, marginLeft: 20 }}>
        <span style={{ fontSize: 64, fontWeight: 800, color: "white", lineHeight: 1.1 }}>
          Gamification{"\n"}& Leaderboard
        </span>
      </div>

      <div style={{
        transform: `scale(${imgScale})`, opacity: imgOp, marginTop: 30,
        borderRadius: 24, overflow: "hidden", boxShadow: "0 30px 80px rgba(139,92,246,0.4)",
        width: 900, height: 700, alignSelf: "center",
      }}>
        <Img src={staticFile("images/feature-gamification.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      <div style={{ marginTop: 40, marginLeft: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {features.map((f, i) => {
          const delay = 40 + i * 10;
          const op = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x = interpolate(spring({ frame: frame - delay, fps, config: { damping: 15 } }), [0, 1], [-30, 0]);
          return (
            <div key={i} style={{ opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: "#8b5cf6" }} />
              <span style={{ fontSize: 26, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{f}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
