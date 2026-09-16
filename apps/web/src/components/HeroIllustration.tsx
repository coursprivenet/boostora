type Anim = "hero-float" | "hero-pulse" | "hero-twinkle" | "hero-bounce" | "hero-swing";

const ICONS: {
  src: string;
  className: string;
  size: string;
  anim: Anim;
  duration: number;
  delay: number;
}[] = [
  { src: "/illustrations/hero/instagram.svg", className: "left-[0%] top-[2%]", size: "w-12", anim: "hero-float", duration: 5, delay: 0 },
  { src: "/illustrations/hero/tiktok.svg", className: "left-[36%] top-[0%]", size: "w-11", anim: "hero-swing", duration: 4, delay: 0.4 },
  { src: "/illustrations/hero/facebook.svg", className: "left-[8%] top-[42%]", size: "w-11", anim: "hero-float", duration: 7, delay: 0.8 },
  { src: "/illustrations/hero/youtube.svg", className: "right-[2%] top-[6%]", size: "w-12", anim: "hero-float", duration: 5.5, delay: 1.2 },
  { src: "/illustrations/hero/heart.svg", className: "left-[27%] top-[14%]", size: "w-8", anim: "hero-pulse", duration: 1.8, delay: 0.2 },
  { src: "/illustrations/hero/chart.svg", className: "left-[44%] top-[4%]", size: "w-16", anim: "hero-bounce", duration: 2.6, delay: 0.3 },
  { src: "/illustrations/hero/star.svg", className: "right-[16%] top-[0%]", size: "w-6", anim: "hero-twinkle", duration: 3, delay: 0 },
  { src: "/illustrations/hero/star.svg", className: "right-[28%] top-[38%]", size: "w-5", anim: "hero-twinkle", duration: 3.4, delay: 1 },
  { src: "/illustrations/hero/heart.svg", className: "right-[6%] top-[46%]", size: "w-6", anim: "hero-pulse", duration: 2.1, delay: 0.7 },
];

/** Every character and icon is its own independent SVG with a transparent background —
 * each floats/pulses/swings on its own timing, never in lockstep with the others. */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-2xl lg:max-w-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- static illustration assets */}
      <img
        src="/illustrations/hero/boy.svg"
        alt=""
        className="animate-hero-float absolute bottom-0 left-0 w-[46%]"
        style={{ animationDuration: "5.5s", animationDelay: "0.3s" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/illustrations/hero/jump.svg"
        alt=""
        className="animate-hero-float absolute bottom-[2%] left-[38%] w-[30%]"
        style={{ animationDuration: "4.8s", animationDelay: "1.1s" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/illustrations/hero/girl.svg"
        alt=""
        className="animate-hero-float absolute bottom-0 right-0 w-[46%]"
        style={{ animationDuration: "6s", animationDelay: "0.9s" }}
      />
      {ICONS.map((icon, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={icon.src}
          alt=""
          className={`animate-${icon.anim} absolute ${icon.className} ${icon.size}`}
          style={{ animationDuration: `${icon.duration}s`, animationDelay: `${icon.delay}s` }}
        />
      ))}
    </div>
  );
}
