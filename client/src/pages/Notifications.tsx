import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { Empty } from "./Dashboard";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const list = trpc.notifications.list.useQuery({ page: 1, pageSize: 50, unreadOnly: false });
  const utils = trpc.useUtils();

  const mark = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const all = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const remove = trpc.notifications.remove.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Notification Inbox"
        description="A real-time record of leave outcomes, workforce anomaly alerts, executive reports, and admin digests."
      />

      <Card className="glass-card border-white/10">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-500/20 text-indigo-300">
                <Bell className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">All Notifications</h3>
                {(list.data?.unread ?? 0) > 0 && (
                  <span className="text-[10px] font-bold text-indigo-400">
                    {list.data?.unread} Unread Notifications
                  </span>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => all.mutate()}
              disabled={!list.data?.unread || all.isPending}
              className="rounded-xl border-white/10 bg-white/5 text-xs text-slate-200"
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark All Read
            </Button>
          </div>

          <div className="divide-y divide-white/5">
            {list.isLoading ? (
              <p className="p-8 text-center text-xs text-slate-400">Loading inbox…</p>
            ) : list.data?.items.length ? (
              list.data.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex gap-3.5 p-5 transition-colors ${
                    !item.readAt ? "bg-indigo-500/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-500/20 text-indigo-300">
                    <Bell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      className="text-left w-full"
                      onClick={() => {
                        if (!item.readAt) mark.mutate({ id: item.id });
                        if (item.href) setLocation(item.href);
                      }}
                    >
                      <p className="text-sm font-bold text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">{item.body}</p>
                      <p className="mt-2 text-[10px] font-mono text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </button>
                  </div>

                  <div className="flex items-start gap-1">
                    {!item.readAt && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => mark.mutate({ id: item.id })}
                        title="Mark read"
                        className="text-slate-400 hover:text-white text-xs h-8 w-8"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove.mutate({ id: item.id })}
                      title="Delete notification"
                      className="text-slate-400 hover:text-rose-400 text-xs h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6">
                <Empty text="Your notification inbox is clear." />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
