const ICONS: {
  src: string;
  className: string;
  size: string;
  duration: number;
  delay: number;
}[] = [
  { src: "/illustrations/hero/instagram.svg", className: "left-[2%] top-[4%]", size: "w-10", duration: 5, delay: 0 },
  { src: "/illustrations/hero/tiktok.svg", className: "left-[38%] top-0", size: "w-9", duration: 6, delay: 0.4 },
  { src: "/illustrations/hero/facebook.svg", className: "left-[0%] top-[46%]", size: "w-9", duration: 7, delay: 0.8 },
  { src: "/illustrations/hero/youtube.svg", className: "right-[4%] top-[8%]", size: "w-11", duration: 5.5, delay: 1.2 },
  { src: "/illustrations/hero/heart.svg", className: "left-[30%] top-[16%]", size: "w-7", duration: 4.5, delay: 0.6 },
  { src: "/illustrations/hero/chart.svg", className: "left-[45%] top-[6%]", size: "w-14", duration: 6.5, delay: 0.2 },
  { src: "/illustrations/hero/star.svg", className: "right-[18%] top-[2%]", size: "w-5", duration: 4, delay: 1 },
  { src: "/illustrations/hero/star.svg", className: "right-[30%] top-[42%]", size: "w-4", duration: 5, delay: 1.6 },
];

/** Every character and icon is its own independent SVG with a transparent background —
 * each floats on its own timing (duration/delay), never in lockstep with the others. */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-lg lg:max-w-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- static illustration assets */}
      <img
        src="/illustrations/hero/boy.svg"
        alt=""
        className="animate-hero-float absolute bottom-0 left-[6%] w-[42%]"
        style={{ animationDuration: "5.5s", animationDelay: "0.3s" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/illustrations/hero/girl.svg"
        alt=""
        className="animate-hero-float absolute bottom-0 right-[4%] w-[42%]"
        style={{ animationDuration: "6s", animationDelay: "0.9s" }}
      />
      {ICONS.map((icon, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={icon.src}
          alt=""
          className={`animate-hero-float absolute ${icon.className} ${icon.size}`}
          style={{ animationDuration: `${icon.duration}s`, animationDelay: `${icon.delay}s` }}
        />
      ))}
    </div>
  );
}
