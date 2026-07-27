"use client";

import { useEffect, useRef } from "react";
import board from "@/data/season1-board.json";

type ScriptLine = { type: "u" | "o"; text: string };

// 랜딩 데모: "사용법"이 아니라 실제 시즌 성과(프로젝트별 투자금 / 참여자별 성과금)를
// 보여준다. 수치 출처는 data/season1-board.json (프로젝트 목록_26시즌1.xlsx 집계,
// 보안 프로젝트 제외, 이름은 성만 노출). 다음 시즌엔 그 시즌 데이터로 교체.
const won = (v: number) => `₩ ${Math.round(v / 10000).toLocaleString()}만`;
const pad = (s: string, len: number) => (s.length >= len ? s : s + " ".repeat(len - s.length));

const projectLines = board.projects
  .map((p, i) => `  ${i + 1}. ${pad(p.title, 24)} ${won(p.invest)}`)
  .join("\n");
const peopleLines = board.people
  .map((p, i) => `  ${i + 1}. ${p.name}   ${pad(won(p.reward), 10)} (프로젝트 ${p.projects}건)`)
  .join("\n");

const SCRIPT: ScriptLine[] = [
  { type: "o", text: `PROJECT MARKET · ${board.season} 성과 보드\n` },
  { type: "u", text: "> 투자 많이 받은 프로젝트 보여줘" },
  { type: "o", text: `투자금 TOP 프로젝트\n${projectLines}` },
  { type: "u", text: "> 성과금 많이 받은 사람은?" },
  { type: "o", text: `성과금 TOP 참여자\n${peopleLines}` },
  { type: "o", text: "다음은 네 차례야. 참여하면 여기 이름이 올라와." },
];

export default function LandingDemo() {
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    let cursor: HTMLSpanElement | null = null;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timeouts.push(id);
    };

    function removeCursor() {
      if (cursor) {
        cursor.remove();
        cursor = null;
      }
    }

    function typeLine(text: string, cls: string, speed: number, done: () => void) {
      const span = document.createElement("span");
      span.className = cls;
      term!.appendChild(span);
      cursor = document.createElement("span");
      cursor.className = "demo-cursor";
      term!.appendChild(cursor);

      let i = 0;
      function step() {
        if (cancelled) return;
        if (i < text.length) {
          span.textContent += text[i];
          i++;
          term!.scrollTop = term!.scrollHeight;
          schedule(step, speed);
        } else {
          removeCursor();
          term!.appendChild(document.createElement("br"));
          term!.appendChild(document.createElement("br"));
          term!.scrollTop = term!.scrollHeight;
          done();
        }
      }
      step();
    }

    function playScript(idx: number) {
      if (cancelled) return;
      if (idx >= SCRIPT.length) {
        schedule(() => {
          term!.innerHTML = "";
          playScript(0);
        }, 2500);
        return;
      }
      const item = SCRIPT[idx];
      const speed = item.type === "u" ? 55 : 12;
      const pause = item.type === "u" ? 300 : 900;
      schedule(() => {
        typeLine(item.text, item.type === "u" ? "demo-u" : "demo-o", speed, () => playScript(idx + 1));
      }, pause);
    }

    playScript(0);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <div id="demo-window">
      <div id="demo-titlebar">
        <span className="dot r" />
        <span className="dot y" />
        <span className="dot g" />
        <span className="demo-label">project-market</span>
      </div>
      <div id="demo-term" ref={termRef} />
    </div>
  );
}
