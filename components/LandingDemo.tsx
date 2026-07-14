"use client";

import { useEffect, useRef } from "react";

type ScriptLine = { type: "u" | "o"; text: string };

// 실제 동작(검색 → 신청 → 내 신청 확인)을 그대로 옮긴 데모 대화. 지분(%) 관련 예시는
// 제거된 기능이라 넣지 않는다 — 실제로 안 되는 걸 보여주면 안 되니까.
const SCRIPT: ScriptLine[] = [
  { type: "o", text: "PROJECT MARKET\n" },
  { type: "u", text: "> 다크모드 관련 프로젝트 찾아줘" },
  { type: "o", text: "매칭 결과 1건:\n  [신규] 다크모드 & 디자인시스템\n       요구:디자인  일치:없음" },
  { type: "u", text: "> 여기 신청할래" },
  { type: "o", text: "『다크모드 & 디자인시스템』에 신청 등록됨. PM 수락을 기다려줘." },
  { type: "u", text: "> 내 신청 보여줘" },
  { type: "o", text: "내 신청 현황 (1건):\n  다크모드 & 디자인시스템        [대기중]" },
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
