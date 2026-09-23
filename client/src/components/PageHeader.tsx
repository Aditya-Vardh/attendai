import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: { label: string; onClick: () => void } }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">{eyebrow ?? "AttendAI Workspace"}</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p></div>{action && <Button onClick={action.onClick} className="rounded-xl bg-indigo-600 hover:bg-indigo-700"><Plus className="mr-2 h-4 w-4"/>{action.label}</Button>}</div>;
}

