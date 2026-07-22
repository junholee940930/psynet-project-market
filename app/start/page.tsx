import Terminal from "@/components/Terminal";
import ConnectWidget from "@/components/ConnectWidget";
import { COMMAND_EXAMPLES } from "@/lib/examples";

export default function StartPage() {
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">PSYNET · PROJECT MARKET</div>
        <h1>
          프로젝트. 찾지말고 <b>물어보세요</b>
        </h1>
        <div className="nav">
          <a href="/projects">전체 프로젝트 보기 →</a>
        </div>
        <ConnectWidget />
      </section>
      <Terminal />
      <section className="examples">
        <div className="examples-title">이렇게 말하면 돼요</div>
        <div className="examples-grid">
          {COMMAND_EXAMPLES.map((e) => (
            <div className="examples-item" key={e.cmd}>
              <span className="examples-cmd">&quot;{e.cmd}&quot;</span>
              <span className="examples-desc">{e.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
