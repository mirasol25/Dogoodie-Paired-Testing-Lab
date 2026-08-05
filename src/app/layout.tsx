import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

export const metadata: Metadata = {
  title: { default: "DoGoodie Paired Testing Lab", template: "%s · DoGoodie Paired Testing Lab" },
  description: "Synthetic legal-tech paired pricing study preparation prototype.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground focus:translate-y-0">
          Skip to content
        </a>
        <TooltipProvider delayDuration={250}>
          {children}
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}

