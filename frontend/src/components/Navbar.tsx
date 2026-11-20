"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User, Heart, LogOut, Shield } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

import { canonicalShopRoutes } from "@/src/lib/shop-routes";
import { useCustomerAuth } from "@/src/lib/customer-auth";
import { useShopState } from "./shop/ShopStateProvider";

import HomeDiscoveryRail from "./HomeDiscoveryRail";
import MenuSlider from "./MenuSlider";
import SearchOverlay from "./SearchOverlay";

export default function Navbar() {
  const pathname = usePathname();
  const { customer, isAuthenticated, logout } = useCustomerAuth();
  const { collection, cartCount, openCart } = useShopState();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isHome = pathname === "/";
  const isBuildGift = pathname === "/build-gift" || pathname?.startsWith("/build-gift");

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <header className="fixed top-0 z-50 w-full">
        <div className="brand-surface border-b border-white/8">
          <div className="mx-auto grid h-[72px] w-full max-w-[1480px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 sm:h-[76px] sm:px-8 md:px-10 lg:px-14 xl:px-[72px]">
            <div className="flex items-center justify-start pl-1 text-[#e0c98a] sm:pl-2 lg:pl-0">
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={isMenuOpen}
                aria-controls="seijaku-drawer"
                onClick={() => setIsMenuOpen(true)}
                className="opacity-90 transition-opacity duration-200 hover:opacity-100"
              >
                <Menu size={18} strokeWidth={1.9} className="sm:h-5 sm:w-5" />
              </button>
            </div>

            {isBuildGift ? (
              <span className="inline-flex items-center justify-center cursor-default">
                <Image
                  src="/images/seijaku-emblem-g.png"
                  alt="Seijaku emblem"
                  width={48}
                  height={48}
                  className="h-auto w-[40px] sm:w-[44px] md:w-[48px]"
                  priority
                />
              </span>
            ) : (
              <Link href="/" aria-label="Go to home page" className="inline-flex items-center justify-center">
                <Image
                  src="/images/seijaku-emblem-g.png"
                  alt="Seijaku emblem"
                  width={48}
                  height={48}
                  className="h-auto w-[40px] sm:w-[44px] md:w-[48px]"
                  priority
                />
              </Link>
            )}

            <div className="flex items-center justify-end gap-3.5 pr-1 text-[#e0c98a] sm:gap-5 sm:pr-2 lg:pr-0">
              <button
                type="button"
                aria-label="Search"
                onClick={() => setIsSearchOpen(true)}
                className="opacity-90 transition-opacity duration-200 hover:opacity-100"
              >
                <Search size={18} strokeWidth={1.9} className="sm:h-5 sm:w-5" />
              </button>

              {/* Wishlist Link with Live Badge */}
              <Link
                href={canonicalShopRoutes.collection}
                aria-label="Wishlist and Saved Items"
                className="relative inline-flex opacity-90 transition-opacity duration-200 hover:opacity-100"
              >
                <Heart size={18} strokeWidth={1.9} className="sm:h-5 sm:w-5" />
                {collection.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#9a785d] px-1 text-[9px] font-bold text-[#fcfaf6] shadow-sm">
                    {collection.length}
                  </span>
                )}
              </Link>

              {/* Customer Account / Sign In */}
              <div className="relative" ref={userMenuRef}>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    aria-label="User account menu"
                    className="relative flex items-center gap-1 opacity-90 transition-opacity duration-200 hover:opacity-100"
                  >
                    <User size={18} strokeWidth={1.9} className="sm:h-5 sm:w-5 text-[#e0c98a]" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#1b1c1a]" />
                  </button>
                ) : (
                  <Link
                    href={`/auth?redirect=${encodeURIComponent(pathname)}`}
                    aria-label="Sign in"
                    className="inline-flex opacity-90 transition-opacity duration-200 hover:opacity-100"
                  >
                    <User size={18} strokeWidth={1.9} className="sm:h-5 sm:w-5" />
                  </Link>
                )}

                {/* Dropdown Menu when signed in */}
                {isAuthenticated && isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-56 rounded-2xl border border-[rgba(111,100,86,0.22)] bg-[#1d1f1c] p-2 text-left shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-md">
                    <div className="border-b border-white/10 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#b89e6c]">Signed in</p>
                      <p className="truncate text-xs font-medium text-[#f4efe8]">
                        {customer?.name || customer?.email}
                      </p>
                    </div>

                    <div className="mt-1 space-y-0.5 py-1">
                      <Link
                        href="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-[#dcd7cb] transition hover:bg-white/10 hover:text-white"
                      >
                        <User size={14} />
                        <span>My Sanctuary</span>
                      </Link>
                      <Link
                        href="/collection"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-[#dcd7cb] transition hover:bg-white/10 hover:text-white"
                      >
                        <div className="flex items-center gap-2.5">
                          <Heart size={14} />
                          <span>Wishlist</span>
                        </div>
                        {collection.length > 0 && (
                          <span className="rounded-full bg-[#9a785d]/40 px-2 py-0.5 text-[10px] font-semibold text-[#f4efe8]">
                            {collection.length}
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/admin/login"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-[#a49f93] transition hover:bg-white/10 hover:text-[#dcd7cb]"
                      >
                        <Shield size={14} />
                        <span>Admin Portal</span>
                      </Link>
                    </div>

                    <div className="border-t border-white/10 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-500/20"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Shopping Bag Button with Live Cart Drawer & Badge */}
              <button
                type="button"
                onClick={openCart}
                aria-label="Open shopping cart"
                className="relative inline-flex opacity-90 transition-opacity duration-200 hover:opacity-100"
              >
                <ShoppingBag size={18} strokeWidth={1.9} className="sm:h-5 sm:w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2e4a36] px-1 text-[9px] font-bold text-[#fcfaf6] shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {isHome && <HomeDiscoveryRail />}
      </header>

      <MenuSlider isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <SearchOverlay open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
