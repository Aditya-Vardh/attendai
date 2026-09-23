import { useRef, useState, useEffect } from "react";
import { AlertCircle, Camera, CheckCircle2, RefreshCw, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface FaceCheckInWidgetProps {
  onSuccess: () => void;
}

export function FaceCheckInWidget({ onSuccess }: FaceCheckInWidgetProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const clockInWithFace = trpc.attendance.clockInWithFace.useMutation({
    onSuccess: (data) => {
      toast.success(`✓ Face matched (${data.confidencePercent}% confidence)! Checked in successfully.`);
      stopCamera();
      onSuccess();
    },
    onError: (err) => {
      setErrorMsg(err.message);
      toast.error(`Face verification failed: ${err.message}`);
    },
  });

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err: any) {
      setErrorMsg("Camera access needed. Please allow camera permissions in your browser address bar.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Auto-start webcam when Face ID tab mounts
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Re-bind stream to videoRef whenever videoRef is mounted/updated
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  const handleVerifyAndClockIn = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const { detectFaceDescriptor } = await import("@/lib/faceRecognition");
      const descriptor = await detectFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setErrorMsg("No face detected in camera view. Position your face inside the circle and ensure good lighting.");
        setIsProcessing(false);
        return;
      }

      clockInWithFace.mutate({ descriptor });
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Face detection error.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3 text-center">
      {/* Video Container — Always rendered to prevent null ref binding */}
      <div className={`relative overflow-hidden rounded-2xl bg-[#364322] aspect-video max-w-sm mx-auto flex items-center justify-center border-2 border-[#9CAB84] ${isCameraActive ? "block" : "hidden"}`}>
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-[#9CAB84]/70 rounded-full m-4 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white bg-black/50 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
            Center face in circle
          </span>
        </div>
      </div>

      {isCameraActive ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="lg"
            onClick={handleVerifyAndClockIn}
            disabled={isProcessing || clockInWithFace.isPending}
            className="neu-button-primary px-5 h-10 text-xs font-bold flex items-center gap-1.5"
          >
            <ScanFace className={`h-4 w-4 ${isProcessing ? "animate-spin" : ""}`} />
            {isProcessing ? "Extracting Descriptor…" : clockInWithFace.isPending ? "Verifying Match…" : "Verify Face & Check In"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={stopCamera}
            className="text-xs text-[#5C6B44] font-bold"
          >
            Turn Off Camera
          </Button>
        </div>
      ) : (
        <div className="space-y-2 py-2">
          <p className="text-xs text-[#5C6B44] font-medium">
            Click below to activate webcam for Face ID verification.
          </p>
          <Button
            size="lg"
            onClick={startCamera}
            className="w-full neu-button-primary px-6 h-11 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Camera className="h-4 w-4" /> Start Camera for Face ID
          </Button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-semibold text-center space-y-2">
          <p className="flex items-center justify-center gap-1.5 font-bold">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" /> {errorMsg}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              size="sm"
              onClick={startCamera}
              className="neu-button text-[11px] h-7 px-3 font-bold text-[#364322]"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry Camera Access
            </Button>
            {errorMsg.includes("not enrolled") && (
              <a href="/settings" className="underline text-[11px] text-rose-900 font-black">
                Enroll Face ID in Settings →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
