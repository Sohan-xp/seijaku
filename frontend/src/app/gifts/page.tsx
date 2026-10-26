"use client";

import React from "react";
import { useRouter } from "next/navigation";

const HERO_IMAGE: string = "images/Landing Pg Banner 1 image_Seijaku Diwali Gift Set in Warm Light.png";
const ICON_CURATED: string = "/images/Leaf Icon.png";
const ICON_CUSTOM: string = "/images/Gift Box Icon.png";
const ICON_GIFTING: string = "/images/Lotus Icon.png";
interface Feature {
    icon: string;
    label: string[];
}

const features: Feature[] = [
    { icon: ICON_CURATED, label: ["Thoughtfully", "Curated"] },
    { icon: ICON_CUSTOM, label: ["Customisable"] },
    { icon: ICON_GIFTING, label: ["Made for", "Meaningful Gifting"] },
];

const sideLinks: string[] = ["Cloth", "Scent", "Craft", "Ritual"];

const imageMask: React.CSSProperties = {
    WebkitMaskImage:
        "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 14%, #000 32%)",
    maskImage:
        "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 14%, #000 32%)",
};

const RITUAL_1_IMAGE: string = "/images/The Little Seijaku display image_Bengal Monsoon Attar Still Life.png";
const RITUAL_2_IMAGE: string = "/images/The Festive Ritual Box display image_Seijaku Luxury Gift Set Still Life.png";
const RITUAL_3_IMAGE: string = "/images/The Seijaku Home Rituall display image_Chai diffuser ritual.png";

const ICON_POCKET_SQUARE: string = "images/Festive Rituals Icon-1.png";
const ICON_GIFT_BOX: string = "/images/Festive Rituals Icon-5.png";
const ICON_PERFUME: string = "/images/Festive Rituals Icon-4.png";
const ICON_SCARF: string = "/images/Festive Rituals Icon-6.png";
const ICON_DIFFUSER: string = "/images/Festive Rituals Icon-2.png";
const ICON_OILS: string = "/images/Festive Rituals Icon-3.png";

const STORY_IMAGE: string = "/images/Landing Page Banner 2 img_Seijaku Breath of Pines Still Life.png";

const ICON_ARTISANAL: string = "/images/Leaf Icon.png";
const ICON_PACKAGED: string = "/images/Gift Box Icon.png";
const ICON_INDIA: string = "/images/India Icon.png";
const ICON_MEANING: string = "/images/Heart.png";


const CTA_IMAGE: string = "/images/Green CTA Banner.png";
const ICON_FLOWER: string = "/images/Flower Icon.png";



interface Trust {
    icon: string;
    title: string;
    text: string;
}

const trustItems: Trust[] = [
    { icon: ICON_ARTISANAL, title: "Artisanal & Ethical", text: "Rooted in craft traditions" },
    { icon: ICON_PACKAGED, title: "Beautifully Packaged", text: "Festive-ready, always" },
    { icon: ICON_INDIA, title: "Made in India", text: "By skilled artisans" },
    { icon: ICON_MEANING, title: "Gifts with Meaning", text: "More than just a product" },
];

interface RitualItem {
    icon: string;
    text: string;
}

interface Ritual {
    id: string;
    image: string;
    title: string;
    subtitle: string;
    href: string;
    items: RitualItem[];
}

const rituals: Ritual[] = [
    {
        id: "little-gift",
        image: RITUAL_1_IMAGE,
        title: "The Little Seijaku Gift",
        subtitle: "A thoughtful beginning",
        href: "#build-little-gift",
        items: [
            { icon: ICON_DIFFUSER, text: "Choose 1 Pocket Square" },
            { icon: ICON_SCARF, text: "Choose 1 Dokra Brooch" },
            { icon: ICON_PERFUME, text: "Choose 1 Perfume Oil" },
        ],
    },
    {
        id: "festive-box",
        image: RITUAL_2_IMAGE,
        title: "The Festive Ritual Box",
        subtitle: "Our signature gifting experience",
        href: "#build-festive-box",
        items: [
            { icon: ICON_DIFFUSER, text: "Choose 1 Scarf" },
            { icon: ICON_SCARF, text: "Choose 1 Dokra Brooch" },
            { icon: ICON_PERFUME, text: "Choose 1 Perfume Oil / Fragrance" },
            { icon: ICON_GIFT_BOX, text: "Festive Gift Packaging" },
        ],
    },
    {
        id: "home-ritual",
        image: RITUAL_3_IMAGE,
        title: "The Seijaku Home Ritual",
        subtitle: "For calmer, more beautiful spaces",
        href: "#build-home-ritual",
        items: [
            { icon: ICON_OILS, text: "Choose 1 Diffuser" },
            { icon: ICON_PERFUME, text: "Choose 2 Fragrance Oils" },
            { icon: ICON_GIFT_BOX, text: "Choose 1 additional ritual product", },
            { icon: ICON_GIFT_BOX, text: "Festive Gift Packaging" },
        ],
    },
];

const LandingPage = () => {
    const router = useRouter();

    const handleRedirectToBuildGift = () => {
        router.push("/build-gift");
    };

    return (
        <>
            <section
                className="relative flex w-full flex-col overflow-hidden bg-[#FBF2E8] text-[#2A1D1B] lg:block lg:min-h-[clamp(560px,36vw,780px)]"
                style={{
                    fontFamily:
                        "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
                }}
            >
                <div className="relative z-10 flex flex-col px-5 pb-6 pt-10 sm:px-10 sm:pt-12 md:px-14 lg:min-h-[inherit] lg:justify-between lg:px-[5vw] lg:pb-10 lg:pt-[clamp(40px,4vw,80px)] 2xl:px-[6vw]">
                    <div className="max-w-[560px] lg:max-w-[min(46%,640px)] mt-20">
                        <p className="font-sans text-[10px] font-medium uppercase tracking-[0.17em] text-[#6E4B40] sm:text-[11px] 2xl:text-[13px]">
                            Festive rituals, for meaningful people
                        </p>

                        <h1 className="mt-4 text-[34px] font-medium leading-[1.12] tracking-[-0.005em] text-[#2A1D1B] sm:mt-5 sm:text-[44px] lg:text-[clamp(40px,3.1vw,64px)]">
                            This Festive Season,
                            <br />
                            Don’t Just Pick a Gift.
                            <br />
                            <em className="font-medium italic text-[#4A1426]">
                                Build One.
                            </em>
                        </h1>

                        <p className="mt-5 max-w-[440px] text-[16px] leading-[1.5] text-[#3A2B28] sm:mt-6 sm:text-[18px] lg:max-w-[min(100%,420px)] lg:text-[clamp(17px,1.15vw,22px)] 2xl:max-w-[500px]">
                            Choose the objects, scent and design that feel right
                            for the person you’re gifting. We bring them
                            together into one thoughtful Seijaku experience.
                        </p>

                        <a
                            // onClick={handleRedirectToBuildGift}
                            href="#build-gift-listing"
                            className="cursor-pointer mt-8 inline-flex h-[46px] w-full items-center justify-center gap-2 bg-[#2B3B2F] font-sans text-[12px] font-medium uppercase tracking-[0.16em] text-[#F6EEE4] transition-colors hover:bg-[#1F2C23] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B3B2F] sm:mt-9 sm:h-[44px] sm:w-[240px] lg:h-[clamp(44px,2.6vw,56px)] lg:w-[clamp(232px,15vw,300px)] lg:text-[clamp(12px,0.75vw,14px)]"
                        >
                            Build your gift
                            <span aria-hidden="true">→</span>
                        </a>
                    </div>

                    {/* Feature icons */}
                    <ul className="mt-10 flex max-w-[460px] items-start justify-between sm:max-w-none sm:justify-start sm:gap-14 lg:mt-8 lg:gap-[clamp(36px,3vw,64px)]">
                        {features.map(({ icon, label }) => (
                            <li
                                key={label.join(" ")}
                                className="flex flex-col items-center text-center"
                            >
                                <img
                                    src={icon}
                                    alt=""
                                    className="h-[28px] w-[28px] object-contain sm:h-[32px] sm:w-[32px] 2xl:h-[40px] 2xl:w-[40px]"
                                />
                                <span className="mt-2 text-[13px] leading-[1.25] text-[#3A2B28] sm:text-[15px] 2xl:text-[17px]">
                                    {label.map((line, i) => (
                                        <React.Fragment key={line}>
                                            {line}
                                            {i < label.length - 1 && <br />}
                                        </React.Fragment>
                                    ))}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ---------- Image (below content on mobile/tablet, right side on desktop) ---------- */}
                <div className="relative -mt-4 sm:-mt-8 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:w-[62%]">
                    <img
                        src={HERO_IMAGE}
                        alt="Seijaku gift box with silk scarf, scent and brass fan"
                        className="block h-[340px] w-full object-cover object-right [-webkit-mask-image:linear-gradient(to_bottom,transparent,rgba(0,0,0,0.6)_14%,#000_32%)] [mask-image:linear-gradient(to_bottom,transparent,rgba(0,0,0,0.6)_14%,#000_32%)] sm:h-auto lg:h-full lg:[-webkit-mask-image:linear-gradient(to_right,transparent,rgba(0,0,0,0.55)_14%,#000_32%)] lg:[mask-image:linear-gradient(to_right,transparent,rgba(0,0,0,0.55)_14%,#000_32%)]"
                    />

                    {/* Category links: pill on mobile/tablet, vertical panel on desktop */}
                    <ul className="absolute inset-x-4 bottom-4 mx-auto flex w-fit items-center gap-5 bg-[#F8EDE2]/80 px-5 py-2.5 backdrop-blur-[2px] sm:gap-8 sm:px-8 lg:inset-x-auto lg:bottom-auto lg:right-0 lg:top-[clamp(24px,2vw,40px)] lg:mx-0 lg:block lg:w-auto lg:bg-[#F8EDE2]/70 lg:py-5 lg:pl-9 lg:pr-8 2xl:pl-12 2xl:pr-10 mt-20">
                        {sideLinks.map((item) => (
                            <li
                                key={item}
                                className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-[#3B2A27] lg:py-[7px] lg:text-right lg:text-[12px] 2xl:py-[10px] 2xl:text-[14px]"
                            >
                                <a href={`#${item.toLowerCase()}`}>{item}</a>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section
                className="w-full bg-[#F7EFE5] px-5 py-12 text-[#2A1D1B] sm:px-8 sm:py-14 lg:px-[4vw] lg:py-[clamp(56px,5vw,96px)]"
                style={{
                    fontFamily:
                        "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
                }}
                id="build-gift-listing"
            >
                <div className="mx-auto w-full max-w-[1100px] 2xl:max-w-[1400px]">
                    {/* ---------- Heading ---------- */}
                    <header className="text-center">
                        <div className="flex items-center justify-center gap-3 sm:gap-4">
                            <span
                                className="h-px w-[clamp(20px,8vw,140px)] bg-[#D8C8B7]"
                                aria-hidden="true"
                            />
                            <p className="font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-[#4A352F] sm:text-[11px] 2xl:text-[13px]">
                                The Seijaku Festive Rituals
                            </p>
                            <span
                                className="h-px w-[clamp(20px,8vw,140px)] bg-[#D8C8B7]"
                                aria-hidden="true"
                            />
                        </div>

                        <h2 className="mx-auto mt-4 max-w-[640px] text-[26px] font-normal leading-[1.2] text-[#2A1D1B] sm:text-[32px] lg:max-w-none lg:text-[clamp(30px,2.3vw,46px)]">
                            Three ways to gift. Endless ways to make it
                            personal.
                        </h2>
                    </header>

                    {/* ---------- Cards ---------- */}
                    <ul className="mx-auto mt-8 grid grid-cols-1 gap-6 sm:mt-10 md:grid-cols-3 md:gap-4 lg:mt-[clamp(32px,2.6vw,56px)] lg:gap-[clamp(20px,2vw,40px)]">
                        {rituals.map((ritual) => (
                            <li
                                key={ritual.id}
                                className="mx-auto flex w-full max-w-[440px] flex-col border border-[#E3D4C4] bg-[#FAF4EC] md:max-w-none"
                            >
                                <img
                                    src={ritual.image}
                                    alt={ritual.title}
                                    className="block aspect-[5/4] w-full object-cover"
                                />

                                <div className="flex flex-1 flex-col px-4 pb-5 pt-5 sm:px-5 lg:px-[clamp(16px,1.4vw,28px)] lg:pb-[clamp(20px,1.6vw,32px)] lg:pt-[clamp(18px,1.5vw,30px)]">
                                    <h3 className="text-[22px] font-normal leading-[1.2] text-[#2A1D1B] md:text-[19px] lg:text-[clamp(20px,1.45vw,28px)]">
                                        {ritual.title}
                                    </h3>
                                    <p className="mt-1 text-[16px] italic leading-[1.3] text-[#6B564E] md:text-[14px] lg:text-[clamp(15px,1.05vw,20px)]">
                                        {ritual.subtitle}
                                    </p>

                                    <ul className="mb-6 mt-5 space-y-3 lg:mt-[clamp(18px,1.5vw,30px)] lg:space-y-[clamp(10px,0.9vw,18px)]">
                                        {ritual.items.map((item) => (
                                            <li
                                                key={item.text}
                                                className="flex items-center gap-3 text-[16px] leading-[1.25] text-[#3A2B28] md:text-[14px] lg:text-[clamp(14px,1vw,19px)]"
                                            >
                                                <img
                                                    src={item.icon}
                                                    alt=""
                                                    className="h-[22px] w-[22px] shrink-0 object-contain lg:h-[clamp(22px,1.1vw,22px)] lg:w-[clamp(22px,1.1vw,22px)]"
                                                />
                                                <span>{item.text}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <a
                                        onClick={handleRedirectToBuildGift}
                                        className="cursor-pointer mt-auto inline-flex h-[46px] w-full items-center justify-center gap-2 bg-[#2B3B2F] font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-[#F6EEE4] transition-colors hover:bg-[#1F2C23] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B3B2F] lg:h-[clamp(44px,2.8vw,58px)] lg:text-[clamp(11px,0.75vw,14px)]"
                                    >
                                        Build this gift
                                        <span aria-hidden="true">→</span>
                                    </a>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section
                className="relative flex w-full flex-col overflow-hidden bg-[#EEE4D8] text-[#2A1D1B] lg:block lg:min-h-[clamp(320px,23vw,460px)]"
                style={{
                    fontFamily: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
                }}
            >
                <div className="relative z-10 px-5 pb-6 pt-10 sm:px-10 sm:pt-12 md:px-14 lg:flex lg:min-h-[inherit] lg:items-center lg:px-[5vw] lg:py-12 2xl:px-[6vw]">
                    <div className="max-w-[560px] lg:max-w-[min(46%,640px)]">
                        <h2 className="text-[30px] font-normal leading-[1.15] text-[#2A1D1B] sm:text-[38px] lg:text-[clamp(36px,3vw,60px)]">
                            More than objects.
                            <br />
                            A quieter way of gifting.
                        </h2>

                        <p className="mt-5 max-w-[480px] text-[16px] leading-[1.5] text-[#4A3A35] sm:text-[18px] lg:max-w-[min(100%,520px)] lg:text-[clamp(17px,1.2vw,23px)]">
                            Handcrafted in India. Inspired by Bengal and Japan. Made for
                            slower, more meaningful moments.
                        </p>
                    </div>
                </div>

                <div className="relative -mt-4 sm:-mt-8 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:w-[62%]">
                    <img
                        src={STORY_IMAGE}
                        alt="Handcrafted brass fan brooch resting on stone with white flowers"
                        className="block h-[260px] w-full object-cover object-right [-webkit-mask-image:linear-gradient(to_bottom,transparent,rgba(0,0,0,0.6)_14%,#000_32%)] [mask-image:linear-gradient(to_bottom,transparent,rgba(0,0,0,0.6)_14%,#000_32%)] sm:h-[340px] lg:h-full lg:[-webkit-mask-image:linear-gradient(to_right,transparent,rgba(0,0,0,0.55)_14%,#000_32%)] lg:[mask-image:linear-gradient(to_right,transparent,rgba(0,0,0,0.55)_14%,#000_32%)]"
                    />
                </div>
            </section>

            <section
                className="w-full bg-[#F7F1E8] px-5 py-10 text-[#2A1D1B] sm:px-8 sm:py-12 lg:px-[4vw] lg:py-[clamp(40px,3.4vw,72px)]"
                style={{
                    fontFamily: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
                }}
            >
                <ul className="mx-auto grid w-full max-w-[1100px] grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6 2xl:max-w-[1600px]">
                    {trustItems.map((item) => (
                        <li
                            key={item.title}
                            className="flex flex-col items-center text-center"
                        >
                            <img
                                src={item.icon}
                                alt=""
                                className="h-[44px] w-[44px] shrink-0 object-contain md:h-[48px] md:w-[48px] lg:h-[clamp(48px,3.4vw,72px)] lg:w-[clamp(48px,3.4vw,72px)]"
                            />
                            <h3 className="mt-4 text-[18px] font-medium leading-[1.2] text-[#2A1D1B] lg:mt-[clamp(14px,1vw,22px)] lg:text-[clamp(19px,1.35vw,28px)]">
                                {item.title}
                            </h3>
                            <p className="mt-1 text-[15px] leading-[1.3] text-[#6B564E] lg:text-[clamp(16px,1.15vw,23px)]">
                                {item.text}
                            </p>
                        </li>
                    ))}
                </ul>
            </section>


            <section
                className="relative isolate w-full overflow-hidden bg-[#2F3E31] px-5 py-12 text-center text-[#F6EEE4] sm:px-8 sm:py-14 lg:px-[4vw] lg:py-[clamp(48px,4vw,88px)]"
                style={{
                    fontFamily: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
                }}
            >
                <img
                    src={CTA_IMAGE}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
                />

                <div className="mx-auto flex w-full max-w-[720px] flex-col items-center 2xl:max-w-[900px]">
                    <img
                        src={ICON_FLOWER}
                        alt=""
                        className="h-[28px] w-[28px] object-contain sm:h-[32px] sm:w-[32px] lg:h-[clamp(32px,2.2vw,48px)] lg:w-[clamp(32px,2.2vw,48px)]"
                    />

                    <p className="mt-4 font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-[#D9A878] sm:text-[11px] lg:mt-[clamp(14px,1vw,22px)] lg:text-[clamp(11px,0.8vw,15px)]">
                        Festive season. A little more meaningful.
                    </p>

                    <h2 className="mt-3 text-[30px] font-normal leading-[1.15] text-[#F6EEE4] sm:text-[38px] lg:mt-[clamp(10px,0.8vw,18px)] lg:text-[clamp(36px,2.9vw,60px)]">
                        Build Their Seijaku Gift
                    </h2>

                    <p className="mt-2 text-[16px] leading-[1.4] text-[#EADFD2] sm:text-[18px] lg:text-[clamp(17px,1.2vw,23px)]">
                        Choose the pieces. We’ll bring the ritual together.
                    </p>

                    <a
                        // onClick={handleRedirectToBuildGift}
                        href="#build-gift-listing"
                        className="cursor-pointer group mt-6 inline-flex h-[46px] w-full max-w-[260px] items-center justify-center gap-2 bg-[#F7F1E8] font-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-[#2A1D1B] transition-colors duration-300 hover:bg-[#D9A878] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F7F1E8] lg:mt-[clamp(22px,1.8vw,40px)] lg:h-[clamp(46px,3vw,60px)] lg:w-[clamp(220px,14vw,300px)] lg:max-w-none lg:text-[clamp(12px,0.8vw,15px)]"
                    >
                        Start building
                        <span
                            aria-hidden="true"
                            className="transition-transform duration-300 group-hover:translate-x-1"
                        >
                            →
                        </span>
                    </a>
                </div>
            </section>
        </>
    );
};

export default LandingPage;
