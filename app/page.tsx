import LandingDemo from "@/components/LandingDemo";

export default function HomePage() {
  return (
    <main className="landing">
      <div className="eyebrow">PSYNET · PROJECT MARKET</div>
      <h1 className="landing-h1">
        프로젝트 찾지 말고, <b>물어보세요</b>
      </h1>
      <LandingDemo />
      <a href="/start" id="demo-start-btn">
        참여하기 →
      </a>
    </main>
  );
}
