import { Search, Check, ChevronDown, X } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

export type Option = {
    value: string;
    label: string;
};

export interface MultiSelectProps {
    options: Option[];
    value: string[]; // Array of selected values
    onChange: (value: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    maxBadges?: number;
    disabled?: boolean;
    hasError?: boolean;
    className?: string;
}

export function MultiSelect({
    options,
    value,
    onChange,
    placeholder = 'Select items...',
    searchPlaceholder = 'Search...',
    maxBadges = 5,
    disabled = false,
    hasError = false,
    className = '',
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOptions = useMemo(
        () => options.filter((opt) => value.includes(opt.value)),
        [options, value],
    );

    const filteredOptions = useMemo(() => {
        return options.filter((opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [options, searchQuery]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);

        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (optionValue: string) => {
        if (value.includes(optionValue)) {
            onChange(value.filter((v) => v !== optionValue));
        } else {
            onChange([...value, optionValue]);
        }
    };

    const removeOption = (
        event: ReactMouseEvent<HTMLButtonElement>,
        optionValue: string,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        onChange(value.filter((v) => v !== optionValue));
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Dropdown Trigger */}
            <div
                onMouseDown={(event) => {
                    event.preventDefault();

                    if (!disabled) {
                        setIsOpen((current) => !current);
                    }
                }}
                className={`min-h-[36px] w-full rounded-lg border bg-white px-3 py-1.5 shadow-sm transition-all ${
                    disabled
                        ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'
                        : isOpen
                          ? 'cursor-pointer border-primary ring-1 ring-primary'
                          : hasError
                            ? 'cursor-pointer border-red-300 ring-1 ring-red-300'
                            : 'cursor-pointer border-slate-200 hover:border-slate-300'
                }`}
            >
                <div className="flex flex-wrap items-center gap-1.5 pr-6">
                    {selectedOptions.length === 0 && (
                        <span className="py-0.5 text-xs font-medium text-slate-400">
                            {placeholder}
                        </span>
                    )}

                    {selectedOptions.slice(0, maxBadges).map((opt) => (
                        <span
                            key={opt.value}
                            className="inline-flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
                        >
                            <span className="max-w-[120px] truncate">
                                {opt.label}
                            </span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onMouseDown={(event) =>
                                        removeOption(event, opt.value)
                                    }
                                    className="rounded-full p-0.5 transition-colors hover:bg-indigo-200 hover:text-indigo-900"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </span>
                    ))}
                    {selectedOptions.length > maxBadges && (
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                            +{selectedOptions.length - maxBadges} more
                        </span>
                    )}
                </div>

                <div className="absolute top-2.5 right-3 text-slate-400">
                    <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-primary' : ''
                        }`}
                    />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && !disabled && (
                <div className="animate-in fade-in slide-in-from-top-2 absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {/* Search Input */}
                    <div className="border-b border-slate-100 bg-slate-50/50 p-2">
                        <div className="relative">
                            <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                autoFocus
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-md border border-slate-200 py-1.5 pr-3 pl-8 text-xs shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-56 overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs font-medium text-slate-400">
                                No items found.
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = value.includes(opt.value);

                                return (
                                    <div
                                        key={opt.value}
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            toggleOption(opt.value);
                                        }}
                                        className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                                            isSelected
                                                ? 'bg-primary/5 text-primary'
                                                : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="truncate pr-4">
                                            {opt.label}
                                        </span>
                                        {isSelected && (
                                            <Check className="h-4 w-4 shrink-0 text-primary" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// HOW TO USE
// import { Briefcase } from 'lucide-react';
// import { MultiSelect } from '@/components/ui/multi-select'; // Sesuaikan path

// export function CustomerIncentiveSection({
//     form,
//     options,
//     onCustomerIdsChange,
// }: {
//     form: any;
//     options: any;
//     onCustomerIdsChange: (customerIds: string[]) => void;
// }) {
//     const inputClass = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary hover:border-slate-300';

//     // 1. Transform data options dari API menjadi format { label, value }
//     const customerOptions = options.customers.map((c: any) => ({
//         value: String(c.id),
//         label: c.name,
//     }));

//     const selectedCustomers = options.customers.filter((customer: any) =>
//         form.data.customer_ids.includes(String(customer.id)),
//     );

//     return (
//         <Panel title="Customer & Incentive" icon={Briefcase}>
//             <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

//                 {/* 2. Gunakan Komponen MultiSelect di sini */}
//                 <Field label="Customers" error={form.errors.customer_ids} required>
//                     <MultiSelect
//                         options={customerOptions}
//                         value={form.data.customer_ids}
//                         onChange={(newValues) => onCustomerIdsChange(newValues)}
//                         placeholder="Select customers..."
//                         searchPlaceholder="Search customer by name..."
//                         hasError={!!form.errors.customer_ids}
//                         maxBadges={4} // Anda bisa mengatur maksimal tag yang muncul
//                     />
//                 </Field>

//                 <div className="grid gap-5">
//                     <Field label="Primary Customer" error={form.errors.primary_customer_id}>
//                         <select
//                             value={form.data.primary_customer_id}
//                             onChange={(event) => form.setData('primary_customer_id', event.target.value)}
//                             className={inputClass}
//                             disabled={selectedCustomers.length === 0}
//                         >
//                             <option value="" className="text-slate-400">
//                                 Use first selected customer
//                             </option>
//                             {selectedCustomers.map((customer: any) => (
//                                 <option key={customer.id} value={customer.id}>
//                                     {customer.name}
//                                 </option>
//                             ))}
//                         </select>
//                     </Field>

//                     <Field label="Incentive Profile" error={form.errors.incentive_profile_id} required>
//                         {/* ... seleksi incentive biasa ... */}
//                     </Field>
//                 </div>
//             </div>
//         </Panel>
//     );
// }
