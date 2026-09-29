"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import GenerateButton from "@/components/planning/GenerateButton";
import {useWeek} from "@/components/planning/useWeek";

export const NAV_ITEMS = [
    {href: "/", label: "Ma semaine"},
    {href: "/activity", label: "Activités"},
    {href: "/task", label: "Tâches"},
] as const;

export function isCurrent(pathname: string, href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Logo, onglets (bureau) et « Générer ». Sur mobile, les onglets passent dans `MobileTabBar`. */
export default function AppHeader() {
    const pathname = usePathname();
    const {stale} = useWeek();

    return (
        <header
            className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-5 pt-[22px] pb-3 md:h-[94px] md:gap-7 md:px-10 md:pt-[30px] md:pb-4">
            <Link href="/" className="flex grow items-baseline gap-[3px] md:grow-0 md:gap-1" aria-label="Schedula, ma semaine">
                <span className="text-[28px] leading-[30px] font-extrabold tracking-[-1.2px] md:text-[44px] md:leading-[46px] md:tracking-[-2px]">
                    Schedula
                </span>
                <span className="size-2 rounded-full bg-coral md:size-3" aria-hidden="true"/>
            </Link>

            <nav aria-label="Pages" className="hidden gap-1 rounded-[26px] bg-line p-1 md:flex">
                {NAV_ITEMS.map((item) => {
                    const current = isCurrent(pathname, item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={current ? "page" : undefined}
                            className={`flex h-10 items-center rounded-[20px] px-5 text-[15px] font-bold transition-[transform,background-color] duration-100 active:scale-95 ${current ? "bg-ink text-butter" : "text-ink hover:bg-cream"}`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="hidden grow md:block"/>

            <div className="md:hidden">
                <GenerateButton stale={stale} compact/>
            </div>
            <div className="hidden md:block">
                <GenerateButton stale={stale}/>
            </div>
        </header>
    );
}
