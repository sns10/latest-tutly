import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["600", "700", "800"], subsets: ["latin"] });

export const AttendanceScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeScale = spring({ frame, fps, config: { damping: 12 } });
  const titleOp = interpolate(frame, [5, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(spring({ frame: frame - 5, fps, config: { damping: 15 } }), [0, 1], [50, 0]);

  const imgScale = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 80 } });
  const imgOp = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const features = ["One-tap marking", "WhatsApp alerts to parents", "Subject-wise tracking", "Auto-detect from timetable"];
  
  return (
    <AbsoluteFill style={{ fontFamily, padding: 50 }}>
      {/* Feature badge */}
      <div style={{
        transform: `scale(${badgeScale})`,
        background: "linear-gradient(135deg, #10b981, #059669)",
        borderRadius: 50,
        padding: "12px 30px",
        alignSelf: "flex-start",
        marginTop: 80,
        marginLeft: 20,
      }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: 2 }}>
          ✓ Feature 1
        </span>
      </div>

      {/* Title */}
      <div style={{ transform: `translateY(${titleY}px)`, opacity: titleOp, marginTop: 30, marginLeft: 20 }}>
        <span style={{ fontSize: 64, fontWeight: 800, color: "white", lineHeight: 1.1 }}>
          Smart{"\n"}Attendance
        </span>
      </div>

      {/* Image */}
      <div style={{
        transform: `scale(${imgScale})`,
        opacity: imgOp,
        marginTop: 30,
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        width: 900,
        height: 700,
        alignSelf: "center",
      }}>
        <Img src={staticFile("images/feature-attendance.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Feature bullets */}
      <div style={{ marginTop: 40, marginLeft: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {features.map((f, i) => {
          const delay = 40 + i * 10;
          const op = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x = interpolate(spring({ frame: frame - delay, fps, config: { damping: 15 } }), [0, 1], [-30, 0]);
          return (
            <div key={i} style={{ opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: "#f96167" }} />
              <span style={{ fontSize: 26, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{f}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
