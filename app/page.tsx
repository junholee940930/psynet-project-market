import Terminal from "@/components/Terminal";
import { listProjects } from "@/lib/projects";

export default function HomePage() {
  const n = listProjects().length;

  return (
    <main>
      <section className="hero">
        <div className="eyebrow">PSYNET · PROJECT MARKET</div>
        <h1>
          프로젝트를 찾고, <b>대화하듯</b> 지분을 협의한다
        </h1>
        <p>
          내 스킬에 맞는 프로젝트를 찾아 참여를 제안하고, 참여자 전원이 지분에
          합의하면 확정한다. 현재 {n}건의 프로젝트가 등록되어 있다.
        </p>
        <div className="nav">
          <a href="/projects">전체 프로젝트 보기 →</a>
        </div>
      </section>
      <Terminal />
    </main>
  );
}
