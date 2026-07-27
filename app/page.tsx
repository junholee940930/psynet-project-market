import LandingDemo from "@/components/LandingDemo";

export default function HomePage() {
  return (
    <main className="landing">
      <div className="eyebrow">PSYNET · PROJECT MARKET</div>
      <h1 className="landing-h1">
        만들면 <b>투자받고</b>, 참여하면 <b>성과금</b>
      </h1>
      <LandingDemo />
      <a href="/start" id="demo-start-btn">
        참여하기 →
      </a>
    </main>
  );
}
