import Terminal from "@/components/Terminal";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">PSYNET · PROJECT MARKET</div>
        <h1>
          프로젝트를 찾고, <b>대화하듯</b> 지분을 협의한다
        </h1>
        <div className="nav">
          <a href="/projects">전체 프로젝트 보기 →</a>
        </div>
      </section>
      <Terminal />
    </main>
  );
}
