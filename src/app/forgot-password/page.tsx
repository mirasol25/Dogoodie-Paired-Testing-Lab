import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return <main id="main-content" className="grid min-h-screen place-items-center px-4 py-10"><div className="w-full max-w-md"><div className="mb-6 flex items-center justify-center gap-3"><span className="grid size-11 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><KeyRound className="size-6" strokeWidth={1.8} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">DoGoodie</p><p className="text-base font-semibold">Paired Testing Lab</p></div></div><Card className="border-border/90 bg-card/95 shadow-2xl shadow-black/20"><CardHeader><p className="label-kicker">Account recovery</p><CardTitle className="text-2xl">Reset your password</CardTitle><CardDescription>Enter your account email and we will send a secure reset link.</CardDescription></CardHeader><CardContent><ForgotPasswordForm /></CardContent></Card></div></main>;
}
