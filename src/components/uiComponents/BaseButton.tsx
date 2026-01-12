import React from "react";

export const BaseButton = ({children, className, theme = "primary", size = "base", onClick, type = "button"}: {
    children: React.ReactNode,
    className?: string,
    theme?: "primary" | "secondary" | "danger" | "success" | "warning",
    size?: "base" | "small" | "large",
    onClick?: () => void | Promise<void>,
    type?: "button" | "submit" | "reset"
}) => {

    // add dark mode
    const buttonThemes: Record<string, string> = {
        primary: "bg-primary-500 hover:bg-primary-600 focus:ring-4 focus:ring-primary-300 dark:bg-primary-900 dark:hover:bg-primary-800 dark:focus:ring-primary-900",
        secondary: "bg-secondary-500 hover:bg-secondary-600 focus:ring-4 focus:ring-secondary-300 dark:bg-secondary-900 dark:hover:bg-secondary-800 dark:focus:ring-secondary-900",
        danger: "bg-danger-500 hover:bg-danger-600 focus:ring-4 focus:ring-danger-300 dark:bg-danger-900 dark:hover:bg-danger-800 dark:focus:ring-danger-900",
        success: "bg-success-500 hover:bg-success-600 focus:ring-4 focus:ring-success-300 dark:bg-success-900 dark:hover:bg-success-800 dark:focus:ring-success-900",
        warning: "bg-warning-500 hover:bg-warning-600 focus:ring-4 focus:ring-warning-300 dark:bg-warning-900 dark:hover:bg-warning-800 dark:focus:ring-warning-900",
    };

    const buttonTheme = buttonThemes[theme];

    //sizeClass
    const buttonSizesClass: Record<string, string> = {
        base: "text-sm px-4 py-2 rounded-lg",
        small: "text-xs px-2 py-1 rounded-md",
        large: "text-xl px-8 py-4 rounded-xl "
    }

    const buttonSizeClass = buttonSizesClass[size];

    return (
        <button
            type={type}
            className={`flex items-center justify-center text-white font-medium ${buttonSizeClass} ${buttonTheme} ${className}`}
            onClick={onClick}
        >
            {children}
        </button>
    );
};