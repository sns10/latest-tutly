import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { IntroScene } from "./scenes/IntroScene";
import { AttendanceScene } from "./scenes/AttendanceScene";
import { FeesScene } from "./scenes/FeesScene";
import { GamificationScene } from "./scenes/GamificationScene";
import { PortalScene } from "./scenes/PortalScene";
import { OutroScene } from "./scenes/OutroScene";

export const MainVideo = () => {
  const frame = useCurrentFrame();

  // Persistent animated background
  const bgHue = interpolate(frame, [0, 600], [220, 260]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, hsl(${bgHue}, 60%, 8%) 0%, hsl(${bgHue + 20}, 50%, 15%) 50%, hsl(${bgHue}, 70%, 5%) 100%)`,
      }}
    >
      {/* Floating orbs */}
      <FloatingOrbs frame={frame} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={110}>
          <IntroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={100}>
          <AttendanceScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={100}>
          <FeesScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={100}>
          <GamificationScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={100}>
          <PortalScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={130}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

const FloatingOrbs = ({ frame }: { frame: number }) => {
  const orbs = [
    { x: 150, y: 400, size: 200, speed: 0.02, color: "rgba(249,97,103,0.15)" },
    { x: 800, y: 1200, size: 300, speed: 0.015, color: "rgba(99,102,241,0.12)" },
    { x: 400, y: 1600, size: 180, speed: 0.025, color: "rgba(249,97,103,0.1)" },
  ];

  return (
    <>
      {orbs.map((orb, i) => {
        const offsetX = Math.sin(frame * orb.speed + i) * 40;
        const offsetY = Math.cos(frame * orb.speed * 0.7 + i) * 30;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: orb.x + offsetX,
              top: orb.y + offsetY,
              width: orb.size,
              height: orb.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            }}
          />
        );
      })}
    </>
  );
};
