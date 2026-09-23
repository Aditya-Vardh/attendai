import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { FileBarChart, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export function GlobalSearch() {
  const [open, setOpen] = useState(false); const [term, setTerm] = useState(""); const [, setLocation] = useLocation();
  const results = trpc.search.query.useQuery({ term }, { enabled: open && term.trim().length >= 2 });
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(value => !value); } if (event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, []);
  const navigate = (href: string) => { setLocation(href); setOpen(false); setTerm(""); };
  const grouped = (results.data ?? []).reduce<Record<string, any[]>>((all, result) => ({ ...all, [result.group]: [...(all[result.group] ?? []), result] }), {});
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="top-[16%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"><DialogHeader className="sr-only"><DialogTitle>Search AttendAI</DialogTitle></DialogHeader><div className="flex items-center gap-3 border-b px-4"><Search className="h-5 w-5 text-indigo-600"/><Input autoFocus value={term} onChange={e => setTerm(e.target.value)} placeholder="Search people, departments, leave, or reports…" className="h-14 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"/><kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd></div><div className="max-h-[360px] overflow-y-auto p-2">{term.length < 2 ? <p className="p-5 text-center text-sm text-muted-foreground">Type at least two characters to search your authorized AttendAI data.</p> : results.isLoading ? <p className="p-5 text-center text-sm text-muted-foreground">Searching…</p> : Object.keys(grouped).length ? Object.entries(grouped).map(([group, items]) => <div key={group} className="mb-2"><p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{group}</p>{items.map(item => <button key={item.id} onClick={() => navigate(item.href)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10"><span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-indigo-600">{group === "People" ? <Users className="h-4 w-4"/> : <FileBarChart className="h-4 w-4"/>}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span></span></button>)}</div>) : <p className="p-5 text-center text-sm text-muted-foreground">No authorized results found for “{term}”.</p>}</div></DialogContent></Dialog>;
}

