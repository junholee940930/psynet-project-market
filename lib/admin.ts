import { supabase } from "@/lib/supabase";
import { listProjects } from "@/lib/projects";

export type AdminSummary = {
  totalProjects: number;
  statusCount: { confirmed: number; negotiating: number; empty: number };
  participants: {
    name: string;
    joined: number;
    proposedSum: number;
    confirmedSum: number;
    projects: string[];
  }[];
};

export async function getAdminSummary(): Promise<AdminSummary> {
  const projects = listProjects();
  const { data: allRows, error } = await supabase.from("negotiations").select("*");
  if (error) throw new Error(error.message);

  const rowsByProject = new Map<string, typeof allRows>();
  for (const row of allRows ?? []) {
    const list = rowsByProject.get(row.project_id) ?? [];
    list.push(row);
    rowsByProject.set(row.project_id, list);
  }

  const statusCount = { confirmed: 0, negotiating: 0, empty: 0 };
  const participantMap = new Map<
    string,
    { joined: number; proposedSum: number; confirmedSum: number; projects: string[] }
  >();

  for (const project of projects) {
    const rows = rowsByProject.get(project.id) ?? [];
    if (!rows.length) {
      statusCount.empty++;
      continue;
    }
    const total = rows.reduce((s, r) => s + r.proposed_equity, 0);
    const allConfirmed = rows.every((r) => r.status === "confirmed");
    if (total === 100 && allConfirmed) statusCount.confirmed++;
    else statusCount.negotiating++;

    for (const row of rows) {
      const stat = participantMap.get(row.participant) ?? {
        joined: 0,
        proposedSum: 0,
        confirmedSum: 0,
        projects: [],
      };
      stat.joined++;
      stat.proposedSum += row.proposed_equity;
      if (row.status === "confirmed") stat.confirmedSum += row.proposed_equity;
      stat.projects.push(`${project.title}(${row.proposed_equity}%,${row.status})`);
      participantMap.set(row.participant, stat);
    }
  }

  const participants = [...participantMap.entries()]
    .map(([name, stat]) => ({ name, ...stat }))
    .sort((a, b) => b.confirmedSum - a.confirmedSum);

  return { totalProjects: projects.length, statusCount, participants };
}
