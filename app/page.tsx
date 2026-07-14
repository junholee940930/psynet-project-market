import LandingDemo from "@/components/LandingDemo";

export default function HomePage() {
  return (
    <main className="landing">
      <div className="eyebrow">PSYNET · PROJECT MARKET</div>
      <h1 className="landing-h1">
        프로젝트를 찾고, <b>대화하듯</b> 신청한다
      </h1>
      <LandingDemo />
      <a href="/start" id="demo-start-btn">
        참여하기 →
      </a>
    </main>
  );
}
