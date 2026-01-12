'use client';
import "../app/globals.css";
import type {AppProps} from "next/app";
import ReduxProvider from "@/app/reduxProvider";

function MyApp({Component, pageProps}: AppProps) {
    return (
        <ReduxProvider>
            <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start p-4 sm:ml-64 mt-16 h-full">
                <Component {...pageProps} />
            </main>
        </ReduxProvider>
    );
}

export default MyApp;
