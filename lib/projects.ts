import projectsData from "@/data/projects.json";

export type Project = {
  id: string;
  title: string;
  pm: string;
  max_participants: number | null;
  required_skills: string[];
  status: string;
  summary: string;
};

const PROJECTS = projectsData as Project[];

export function listProjects(): Project[] {
  return PROJECTS;
}

export function getProject(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id.toLowerCase());
}

export function gradeFor(mySkills: string[], required: string[]): "A" | "B" | "C" | "D" {
  if (!required.length) return "B";
  const overlap = required.filter((r) => mySkills.includes(r)).length;
  const ratio = overlap / required.length;
  if (ratio >= 0.8) return "A";
  if (ratio >= 0.5) return "B";
  if (ratio >= 0.25) return "C";
  return "D";
}

export const GRADE_COLOR: Record<string, string> = {
  A: "#5FD98A",
  B: "#FFB800",
  C: "#FF5A4E",
  D: "#FF5A4E",
  신규: "#8C887E",
};

export const ALL_SKILLS = [
  "기획",
  "디자인",
  "프론트엔드",
  "백엔드",
  "데이터분석",
  "AI/ML",
  "마케팅",
  "운영",
  "영상편집",
  "번역",
];
