import { ClearForm } from "@/components/clearform";
import { liveAiEnabled } from "@/lib/ai";

export const dynamic = "force-dynamic";

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 34 34" aria-hidden>
      <rect
        x="5"
        y="2.5"
        width="22"
        height="29"
        rx="3.5"
        fill="var(--card-raised)"
        stroke="var(--ink)"
        strokeWidth="2"
      />
      <rect x="9" y="9" width="14" height="4.5" rx="1.5" fill="var(--mark)" />
      <path d="M9 18h14M9 22.5h9" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="25" cy="25" r="6.5" fill="var(--accent)" />
      <path
        d="m22.2 25 1.9 1.9 3.6-3.8"
        fill="none"
        stroke="var(--accent-ink)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          <BrandMark />
          ClearForm
        </a>
        <span className="topbar-note">Bills, forms, and letters explained in 16 languages</span>
      </header>
      <main>
        <ClearForm live={liveAiEnabled()} />
      </main>
      <footer className="site-footer">
        ClearForm uses Gemini by Google ·{" "}
        <a href="https://github.com/ashank-crazy/clearform">Source on GitHub</a>
      </footer>
    </>
  );
}
