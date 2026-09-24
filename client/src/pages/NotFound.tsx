import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F6F0D7] p-4 text-[#364322]">
      <div className="w-full max-w-md p-8 rounded-[28px] bg-[#F6F0D7] shadow-[16px_16px_40px_#C8C2AA,-8px_-8px_30px_#FFFFFF] text-center space-y-6">
        <div className="flex justify-center">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#EADFB4] text-[#89986D] shadow-[6px_6px_16px_#D8D2BC,-6px_-6px_16px_#FFFFFF]">
            <AlertCircle className="h-10 w-10 text-[#89986D]" />
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-black text-[#364322] tracking-tight">404</h1>
          <h2 className="text-lg font-bold text-[#5C6B44] mt-2">
            Page Not Found
          </h2>
          <p className="mt-3 text-xs text-[#5C6B44] font-medium leading-relaxed">
            The page or feature route you are looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <Button
            onClick={handleGoHome}
            className="neu-button-primary text-xs font-bold px-6 h-11 flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
