import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";
import TopNavigation from "@/components/layout/TopNavigation";
import LeftSidebar from "@/components/layout/LeftSidebar";
import {ToastContainer} from "react-toastify";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Weekly Planner",
    description: "Generate a weekly planning for your life",
};

export default function RootLayout({children,}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased  dark:bg-gray-900 h-screen`}
        >
        <TopNavigation/>
        <LeftSidebar/>
        <main
            className="flex flex-col gap-8 row-start-2 items-center sm:items-start sm:ml-64 mt-14 h-full">
            {children}
        </main>
        <ToastContainer icon={false}/>
        </body>
        </html>
    );
}
