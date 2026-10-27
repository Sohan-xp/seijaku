"use client";

import { usePathname } from "next/navigation";

import Footer from "@/src/components/Footer";
import Navbar from "@/src/components/Navbar";
import RouteTransitionObserver from "@/src/components/RouteTransitionObserver";
import CartDrawer from "@/src/components/shop/CartDrawer";
import { Gift } from "lucide-react";
import GiftLandingNavbar from "./LandingNavbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isLanding = pathname.startsWith("/gifts");

  if (isAdmin) {
    return <>{children}</>;
  }

  if (isLanding) {
    return (
      <>
        <RouteTransitionObserver />
        <div className="flex min-h-screen flex-col">
          <GiftLandingNavbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
        <CartDrawer />
      </>
    );
  }

  return (
    <>
      <RouteTransitionObserver />
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
      <CartDrawer />
    </>
  );
}
