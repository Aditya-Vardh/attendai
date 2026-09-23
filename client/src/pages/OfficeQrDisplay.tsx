import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Building2, Clock, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Link } from "wouter";

export default function OfficeQrDisplay() {
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const qrQuery = trpc.attendance.generateQrToken.useMutation();

  const fetchNewToken = () => {
    qrQuery.mutate();
    setSecondsRemaining(60);
  };

  useEffect(() => {
    fetchNewToken();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          qrQuery.mutate();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const token = qrQuery.data?.token ?? "ATTENDAI_KLH_CAMPUS";
  const rawUrl = qrQuery.data?.url ?? `https://attendai.com/checkin?qr=${token}`;

  return (
    <div className="min-h-screen bg-[#F6F0D7] p-6 sm:p-10 flex flex-col items-center justify-center text-[#364322]">
      <div className="w-full max-w-xl space-y-6 text-center">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#5C6B44] hover:text-[#364322] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <Badge className="neu-badge-olive text-xs font-bold px-3 py-1">
            Official Office QR Kiosk
          </Badge>
        </div>

        <div className="neu-card p-8 sm:p-10 space-y-6 relative overflow-hidden">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 neu-badge-sage px-4 py-1 text-xs font-bold">
              <Building2 className="h-4 w-4 text-[#2C3917]" /> KLH Bachupally Campus Station
            </span>
            <h1 className="text-3xl font-black text-[#364322]">Physical Office Check-In QR</h1>
            <p className="text-xs text-[#5C6B44] font-medium max-w-md mx-auto">
              Scan this dynamic QR code using your phone camera inside the AttendAI app to check in on campus.
            </p>
          </div>

          {/* QR Code Frame */}
          <div className="relative inline-block p-6 rounded-3xl bg-[#F6F0D7] neu-inset">
            {qrQuery.isPending ? (
              <div className="h-[280px] w-[280px] flex items-center justify-center text-xs font-bold text-[#5C6B44]">
                <RefreshCw className="h-8 w-8 animate-spin text-[#9CAB84] mb-2" />
                Generating secure QR token…
              </div>
            ) : (
              <div className="p-3 bg-white rounded-2xl shadow-md">
                <QRCodeCanvas value={token} size={250} level="H" />
              </div>
            )}
          </div>

          {/* Countdown & Refresh control */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#364322]">
              <Clock className="h-4 w-4 text-[#89986D]" />
              <span>Token auto-refreshes in:</span>
              <span className="font-mono text-base font-black text-[#89986D] bg-[#EADFB4]/60 px-3 py-0.5 rounded-lg border border-[#D8D2BC]">
                {secondsRemaining}s
              </span>
            </div>

            {/* Countdown progress bar */}
            <div className="h-2 w-full max-w-xs mx-auto rounded-full bg-[#EADFB4] overflow-hidden">
              <div
                className="h-full bg-[#9CAB84] transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(secondsRemaining / 60) * 100}%` }}
              />
            </div>

            <Button
              onClick={fetchNewToken}
              disabled={qrQuery.isPending}
              className="neu-button text-xs font-bold h-9 px-5 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${qrQuery.isPending ? "animate-spin" : ""}`} />
              Generate Fresh QR Token Now
            </Button>
          </div>

          {/* Footer security notice */}
          <div className="pt-4 border-t border-[#D8D2BC] flex items-center justify-center gap-2 text-[11px] text-[#89986D] font-bold">
            <ShieldCheck className="h-4 w-4" />
            <span>Encrypted Time-Window Signature • Anti-Photo Spoof Protection</span>
          </div>
        </div>
      </div>
    </div>
  );
}
