/** Pas d'attribut `style` dans ce projet : la CSP (`style-src` à nonce) le refuse au rendu serveur. */
export default function Spinner({className = "size-4"}: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
        />
    );
}
