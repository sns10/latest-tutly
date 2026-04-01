import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800", "900"], subsets: ["latin"] });

export const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const titleY = interpolate(
    spring({ frame: frame - 15, fps, config: { damping: 15 } }),
    [0, 1], [80, 0]
  );
  const titleOp = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const tagY = interpolate(
    spring({ frame: frame - 35, fps, config: { damping: 15 } }),
    [0, 1], [60, 0]
  );
  const tagOp = interpolate(frame, [35, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const line1Op = interpolate(frame, [55, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line1Y = interpolate(
    spring({ frame: frame - 55, fps, config: { damping: 15 } }),
    [0, 1], [40, 0]
  );

  // Pulsing glow
  const glowSize = 150 + Math.sin(frame * 0.08) * 30;

  return (
    <AbsoluteFill style={{ fontFamily, justifyContent: "center", alignItems: "center" }}>
      {/* Central glow */}
      <div style={{
        position: "absolute",
        width: glowSize * 3,
        height: glowSize * 3,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(249,97,103,0.25) 0%, transparent 70%)",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }} />

      {/* Logo circle */}
      <div style={{
        width: 160,
        height: 160,
        borderRadius: 40,
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${logoScale})`,
        boxShadow: "0 20px 60px rgba(99,102,241,0.4)",
        marginBottom: 30,
      }}>
        <span style={{ fontSize: 72, fontWeight: 900, color: "white" }}>T</span>
      </div>

      {/* Title */}
      <div style={{
        transform: `translateY(${titleY}px)`,
        opacity: titleOp,
        textAlign: "center",
      }}>
        <span style={{ fontSize: 82, fontWeight: 900, color: "white", letterSpacing: -2 }}>
          Tutly
        </span>
        <span style={{ fontSize: 36, fontWeight: 400, color: "rgba(255,255,255,0.6)", marginLeft: 12 }}>
          by UpSkillr
        </span>
      </div>

      {/* Tagline */}
      <div style={{
        transform: `translateY(${tagY}px)`,
        opacity: tagOp,
        marginTop: 20,
      }}>
        <span style={{
          fontSize: 38,
          fontWeight: 600,
          background: "linear-gradient(90deg, #f96167, #f9a825)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}>
          Smart Tuition Management
        </span>
      </div>

      {/* Subtitle */}
      <div style={{
        transform: `translateY(${line1Y}px)`,
        opacity: line1Op,
        marginTop: 30,
        textAlign: "center",
        padding: "0 60px",
      }}>
        <span style={{
          fontSize: 28,
          fontWeight: 400,
          color: "rgba(255,255,255,0.7)",
          lineHeight: 1.5,
        }}>
          Everything your tuition center needs.{"\n"}One powerful platform.
        </span>
      </div>
    </AbsoluteFill>
  );
};
