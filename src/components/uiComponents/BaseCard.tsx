export default function BaseCard({children, title}: { children: React.ReactNode, title?: string }) {
    return (
        <div
            className="max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-xs dark:bg-gray-800 dark:border-gray-700">
            <h3 className="font-bold">
                {title}
            </h3>
            <div className="mb-3 font-normal text-gray-700 dark:text-gray-400">
                {children}
            </div>

        </div>

    )
}