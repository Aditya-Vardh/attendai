import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {}
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

const clerkAppearance = {
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "w-full max-w-full shadow-none bg-transparent",
    card: "bg-[#F6F0D7] shadow-[6px_6px_16px_#D8D2BC,-6px_-6px_16px_#FFFFFF] rounded-[24px] border-none text-[#364322] w-full max-w-full p-4 sm:p-6",
    headerTitle: "text-[#364322] font-bold text-xl",
    headerSubtitle: "text-[#5C6B44]",
    socialButtonsBlockButton: "bg-[#F6F0D7] shadow-[3px_3px_8px_#D8D2BC,-3px_-3px_8px_#FFFFFF] hover:shadow-[2px_2px_5px_#D8D2BC,-2px_-2px_5px_#FFFFFF] rounded-[16px] text-[#364322] border-none font-medium",
    formButtonPrimary: "bg-[#9CAB84] text-white shadow-[4px_4px_10px_#82916B,-4px_-4px_10px_#B6C59D] hover:bg-[#89986D] rounded-[16px] border-none font-semibold",
    formFieldInput: "bg-[#F6F0D7] shadow-[inset_3px_3px_8px_#D8D2BC,inset_-3px_-3px_8px_#FFFFFF] rounded-[14px] border-none text-[#364322] focus:ring-2 focus:ring-[#9CAB84]",
    footerActionLink: "text-[#89986D] hover:text-[#364322] font-semibold",
    footer: "bg-transparent border-none",
    userButtonPopoverCard: "bg-[#F6F0D7] shadow-[8px_8px_20px_#D8D2BC,-8px_-8px_20px_#FFFFFF] rounded-[20px] border-none text-[#364322]",
  },
  variables: {
    colorPrimary: "#9CAB84",
    colorBackground: "#F6F0D7",
    colorText: "#364322",
    colorTextSecondary: "#5C6B44",
    colorInputBackground: "#F6F0D7",
    colorInputText: "#364322",
    borderRadius: "1.25rem",
  },
};

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY || ""} appearance={clerkAppearance}>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </ClerkProvider>
);
