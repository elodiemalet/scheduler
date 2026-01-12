// eslint.config.js
import {dirname} from "path";
import {fileURLToPath} from "url";
import {FlatCompat} from "@eslint/eslintrc";
import reactPlugin from "eslint-plugin-react";
import tsParser from "@typescript-eslint/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    // Extend Next.js recommended configs (including TypeScript if applicable)
    ...compat.extends("next/core-web-vitals", "next/typescript"),

    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        languageOptions: {
            // Use parserOptions to specify ECMAScript options
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: {jsx: true},
            },
            // If you're using TypeScript, set the parser accordingly
            parser: tsParser,
        },
        plugins: {
            // Register the React plugin to handle JSX validations
            react: reactPlugin,
        },
        rules: {
            // This rule flags unknown DOM properties in JSX (e.g., converting `fill-rule` to `fillRule`)
            "react/no-unknown-property": "error",
        },
    },
];

export default eslintConfig;
