import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import {connection} from "next/server";
import "./globals.css";
import TopNavigation from "@/components/layout/TopNavigation";
import LeftSidebar from "@/components/layout/LeftSidebar";
// L'entrée `unstyled` n'injecte pas de <style> à l'exécution : un tel élément
// n'a pas le nonce de la CSP et serait bloqué. La feuille importée ici passe
// par le pipeline CSS de Next et devient une ressource `'self'`.
import {ToastContainer} from "react-toastify/unstyled";
import "react-toastify/ReactToastify.css";

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

export default async function RootLayout({children,}: Readonly<{
    children: React.ReactNode;
}>) {
    // Un nonce est tiré par requête : sans cette attente, la page est rendue
    // au build, quand il n'existe ni requête ni en-tête où le lire.
    await connection();

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
