// optionnal onInputChange

export default function BaseHorizontalListGroup({selectedOptions, options, onInputChange}: {
    selectedOptions: string[],
    options: Array<{ label: string, value: string }>,
    onInputChange?: (checked: boolean, value: string) => void
}) {
    return (
        <ul className="items-center w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg sm:flex dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            {options.map((option, index) =>
                <li key={index}
                    className="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600">
                    <div className="flex items-center ps-3">
                        <input
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                            id={option.value}
                            type="checkbox"
                            checked={selectedOptions.includes(option.value)}
                            onChange={(e) => onInputChange ? onInputChange(e.target.checked, option.value) : null}
                        />
                        <label
                            htmlFor={option.value}
                            className="w-full py-3 ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                            {option.label}
                        </label>
                    </div>
                </li>
            )}
        </ul>
    )
}