import type { SocialNetworkSlug } from "@/lib/social-networks";

export function NetworkLogo({ network, className = "" }: { network: SocialNetworkSlug; className?: string }) {
  const common = { viewBox: "0 0 64 64", fill: "none", xmlns: "http://www.w3.org/2000/svg", className };
  switch (network) {
    case "instagram": return <svg {...common}><rect x="10" y="10" width="44" height="44" rx="13" stroke="currentColor" strokeWidth="5"/><circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="5"/><circle cx="45" cy="19" r="3" fill="currentColor"/></svg>;
    case "tiktok": return <svg {...common}><path d="M38 10v29.5a12.5 12.5 0 1 1-9-12V35a5 5 0 1 0 3 4.5V10h6c1.8 5.5 5.3 8.7 12 9.5V26c-5.1-.4-9.2-2.1-12-5.2Z" fill="currentColor"/></svg>;
    case "facebook": return <svg {...common}><path d="M37 54V34h7l1-8h-8v-5c0-2.5 1-4 5-4h4v-7c-1.4-.2-3.7-.5-6.6-.5C32.8 9.5 29 13.6 29 21v5h-7v8h7v20h8Z" fill="currentColor"/></svg>;
    case "youtube": return <svg {...common}><path d="M55 20.5a7 7 0 0 0-4.9-5C45.7 14.3 32 14.3 32 14.3s-13.7 0-18.1 1.2a7 7 0 0 0-4.9 5C7.8 25 7.8 32 7.8 32S7.8 39 9 43.5a7 7 0 0 0 4.9 5C18.3 49.7 32 49.7 32 49.7s13.7 0 18.1-1.2a7 7 0 0 0 4.9-5C56.2 39 56.2 32 56.2 32s0-7-1.2-11.5Z" fill="currentColor"/><path d="m27 40 12-8-12-8v16Z" fill="#FFD400"/></svg>;
    case "spotify": return <svg {...common}><circle cx="32" cy="32" r="25" stroke="currentColor" strokeWidth="5"/><path d="M20 27c9-3 18-2 26 3M21 35c8-2 15-1 22 3M22 42c6-1 11 0 16 2" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/></svg>;
    case "twitter": return <svg {...common}><path d="M13 10h12l9 13 11-13h6L37 27l15 27H40L29 38 15 54H9l16-19L13 10Zm9 5 20 34h5L27 15h-5Z" fill="currentColor"/></svg>;
    case "whatsapp": return <svg {...common}><path d="M32 9a23 23 0 0 0-19.8 34.7L9 55l11.6-3A23 23 0 1 0 32 9Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round"/><path d="M24 21c1-2 3-2 4-1l3 5c.6 1.2-.6 2.4-2 3.3 2.3 4.2 5.5 7.2 9.8 9.2.8-1.3 2-2.4 3.2-1.8l5 3c1.2.8 1 3-.7 4.4-2.3 2-5 2-8.2.5-8.5-4-15-10.2-18.7-18.5-1.4-3.2-1.2-5.9.6-7.8Z" fill="currentColor"/></svg>;
    case "snapchat": return <svg {...common}><path d="M32 10c-9 0-14 6-14 15v10c0 2-3 3-6 3 1 3 5 5 9 5 0 3 4 5 11 5s11-2 11-5c4 0 8-2 9-5-3 0-6-1-6-3V25c0-9-5-15-14-15Z" fill="currentColor"/></svg>;
    case "linkedin": return <svg {...common}><rect x="9" y="9" width="46" height="46" rx="6" stroke="currentColor" strokeWidth="5"/><circle cx="22" cy="25" r="3" fill="currentColor"/><path d="M19 31v14M28 45V31m0 6c0-8 15-8 15 0v8M43 37v8" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/></svg>;
    case "telegram": return <svg {...common}><path d="m55 11-8 42-15-12-8 8 1-12 22-20-27 17-10-3 43-20Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/><path d="m25 37 7 4" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>;
  }
}
