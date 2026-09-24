import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Camera, CheckCircle2, Link2, RefreshCw, ScanFace, ShieldCheck, Trash2, Users, Wrench } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, logout, refresh } = useAuth();
  const utils = trpc.useUtils();

  const { data: userList = [], isLoading: loadingUsers } = trpc.organization.users.list.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  const updateRoleMutation = trpc.organization.users.updateRole.useMutation({
    onSuccess: async (_, variables) => {
      toast.success(`Role updated successfully to ${variables.role}`);
      await utils.organization.users.list.invalidate();
      if (user && user.id === variables.userId) {
        await refresh();
      }
    },
    onError: (err) => {
      toast.error(`Failed to update role: ${err.message}`);
    },
  });

  const relinkAllMutation = trpc.organization.users.relinkAll.useMutation({
    onSuccess: (data) => {
      toast.success(`Re-linked ${data.linked} of ${data.total} users to employee profiles.`);
      utils.organization.users.list.invalidate();
    },
    onError: (err) => toast.error(`Re-link failed: ${err.message}`),
  });

  const handleRoleChange = (userId: number, role: "admin" | "hr_manager" | "employee") => {
    updateRoleMutation.mutate({ userId, role });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Security"
        description="Manage your account profile, Clerk session security, and workforce access permissions."
      />

      <div className="grid max-w-5xl gap-6">
        {/* Profile Card */}
        <section className="neu-card p-6">
          <h3 className="text-base font-bold text-[#364322] mb-4">Account Profile</h3>
          <div className="grid gap-5 sm:grid-cols-3">
            <Info label="Full Name" value={user?.name ?? "Not available"} />
            <Info label="Email Address" value={user?.email ?? "Not available"} />
            <Info
              label="Access Role"
              value={
                <Badge className="neu-badge-sage font-bold">
                  {user?.role === "hr_manager"
                    ? "HR Manager"
                    : user?.role === "admin"
                    ? "Administrator"
                    : "Employee"}
                </Badge>
              }
            />
          </div>
        </section>

        {/* Face ID & Biometric Verification Card */}
        <FaceIdEnrollmentSection user={user} refresh={refresh} />

        {/* Admin: User Role Management */}
        {user?.role === "admin" && (
          <section className="neu-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D2BC] pb-4">
              <div>
                <div className="flex items-center gap-2 text-lg font-bold text-[#364322]">
                  <Users className="h-5 w-5 text-[#89986D]" />
                  <span>Workforce User & Role Management</span>
                </div>
                <p className="text-xs text-[#5C6B44] mt-1 font-medium">
                  Promote or change user roles across the organization. Changes apply immediately.
                </p>
              </div>
              <Badge className="neu-badge-olive text-xs font-bold shrink-0 self-start sm:self-center">
                Admin Exclusive Control
              </Badge>
            </div>

            {loadingUsers ? (
              <div className="py-8 text-center text-xs font-semibold text-[#5C6B44]">
                Loading registered users…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#D8D2BC] text-[#89986D] uppercase tracking-wider font-bold">
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3">Current Role</th>
                      <th className="py-3 px-3 text-right">Promote / Change Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8D2BC]/50">
                    {userList.map((u) => (
                      <tr key={u.id} className="hover:bg-[#C5D89D]/20 transition-colors">
                        <td className="py-3 px-3 font-bold text-[#364322]">
                          {u.name || "Unnamed User"}
                        </td>
                        <td className="py-3 px-3 text-[#5C6B44] font-mono">{u.email || "No email"}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === "admin"
                                ? "neu-badge-olive"
                                : u.role === "hr_manager"
                                ? "neu-badge-sage"
                                : "neu-badge"
                            }`}
                          >
                            {u.role === "hr_manager" ? "HR Manager" : u.role === "admin" ? "Admin" : "Employee"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5 bg-[#EADFB4]/40 p-1 rounded-xl shadow-[inset_2px_2px_4px_#D8D2BC]">
                            {(["employee", "hr_manager", "admin"] as const).map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => handleRoleChange(u.id, role)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                  u.role === role
                                    ? "bg-[#9CAB84] text-white shadow-[2px_2px_5px_#82916B]"
                                    : "text-[#5C6B44] hover:text-[#364322]"
                                }`}
                              >
                                {role === "hr_manager" ? "HR" : role.charAt(0).toUpperCase() + role.slice(1)}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Admin: Data Repair Tools */}
        {user?.role === "admin" && (
          <section className="neu-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-[#364322] border-b border-[#D8D2BC] pb-3">
              <Wrench className="h-5 w-5 text-[#89986D]" />
              <span>Data Repair & Sync Tools</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Re-link all users */}
              <div className="neu-card-flat p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#364322]">
                  <Link2 className="h-4 w-4 text-[#89986D]" />
                  Re-Link All Users → Employees
                </div>
                <p className="text-xs text-[#5C6B44] font-medium leading-relaxed">
                  Sweeps every user account and ensures their Clerk session is linked to an employee
                  profile. Run this after manually adding an employee via the HR UI to immediately fix
                  "not linked" errors without requiring a re-login.
                </p>
                <Button
                  onClick={() => relinkAllMutation.mutate()}
                  disabled={relinkAllMutation.isPending}
                  className="mt-2 neu-button-primary text-xs h-9 px-5 flex items-center gap-2"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${relinkAllMutation.isPending ? "animate-spin" : ""}`} />
                  {relinkAllMutation.isPending ? "Re-linking…" : "Run Re-Link Now"}
                </Button>
              </div>

              {/* Info panel */}
              <div className="neu-inset p-4 space-y-2">
                <p className="text-xs font-bold text-[#364322] uppercase tracking-wider">When to use these tools</p>
                <ul className="text-xs text-[#5C6B44] font-medium space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>User sees "not linked to employee profile" on dashboard</li>
                  <li>Check-in button is disabled even though HR added the employee</li>
                  <li>New Clerk sign-up doesn't appear in Workforce Directory</li>
                  <li>Employee code or job title looks malformed (e.g. all-lowercase, wrong initials)</li>
                </ul>
                <p className="text-[11px] text-[#89986D] font-semibold mt-2">
                  To fix a specific employee's code/title — use the Edit button on that row in{" "}
                  <a href="/employees" className="underline hover:text-[#364322]">Workforce Directory</a>.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Session Security Card */}
        <section className="neu-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[#364322]">
                <ShieldCheck className="h-4 w-4 text-[#89986D]" /> Session Security
              </div>
              <p className="mt-2 text-xs text-[#5C6B44] font-medium leading-relaxed">
                Your authentication session is backed by Clerk Security and tRPC context. Signing out
                will end your session and clear active cookies.
              </p>
            </div>
            <Button
              onClick={logout}
              className="shrink-0 neu-button-sage text-xs font-bold"
            >
              Sign Out Session
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#89986D]">{label}</p>
      <div className="mt-1 text-sm font-bold text-[#364322]">{value}</div>
    </div>
  );
}

function FaceIdEnrollmentSection({ user, refresh }: { user: any; refresh: () => Promise<any> }) {
  const [consentGiven, setConsentGiven] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const enrollMutation = trpc.auth.enrollFace.useMutation({
    onSuccess: async () => {
      toast.success("✓ Face ID enrolled successfully!");
      stopCamera();
      await refresh();
    },
    onError: (err) => toast.error(`Enrollment failed: ${err.message}`),
  });

  const deleteMutation = trpc.auth.deleteFace.useMutation({
    onSuccess: async () => {
      toast.success("Enrolled Face ID data deleted.");
      await refresh();
    },
    onError: (err) => toast.error(`Deletion failed: ${err.message}`),
  });

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err: any) {
      setCameraError("Camera access denied or device not found: " + (err?.message ?? "Unknown error"));
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

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => console.error("[Face ID] play error:", err));
    }
  }, [isCameraActive]);

  const handleEnrollCapture = async () => {
    if (!videoRef.current || !consentGiven) return;
    setIsProcessing(true);
    try {
      const { detectFaceDescriptor } = await import("@/lib/faceRecognition");
      const descriptor = await detectFaceDescriptor(videoRef.current);
      if (!descriptor) {
        toast.error("No face detected in video frame. Position your face clearly inside the camera box and try again.");
        setIsProcessing(false);
        return;
      }

      enrollMutation.mutate({ consent: true, descriptor });
    } catch (err: any) {
      toast.error(err?.message ?? "Face detection error.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isEnrolled = !!user?.faceConsentGiven || !!user?.faceDescriptor;

  return (
    <section className="neu-card p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8D2BC] pb-4">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-[#364322]">
            <ScanFace className="h-5 w-5 text-[#89986D]" />
            <span>Face ID & Biometric Verification</span>
          </div>
          <p className="text-xs text-[#5C6B44] mt-1 font-medium leading-relaxed">
            Enroll your facial features for instant webcam attendance verification.
          </p>
        </div>

        <Badge
          className={
            isEnrolled
              ? "neu-badge-sage text-xs font-bold shrink-0 self-start sm:self-center"
              : "neu-badge text-xs font-bold shrink-0 self-start sm:self-center text-[#89986D]"
          }
        >
          {isEnrolled ? "✓ Face ID Enrolled" : "Not Enrolled"}
        </Badge>
      </div>

      {/* Biometric Disclaimer & Privacy Shield */}
      <div className="rounded-2xl bg-[#EADFB4]/50 border border-[#D8D2BC] p-4 text-xs space-y-2 text-[#364322]">
        <div className="flex items-center gap-2 font-bold text-[#2C3917]">
          <ShieldCheck className="h-4 w-4 text-[#89986D]" />
          <span>Biometric Privacy & Consent Guarantee</span>
        </div>
        <p className="text-[#5C6B44] font-medium leading-relaxed text-[11px]">
          AttendAI converts your face image into a mathematical 128-dimensional descriptor vector in your browser.
          <strong className="text-[#364322]"> Raw photos are NEVER saved or sent to any server.</strong> You can revoke consent and delete your biometric data at any time below.
        </p>
      </div>

      {/* Existing Enrollment Status & Delete Option */}
      {isEnrolled ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 neu-inset p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#9CAB84] text-white shadow-[2px_2px_6px_#82916B]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold text-[#364322]">Face ID Profile Active</p>
              <p className="text-[11px] text-[#5C6B44] font-medium">
                You can now use the "👤 Face ID" tab on your attendance clocking station.
              </p>
            </div>
          </div>

          <Button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="neu-button text-xs font-bold text-[#D9534F] hover:bg-rose-50 px-4 h-9 shrink-0 flex items-center gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleteMutation.isPending ? "Deleting…" : "Delete Enrolled Face ID"}
          </Button>
        </div>
      ) : (
        /* Enrollment Flow */
        <div className="space-y-4 pt-2">
          {/* Step 1: Explicit Consent Checkbox */}
          <div className="flex items-start gap-3 neu-card-flat p-4">
            <Checkbox
              id="consent-checkbox"
              checked={consentGiven}
              onCheckedChange={(checked) => setConsentGiven(!!checked)}
              className="mt-0.5"
            />
            <label htmlFor="consent-checkbox" className="text-xs font-bold text-[#364322] cursor-pointer leading-snug">
              I explicitly consent to creating and storing a 128-dimensional mathematical descriptor of my facial features for attendance verification. I understand raw photos are not stored and I can delete this data at any time.
            </label>
          </div>

          {/* Step 2: Camera Activation & Capture Station */}
          {consentGiven && (
            <div className="space-y-3">
              {!isCameraActive ? (
                <Button
                  onClick={startCamera}
                  className="neu-button-primary text-xs font-bold h-10 px-5 flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" /> Start Webcam for Enrollment
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-2xl bg-[#364322] aspect-video max-w-md mx-auto flex items-center justify-center border-2 border-[#9CAB84]">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-[#9CAB84]/60 rounded-full m-8 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                        Center face in circle
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={handleEnrollCapture}
                      disabled={isProcessing || enrollMutation.isPending}
                      className="neu-button-primary text-xs font-bold h-10 px-6 flex items-center gap-2"
                    >
                      <ScanFace className={`h-4 w-4 ${isProcessing ? "animate-spin" : ""}`} />
                      {isProcessing ? "Extracting Face Descriptor…" : enrollMutation.isPending ? "Saving Enrollment…" : "Capture & Enroll Face ID"}
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="ghost"
                      className="text-xs font-bold text-[#5C6B44] hover:text-[#364322]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {cameraError && (
            <p className="text-xs font-bold text-[#D9534F] flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> {cameraError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

