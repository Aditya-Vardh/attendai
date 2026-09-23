import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { AlertTriangle, Camera, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrCameraScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
}

export function QrCameraScanner({ onScan }: QrCameraScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);

  const startScanner = () => {
    const elementId = "attendai-qr-reader-canvas";
    const container = document.getElementById(elementId);
    if (!container) return;

    setCameraError(null);
    setIsStarting(true);

    // Stop existing instance if any
    if (qrCodeInstanceRef.current) {
      try {
        if (qrCodeInstanceRef.current.isScanning) {
          qrCodeInstanceRef.current.stop().catch(() => {});
        }
      } catch {}
    }

    const html5QrCode = new Html5Qrcode(elementId);
    qrCodeInstanceRef.current = html5QrCode;

    const qrConfig = { fps: 10, qrbox: { width: 220, height: 220 } };

    const handleSuccess = (decodedText: string) => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
      onScan(decodedText);
    };

    // Try back camera first (environment), fallback to front camera (user)
    html5QrCode
      .start({ facingMode: "environment" }, qrConfig, handleSuccess, () => {})
      .then(() => setIsStarting(false))
      .catch(() => {
        // Fallback to front camera
        html5QrCode
          .start({ facingMode: "user" }, qrConfig, handleSuccess, () => {})
          .then(() => setIsStarting(false))
          .catch((err) => {
            setIsStarting(false);
            setCameraError(
              "Camera access denied or unavailable. Please grant camera permission in your browser address bar."
            );
          });
      });
  };

  useEffect(() => {
    startScanner();

    return () => {
      if (qrCodeInstanceRef.current) {
        try {
          if (qrCodeInstanceRef.current.isScanning) {
            qrCodeInstanceRef.current.stop().catch(() => {});
          }
        } catch {}
      }
    };
  }, []);

  return (
    <div className="space-y-3 text-center">
      {cameraError ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 space-y-2">
          <AlertTriangle className="h-5 w-5 mx-auto text-amber-600" />
          <p className="font-bold">Camera Access Required</p>
          <p className="text-[11px] text-amber-700 font-medium">{cameraError}</p>
          <Button
            size="sm"
            onClick={startScanner}
            className="neu-button text-xs font-bold px-4 h-8 text-[#364322]"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" /> Retry Camera
          </Button>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-[#364322] border-2 border-[#9CAB84] p-2 min-h-[260px] flex flex-col items-center justify-center">
          {isStarting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#364322]/90 text-white gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-[#9CAB84]" />
              <span className="text-xs font-bold">Opening camera…</span>
            </div>
          )}
          <div id="attendai-qr-reader-canvas" className="w-full h-full text-xs max-w-xs mx-auto" />
          <p className="py-2 text-[11px] text-[#C5D89D] font-medium flex items-center justify-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-[#9CAB84]" /> Position office QR code inside the frame
          </p>
        </div>
      )}
    </div>
  );
}
