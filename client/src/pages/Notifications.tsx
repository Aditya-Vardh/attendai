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

      <Card className="neu-card border-none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-5 border-b border-[#D8D2BC]/60">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center neu-badge-sage">
                <Bell className="h-4 w-4 text-[#2C3917]" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#364322]">All Notifications</h3>
                {(list.data?.unread ?? 0) > 0 && (
                  <span className="text-[10px] font-bold text-[#89986D]">
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
              className="neu-button text-xs px-4 text-[#364322]"
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-[#89986D]" /> Mark All Read
            </Button>
          </div>

          <div className="divide-y divide-[#D8D2BC]/40">
            {list.isLoading ? (
              <p className="p-8 text-center text-xs text-[#5C6B44] font-medium">Loading inbox…</p>
            ) : list.data?.items.length ? (
              list.data.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex gap-3.5 p-5 transition-colors ${
                    !item.readAt ? "bg-[#C5D89D]/25" : "hover:bg-[#C5D89D]/10"
                  }`}
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center neu-badge-sage">
                    <Bell className="h-4 w-4 text-[#2C3917]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      className="text-left w-full cursor-pointer"
                      onClick={() => {
                        if (!item.readAt) mark.mutate({ id: item.id });
                        if (item.href) setLocation(item.href);
                      }}
                    >
                      <p className="text-sm font-bold text-[#364322]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#5C6B44] font-medium leading-relaxed">{item.body}</p>
                      <p className="mt-2 text-[10px] font-mono text-[#89986D] font-bold">
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
                        className="text-[#89986D] hover:text-[#364322] text-xs h-8 w-8 cursor-pointer"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove.mutate({ id: item.id })}
                      title="Delete notification"
                      className="text-[#5C6B44] hover:text-[#D9534F] text-xs h-8 w-8 cursor-pointer"
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

