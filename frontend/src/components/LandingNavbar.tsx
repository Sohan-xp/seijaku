"use client";

import Image from "next/image";
import Link from "next/link";
import {
    Heart,
    LogOut,
    Menu,
    Search,
    Shield,
    ShoppingBag,
    User,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
    useEffect,
    useRef,
    useState,
} from "react";

import { canonicalShopRoutes } from "@/src/lib/shop-routes";
import { useCustomerAuth } from "@/src/lib/customer-auth";
import { useShopState } from "@/src/components/shop/ShopStateProvider";

import MenuSlider from "@/src/components/MenuSlider";
import SearchOverlay from "@/src/components/SearchOverlay";

const SCROLL_STOP_DELAY = 300;

const NAV_LINKS = [
    {
        label: "Shop",
        href: "/shop",
    },
    {
        label: "Gift Box",
        href: "/build-gift",
    },
    {
        label: "Our Story",
        href: "/our-story",
    },
    {
        label: "The Craft",
        href: "/the-craft",
    },
] as const;

export default function GiftLandingNavbar() {
    const pathname = usePathname();

    const {
        customer,
        isAuthenticated,
        logout,
    } = useCustomerAuth();

    const {
        collection,
        cartCount,
        openCart,
    } = useShopState();

    const [isVisible, setIsVisible] = useState(true);

    const [isAtTop, setIsAtTop] = useState(true);

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const userMenuRef = useRef<HTMLDivElement>(null);

    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    const keepNavbarVisible =
        isMenuOpen ||
        isSearchOpen ||
        isUserMenuOpen;

    /*
     * Hide navbar while scrolling.
     *
     * When scrolling stops:
     * navbar smoothly drops back from the top.
     *
     * At the top of the page:
     * navbar always stays visible.
     */
    useEffect(() => {
        function clearScrollTimer() {
            if (!scrollTimerRef.current) {
                return;
            }

            clearTimeout(
                scrollTimerRef.current,
            );

            scrollTimerRef.current = null;
        }

        function handleScroll() {
            clearScrollTimer();

            const atTop =
                window.scrollY <= 8;

            setIsAtTop(atTop);

            /*
             * Always show at the top or while
             * menu/search/account is open.
             */
            if (
                atTop ||
                keepNavbarVisible
            ) {
                setIsVisible(true);
                return;
            }

            /*
             * Hide immediately during scroll.
             */
            setIsVisible(false);

            /*
             * Show after scrolling stops.
             */
            scrollTimerRef.current =
                setTimeout(() => {
                    setIsVisible(true);
                }, SCROLL_STOP_DELAY);
        }

        /*
         * Correct initial state in case
         * browser restores a scroll position.
         */
        handleScroll();

        window.addEventListener(
            "scroll",
            handleScroll,
            {
                passive: true,
            },
        );

        return () => {
            window.removeEventListener(
                "scroll",
                handleScroll,
            );

            clearScrollTimer();
        };
    }, [keepNavbarVisible]);

    /*
     * Never hide navbar while one of its
     * interactive overlays is open.
     */
    useEffect(() => {
        if (keepNavbarVisible) {
            setIsVisible(true);
        }
    }, [keepNavbarVisible]);

    /*
     * Close account dropdown when clicking
     * outside or pressing Escape.
     */
    useEffect(() => {
        function handleClickOutside(
            event: MouseEvent,
        ) {
            if (
                userMenuRef.current &&
                !userMenuRef.current.contains(
                    event.target as Node,
                )
            ) {
                setIsUserMenuOpen(false);
            }
        }

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (event.key === "Escape") {
                setIsUserMenuOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleClickOutside,
        );

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside,
            );

            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, []);

    function openMenu() {
        setIsVisible(true);
        setIsUserMenuOpen(false);
        setIsMenuOpen(true);
    }

    function openSearch() {
        setIsVisible(true);
        setIsUserMenuOpen(false);
        setIsSearchOpen(true);
    }

    function toggleUserMenu() {
        setIsVisible(true);

        setIsUserMenuOpen(
            (current) => !current,
        );
    }

    function handleLogout() {
        logout();
        setIsUserMenuOpen(false);
    }

    return (
        <>
            <header
                className={`
                    fixed left-0 top-0 z-50 w-full
                    transform-gpu
                    will-change-transform
                    transition-transform
                    duration-700
                    ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${isVisible
                        ? "pointer-events-auto translate-y-0"
                        : "pointer-events-none -translate-y-[110px]"
                    }
                `}
            >
                {/* Navbar Surface */}
                <div
                    className={`
                        border-b
                        transition-[background-color,border-color,box-shadow,backdrop-filter]
                        duration-500
                        ease-[cubic-bezier(0.22,1,0.36,1)]
                        ${isAtTop
                            ? "border-transparent bg-transparent shadow-none"
                            : "border-[#5b4c3f]/10 bg-[#f7efe5] shadow-[0_8px_30px_rgba(63,48,35,0.06)]"
                        }
                    `}
                >
                    <div
                        className="
                            mx-auto
                            flex
                            h-[76px]
                            w-full
                            max-w-[1480px]
                            items-center
                            px-5
                            sm:h-[82px]
                            sm:px-8
                            md:px-10
                            lg:px-14
                            xl:px-[72px]
                        "
                    >
                        {/* Mobile Menu */}
                        <div
                            className="
                                flex
                                min-w-0
                                flex-1
                                items-center
                                lg:hidden
                            "
                        >
                            <button
                                type="button"
                                aria-label="Open menu"
                                aria-expanded={
                                    isMenuOpen
                                }
                                aria-controls="seijaku-drawer"
                                onClick={openMenu}
                                className="
                                    inline-flex
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-full
                                    text-[#55483d]
                                    transition-colors
                                    duration-200
                                    hover:bg-[#6a5848]/8
                                    focus-visible:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-[#8c7b68]/50
                                "
                            >
                                <Menu
                                    size={20}
                                    strokeWidth={1.6}
                                />
                            </button>
                        </div>

                        {/* Brand */}
                        <Link
                            href="/"
                            aria-label="Go to home page"
                            className="
                                flex
                                shrink-0
                                items-center
                                gap-2
                                text-[#4b3b31]
                            "
                        >
                            <Image
                                src="/images/seijaku-emblem-g.png"
                                alt=""
                                width={50}
                                height={50}
                                priority
                                className="
                                    object-contain
                                "
                            />

                            <span
                                className="
                                    font-serif
                                    text-[18px]
                                    tracking-[0.34em]
                                    sm:text-[20px]
                                "
                            >
                                SEIJAKU
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        {/* <nav
                            aria-label="Primary navigation"
                            className="
                                mx-auto
                                hidden
                                items-center
                                gap-8
                                lg:flex
                                xl:gap-10
                            "
                        >
                            {NAV_LINKS.map(
                                (link) => {
                                    const active =
                                        pathname ===
                                        link.href;

                                    return (
                                        <Link
                                            key={
                                                link.href
                                            }
                                            href={
                                                link.href
                                            }
                                            aria-current={
                                                active
                                                    ? "page"
                                                    : undefined
                                            }
                                            className={`
                                                relative
                                                py-2
                                                font-serif
                                                text-[14px]
                                                transition-colors
                                                duration-200
                                                ${active
                                                    ? "text-[#273a2b]"
                                                    : "text-[#5b5047] hover:text-[#273a2b]"
                                                }
                                            `}
                                        >
                                            {
                                                link.label
                                            }

                                            {active && (
                                                <span
                                                    className="
                                                        absolute
                                                        inset-x-0
                                                        -bottom-1
                                                        mx-auto
                                                        h-px
                                                        w-5
                                                        bg-[#273a2b]/60
                                                    "
                                                />
                                            )}
                                        </Link>
                                    );
                                },
                            )}
                        </nav> */}

                        {/* Right Actions */}
                        <div
                            className="
                                ml-auto
                                flex
                                min-w-0
                                flex-1
                                items-center
                                justify-end
                                gap-1
                                text-[#55483d]
                                lg:flex-none
                            "
                        >
                            {/* Search */}
                            <button
                                type="button"
                                aria-label="Search"
                                onClick={openSearch}
                                className="
                                    inline-flex
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-full
                                    transition-colors
                                    duration-200
                                    hover:bg-[#6a5848]/8
                                    focus-visible:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-[#8c7b68]/50
                                "
                            >
                                <Search
                                    size={19}
                                    strokeWidth={1.6}
                                />
                            </button>

                            {/* Wishlist */}
                            <Link
                                href={
                                    canonicalShopRoutes.collection
                                }
                                aria-label="Wishlist and Saved Items"
                                className="
                                    relative
                                    hidden
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-full
                                    transition-colors
                                    duration-200
                                    hover:bg-[#6a5848]/8
                                    focus-visible:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-[#8c7b68]/50
                                    sm:inline-flex
                                "
                            >
                                <Heart
                                    size={19}
                                    strokeWidth={1.6}
                                />

                                {collection.length >
                                    0 && (
                                        <span
                                            className="
                                            absolute
                                            right-0
                                            top-0
                                            flex
                                            h-4
                                            min-w-4
                                            items-center
                                            justify-center
                                            rounded-full
                                            bg-[#9a785d]
                                            px-1
                                            text-[9px]
                                            font-bold
                                            leading-none
                                            text-white
                                            shadow-sm
                                        "
                                        >
                                            {
                                                collection.length
                                            }
                                        </span>
                                    )}
                            </Link>

                            {/* Account */}
                            <div
                                ref={userMenuRef}
                                className="relative"
                            >
                                {isAuthenticated ? (
                                    <button
                                        type="button"
                                        aria-label="User account menu"
                                        aria-expanded={
                                            isUserMenuOpen
                                        }
                                        onClick={
                                            toggleUserMenu
                                        }
                                        className="
                                            relative
                                            inline-flex
                                            h-9
                                            w-9
                                            items-center
                                            justify-center
                                            rounded-full
                                            transition-colors
                                            duration-200
                                            hover:bg-[#6a5848]/8
                                            focus-visible:outline-none
                                            focus-visible:ring-2
                                            focus-visible:ring-[#8c7b68]/50
                                        "
                                    >
                                        <User
                                            size={19}
                                            strokeWidth={
                                                1.6
                                            }
                                        />

                                        <span
                                            className="
                                                absolute
                                                bottom-[5px]
                                                right-[5px]
                                                h-2
                                                w-2
                                                rounded-full
                                                bg-emerald-500
                                                ring-2
                                                ring-[#f7efe5]
                                            "
                                        />
                                    </button>
                                ) : (
                                    <Link
                                        href={`/auth?redirect=${encodeURIComponent(
                                            pathname,
                                        )}`}
                                        aria-label="Sign in"
                                        className="
                                            inline-flex
                                            h-9
                                            w-9
                                            items-center
                                            justify-center
                                            rounded-full
                                            transition-colors
                                            duration-200
                                            hover:bg-[#6a5848]/8
                                            focus-visible:outline-none
                                            focus-visible:ring-2
                                            focus-visible:ring-[#8c7b68]/50
                                        "
                                    >
                                        <User
                                            size={19}
                                            strokeWidth={
                                                1.6
                                            }
                                        />
                                    </Link>
                                )}

                                {/* Account Dropdown */}
                                {isAuthenticated &&
                                    isUserMenuOpen && (
                                        <div
                                            className="
                                                absolute
                                                right-0
                                                top-full
                                                mt-3
                                                w-60
                                                overflow-hidden
                                                rounded-2xl
                                                border
                                                border-[#7a6858]/15
                                                bg-[#fffaf3]/98
                                                p-2
                                                text-left
                                                shadow-[0_18px_50px_rgba(63,48,35,0.14)]
                                                backdrop-blur-xl
                                            "
                                        >
                                            <div
                                                className="
                                                    border-b
                                                    border-[#7a6858]/10
                                                    px-3
                                                    py-2.5
                                                "
                                            >
                                                <p
                                                    className="
                                                        text-[9px]
                                                        uppercase
                                                        tracking-[0.2em]
                                                        text-[#927b67]
                                                    "
                                                >
                                                    Signed
                                                    in
                                                </p>

                                                <p
                                                    className="
                                                        mt-1
                                                        truncate
                                                        text-xs
                                                        font-medium
                                                        text-[#352d27]
                                                    "
                                                >
                                                    {customer?.name ||
                                                        customer?.email}
                                                </p>
                                            </div>

                                            <div
                                                className="
                                                    mt-1
                                                    space-y-0.5
                                                    py-1
                                                "
                                            >
                                                {/* Account */}
                                                <Link
                                                    href="/account"
                                                    onClick={() =>
                                                        setIsUserMenuOpen(
                                                            false,
                                                        )
                                                    }
                                                    className="
                                                        flex
                                                        w-full
                                                        items-center
                                                        gap-2.5
                                                        rounded-xl
                                                        px-3
                                                        py-2.5
                                                        text-xs
                                                        text-[#564b42]
                                                        transition
                                                        hover:bg-[#6a5848]/7
                                                        hover:text-[#26382b]
                                                    "
                                                >
                                                    <User
                                                        size={
                                                            14
                                                        }
                                                    />

                                                    <span>
                                                        My
                                                        Sanctuary
                                                    </span>
                                                </Link>

                                                {/* Wishlist */}
                                                <Link
                                                    href={
                                                        canonicalShopRoutes.collection
                                                    }
                                                    onClick={() =>
                                                        setIsUserMenuOpen(
                                                            false,
                                                        )
                                                    }
                                                    className="
                                                        flex
                                                        w-full
                                                        items-center
                                                        justify-between
                                                        rounded-xl
                                                        px-3
                                                        py-2.5
                                                        text-xs
                                                        text-[#564b42]
                                                        transition
                                                        hover:bg-[#6a5848]/7
                                                        hover:text-[#26382b]
                                                    "
                                                >
                                                    <span
                                                        className="
                                                            flex
                                                            items-center
                                                            gap-2.5
                                                        "
                                                    >
                                                        <Heart
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        <span>
                                                            Wishlist
                                                        </span>
                                                    </span>

                                                    {collection.length >
                                                        0 && (
                                                            <span
                                                                className="
                                                                rounded-full
                                                                bg-[#9a785d]/12
                                                                px-2
                                                                py-0.5
                                                                text-[10px]
                                                                font-semibold
                                                                text-[#806550]
                                                            "
                                                            >
                                                                {
                                                                    collection.length
                                                                }
                                                            </span>
                                                        )}
                                                </Link>

                                                {/* Admin */}
                                                <Link
                                                    href="/admin/login"
                                                    onClick={() =>
                                                        setIsUserMenuOpen(
                                                            false,
                                                        )
                                                    }
                                                    className="
                                                        flex
                                                        w-full
                                                        items-center
                                                        gap-2.5
                                                        rounded-xl
                                                        px-3
                                                        py-2.5
                                                        text-xs
                                                        text-[#84766a]
                                                        transition
                                                        hover:bg-[#6a5848]/7
                                                        hover:text-[#564b42]
                                                    "
                                                >
                                                    <Shield
                                                        size={
                                                            14
                                                        }
                                                    />

                                                    <span>
                                                        Admin
                                                        Portal
                                                    </span>
                                                </Link>
                                            </div>

                                            {/* Logout */}
                                            <div
                                                className="
                                                    border-t
                                                    border-[#7a6858]/10
                                                    pt-1
                                                "
                                            >
                                                <button
                                                    type="button"
                                                    onClick={
                                                        handleLogout
                                                    }
                                                    className="
                                                        flex
                                                        w-full
                                                        items-center
                                                        gap-2.5
                                                        rounded-xl
                                                        px-3
                                                        py-2.5
                                                        text-xs
                                                        text-[#9b514b]
                                                        transition
                                                        hover:bg-[#9b514b]/8
                                                    "
                                                >
                                                    <LogOut
                                                        size={
                                                            14
                                                        }
                                                    />

                                                    <span>
                                                        Sign
                                                        Out
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                            </div>

                            {/* Cart */}
                            <button
                                type="button"
                                onClick={openCart}
                                aria-label="Open shopping cart"
                                className="
                                    relative
                                    inline-flex
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-full
                                    transition-colors
                                    duration-200
                                    hover:bg-[#6a5848]/8
                                    focus-visible:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-[#8c7b68]/50
                                "
                            >
                                <ShoppingBag
                                    size={20}
                                    strokeWidth={1.6}
                                />

                                {cartCount > 0 && (
                                    <span
                                        className="
                                            absolute
                                            right-0
                                            top-0
                                            flex
                                            h-4
                                            min-w-4
                                            items-center
                                            justify-center
                                            rounded-full
                                            bg-[#2e4a36]
                                            px-1
                                            text-[9px]
                                            font-bold
                                            leading-none
                                            text-white
                                            shadow-sm
                                        "
                                    >
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile / Main Menu */}
            <MenuSlider
                isOpen={isMenuOpen}
                onClose={() =>
                    setIsMenuOpen(false)
                }
            />

            {/* Search */}
            <SearchOverlay
                open={isSearchOpen}
                onClose={() =>
                    setIsSearchOpen(false)
                }
            />
        </>
    );
}