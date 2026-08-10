import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import {
    index,
    show,
    store,
    update,
} from '@/actions/App/Http/Controllers/IncentiveProfileController';
import type {
    DeliveryRule,
    IncentiveProfileActions,
    IncentiveProfileFormPayload,
    IncentiveProfileStatus,
    MandayRule,
    PicLevelRule,
    ProjectRoleRule,
    StatusOption,
} from '@/types';

type FormProfile = IncentiveProfileFormPayload & {
    id: number | null;
    status: IncentiveProfileStatus;
    actions: IncentiveProfileActions;
};

type Props = {
    mode: 'create' | 'edit';
    profile: FormProfile;
    statuses: StatusOption[];
};

const inputClass =
    'rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-700 disabled:bg-zinc-100 disabled:text-zinc-500';

export default function IncentiveProfileForm({ mode, profile }: Props) {
    const isEdit = mode === 'edit';
    const isLocked = isEdit && !profile.actions.can_edit;
    const form = useForm<IncentiveProfileFormPayload>({
        code: profile.code,
        name: profile.name,
        description: profile.description ?? '',
        version: profile.version,
        effective_from: profile.effective_from,
        effective_to: profile.effective_to,
        support_percent: profile.support_percent,
        manday_rules: profile.manday_rules,
        pic_level_rules: profile.pic_level_rules,
        project_role_rules: profile.project_role_rules,
        delivery_rules: profile.delivery_rules,
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isLocked) {
            return;
        }

        if (isEdit && profile.id !== null) {
            form.put(update.url(profile.id));

            return;
        }

        form.post(store.url());
    }

    return (
        <>
            <Head
                title={
                    isEdit ? `Edit ${profile.name}` : 'New Incentive Profile'
                }
            />
            <main className="min-h-screen bg-zinc-100 text-zinc-950">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-zinc-500">
                                Master Data
                            </p>
                            <h1 className="text-2xl font-semibold">
                                {isEdit
                                    ? 'Edit Incentive Profile'
                                    : 'New Incentive Profile'}
                            </h1>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href={index.url()}
                                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-white"
                            >
                                Back
                            </Link>
                            {isEdit && profile.id !== null && (
                                <Link
                                    href={show.url(profile.id)}
                                    className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-white"
                                >
                                    View
                                </Link>
                            )}
                        </div>
                    </header>

                    {isLocked && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            This profile is locked. Active profiles must be
                            inactivated before editing; archived profiles are
                            read-only.
                        </div>
                    )}

                    <form onSubmit={submit} className="flex flex-col gap-6">
                        <section className="rounded-lg border border-zinc-200 bg-white p-4">
                            <h2 className="mb-4 text-base font-semibold">
                                Profile
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Field
                                    label="Code"
                                    error={errorFor(form.errors, 'code')}
                                >
                                    <input
                                        disabled={isLocked}
                                        value={form.data.code}
                                        onChange={(event) =>
                                            form.setData(
                                                'code',
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field
                                    label="Name"
                                    error={errorFor(form.errors, 'name')}
                                >
                                    <input
                                        disabled={isLocked}
                                        value={form.data.name}
                                        onChange={(event) =>
                                            form.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field
                                    label="Version"
                                    error={errorFor(form.errors, 'version')}
                                >
                                    <input
                                        disabled={isLocked}
                                        type="number"
                                        min={1}
                                        value={form.data.version}
                                        onChange={(event) =>
                                            form.setData(
                                                'version',
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field
                                    label="Support Percent"
                                    error={errorFor(
                                        form.errors,
                                        'support_percent',
                                    )}
                                >
                                    <input
                                        disabled={isLocked}
                                        type="number"
                                        min={0}
                                        max={1}
                                        step="0.0001"
                                        value={form.data.support_percent}
                                        onChange={(event) =>
                                            form.setData(
                                                'support_percent',
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field
                                    label="Effective From"
                                    error={errorFor(
                                        form.errors,
                                        'effective_from',
                                    )}
                                >
                                    <input
                                        disabled={isLocked}
                                        type="date"
                                        value={form.data.effective_from}
                                        onChange={(event) =>
                                            form.setData(
                                                'effective_from',
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field
                                    label="Effective To"
                                    error={errorFor(
                                        form.errors,
                                        'effective_to',
                                    )}
                                >
                                    <input
                                        disabled={isLocked}
                                        type="date"
                                        value={form.data.effective_to ?? ''}
                                        onChange={(event) =>
                                            form.setData(
                                                'effective_to',
                                                nullableValue(
                                                    event.target.value,
                                                ),
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field
                                    label="Description"
                                    error={errorFor(form.errors, 'description')}
                                    className="md:col-span-2"
                                >
                                    <textarea
                                        disabled={isLocked}
                                        value={form.data.description ?? ''}
                                        onChange={(event) =>
                                            form.setData(
                                                'description',
                                                event.target.value,
                                            )
                                        }
                                        className={`${inputClass} min-h-20`}
                                    />
                                </Field>
                            </div>
                        </section>

                        <RuleError
                            message={
                                errorFor(form.errors, 'manday_rules') ??
                                errorFor(form.errors, 'pic_level_rules') ??
                                errorFor(form.errors, 'project_role_rules') ??
                                errorFor(form.errors, 'delivery_rules')
                            }
                        />

                        <MandayRules
                            disabled={isLocked}
                            rules={form.data.manday_rules}
                            onChange={(rules) =>
                                form.setData('manday_rules', rules)
                            }
                        />
                        <PicLevelRules
                            disabled={isLocked}
                            rules={form.data.pic_level_rules}
                            onChange={(rules) =>
                                form.setData('pic_level_rules', rules)
                            }
                        />
                        <ProjectRoleRules
                            disabled={isLocked}
                            rules={form.data.project_role_rules}
                            onChange={(rules) =>
                                form.setData('project_role_rules', rules)
                            }
                        />
                        <DeliveryRules
                            disabled={isLocked}
                            rules={form.data.delivery_rules}
                            onChange={(rules) =>
                                form.setData('delivery_rules', rules)
                            }
                        />

                        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4">
                            <Link
                                href={
                                    profile.id === null
                                        ? index.url()
                                        : show.url(profile.id)
                                }
                                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-white"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={isLocked || form.processing}
                                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                            >
                                {form.processing ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </>
    );
}

function MandayRules({
    disabled,
    rules,
    onChange,
}: {
    disabled: boolean;
    rules: MandayRule[];
    onChange: (rules: MandayRule[]) => void;
}) {
    return (
        <RuleSection
            title="Manday Score Rules"
            onAdd={() =>
                onChange([
                    ...rules,
                    {
                        min_mandays: '',
                        max_mandays: null,
                        base_score: '',
                    },
                ])
            }
            disabled={disabled}
        >
            {rules.map((rule, indexKey) => (
                <div
                    key={indexKey}
                    className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                    <NumberInput
                        disabled={disabled}
                        label="Min"
                        value={rule.min_mandays}
                        onChange={(value) =>
                            onChange(
                                updateRow(
                                    rules,
                                    indexKey,
                                    'min_mandays',
                                    requiredNumberValue(value),
                                ),
                            )
                        }
                    />
                    <NumberInput
                        disabled={disabled}
                        label="Max"
                        value={rule.max_mandays}
                        nullable
                        onChange={(value) =>
                            onChange(
                                updateRow(
                                    rules,
                                    indexKey,
                                    'max_mandays',
                                    value,
                                ),
                            )
                        }
                    />
                    <NumberInput
                        disabled={disabled}
                        label="Base Score"
                        value={rule.base_score}
                        step="0.0001"
                        onChange={(value) =>
                            onChange(
                                updateRow(
                                    rules,
                                    indexKey,
                                    'base_score',
                                    requiredNumberValue(value),
                                ),
                            )
                        }
                    />
                    <RemoveButton
                        disabled={disabled || rules.length === 1}
                        onClick={() => onChange(removeRow(rules, indexKey))}
                    />
                </div>
            ))}
        </RuleSection>
    );
}

function PicLevelRules({
    disabled,
    rules,
    onChange,
}: {
    disabled: boolean;
    rules: PicLevelRule[];
    onChange: (rules: PicLevelRule[]) => void;
}) {
    return (
        <RuleSection
            title="PIC Level Points"
            onAdd={() =>
                onChange([
                    ...rules,
                    {
                        level_code: '',
                        level_name: '',
                        points: '',
                    },
                ])
            }
            disabled={disabled}
        >
            {rules.map((rule, indexKey) => (
                <div
                    key={indexKey}
                    className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                    <TextInput
                        disabled={disabled}
                        label="Code"
                        value={rule.level_code}
                        onChange={(value) =>
                            onChange(
                                updateRow(rules, indexKey, 'level_code', value),
                            )
                        }
                    />
                    <TextInput
                        disabled={disabled}
                        label="Name"
                        value={rule.level_name}
                        onChange={(value) =>
                            onChange(
                                updateRow(rules, indexKey, 'level_name', value),
                            )
                        }
                    />
                    <NumberInput
                        disabled={disabled}
                        label="Points"
                        value={rule.points}
                        step="0.0001"
                        onChange={(value) =>
                            onChange(
                                updateRow(
                                    rules,
                                    indexKey,
                                    'points',
                                    requiredNumberValue(value),
                                ),
                            )
                        }
                    />
                    <RemoveButton
                        disabled={disabled || rules.length === 1}
                        onClick={() => onChange(removeRow(rules, indexKey))}
                    />
                </div>
            ))}
        </RuleSection>
    );
}

function ProjectRoleRules({
    disabled,
    rules,
    onChange,
}: {
    disabled: boolean;
    rules: ProjectRoleRule[];
    onChange: (rules: ProjectRoleRule[]) => void;
}) {
    return (
        <RuleSection
            title="Project Role Points"
            onAdd={() =>
                onChange([
                    ...rules,
                    {
                        role_code: '',
                        role_name: '',
                        points: '',
                        is_support: false,
                    },
                ])
            }
            disabled={disabled}
        >
            {rules.map((rule, indexKey) => (
                <div
                    key={indexKey}
                    className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_120px_auto]"
                >
                    <TextInput
                        disabled={disabled}
                        label="Code"
                        value={rule.role_code}
                        onChange={(value) =>
                            onChange(
                                updateRow(rules, indexKey, 'role_code', value),
                            )
                        }
                    />
                    <TextInput
                        disabled={disabled}
                        label="Name"
                        value={rule.role_name}
                        onChange={(value) =>
                            onChange(
                                updateRow(rules, indexKey, 'role_name', value),
                            )
                        }
                    />
                    <NumberInput
                        disabled={disabled}
                        label="Points"
                        value={rule.points}
                        step="0.0001"
                        onChange={(value) =>
                            onChange(
                                updateRow(
                                    rules,
                                    indexKey,
                                    'points',
                                    requiredNumberValue(value),
                                ),
                            )
                        }
                    />
                    <label className="flex items-end gap-2 text-sm">
                        <input
                            disabled={disabled}
                            type="checkbox"
                            checked={rule.is_support}
                            onChange={(event) =>
                                onChange(
                                    updateRow(
                                        rules,
                                        indexKey,
                                        'is_support',
                                        event.target.checked,
                                    ),
                                )
                            }
                            className="mb-2 h-4 w-4 rounded border-zinc-300"
                        />
                        <span className="pb-1.5">Support</span>
                    </label>
                    <RemoveButton
                        disabled={disabled || rules.length === 1}
                        onClick={() => onChange(removeRow(rules, indexKey))}
                    />
                </div>
            ))}
        </RuleSection>
    );
}

function DeliveryRules({
    disabled,
    rules,
    onChange,
}: {
    disabled: boolean;
    rules: DeliveryRule[];
    onChange: (rules: DeliveryRule[]) => void;
}) {
    return (
        <RuleSection
            title="Delivery Multiplier Rules"
            onAdd={() =>
                onChange([
                    ...rules,
                    {
                        name: '',
                        min_difference_days: null,
                        max_difference_days: null,
                        multiplier: '',
                    },
                ])
            }
            disabled={disabled}
        >
            {rules.map((rule, indexKey) => (
                <div
                    key={indexKey}
                    className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                >
                    <TextInput
                        disabled={disabled}
                        label="Name"
                        value={rule.name}
                        onChange={(value) =>
                            onChange(updateRow(rules, indexKey, 'name', value))
                        }
                    />
                    <NumberInput
                        disabled={disabled}
                        label="Min Days"
                        value={rule.min_difference_days}
                        nullable
                        onChange={(value) =>
                            onChange(
                                updateRow(
                                    rules,
                                    indexKey,
                                    'min_difference_days',
                                    value,
                                ),
                            )
                        }
                    />
                    <NumberInput
                        disabled={disabled}
                        label="Max Days"
                        value={rule.max_difference_days}
                        nullable
                        onChange={(value) =>
                            onChange(
                                updateRow(
                                    rules,
                                    indexKey,
                                    'max_difference_days',
                                    value,
                                ),
                            )
                        }
                    />
                    <NumberInput
                        disabled={disabled}
                        label="Multiplier"
                        value={rule.multiplier}
                        step="0.0001"
                        onChange={(value) =>
                            onChange(
                                updateRow(
                                    rules,
                                    indexKey,
                                    'multiplier',
                                    requiredNumberValue(value),
                                ),
                            )
                        }
                    />
                    <RemoveButton
                        disabled={disabled || rules.length === 1}
                        onClick={() => onChange(removeRow(rules, indexKey))}
                    />
                </div>
            ))}
        </RuleSection>
    );
}

function RuleSection({
    title,
    children,
    onAdd,
    disabled,
}: {
    title: string;
    children: ReactNode;
    onAdd: () => void;
    disabled: boolean;
}) {
    return (
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">{title}</h2>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={onAdd}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
                >
                    Add Row
                </button>
            </div>
            <div className="flex flex-col gap-3">{children}</div>
        </section>
    );
}

function Field({
    label,
    error,
    children,
    className = '',
}: {
    label: string;
    error: string | null;
    children: ReactNode;
    className?: string;
}) {
    return (
        <label className={`flex flex-col gap-1 text-sm ${className}`}>
            <span className="font-medium text-zinc-700">{label}</span>
            {children}
            {error && <span className="text-xs text-red-600">{error}</span>}
        </label>
    );
}

function TextInput({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
}) {
    return (
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            {label}
            <input
                disabled={disabled}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={inputClass}
            />
        </label>
    );
}

function NumberInput({
    label,
    value,
    onChange,
    disabled,
    nullable = false,
    step = '1',
}: {
    label: string;
    value: number | string | null;
    onChange: (value: number | string | null) => void;
    disabled: boolean;
    nullable?: boolean;
    step?: string;
}) {
    return (
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            {label}
            <input
                disabled={disabled}
                type="number"
                step={step}
                value={value ?? ''}
                onChange={(event) =>
                    onChange(
                        nullable
                            ? nullableValue(event.target.value)
                            : event.target.value,
                    )
                }
                className={inputClass}
            />
        </label>
    );
}

function RemoveButton({
    disabled,
    onClick,
}: {
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="self-end rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
            Remove
        </button>
    );
}

function RuleError({ message }: { message: string | null }) {
    if (!message) {
        return null;
    }

    return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
        </div>
    );
}

function nullableValue(value: string) {
    return value === '' ? null : value;
}

function requiredNumberValue(value: number | string | null) {
    return value ?? '';
}

function updateRow<T, K extends keyof T>(
    rows: T[],
    indexKey: number,
    key: K,
    value: T[K],
) {
    return rows.map((row, currentIndex) =>
        currentIndex === indexKey
            ? {
                  ...row,
                  [key]: value,
              }
            : row,
    );
}

function removeRow<T>(rows: T[], indexKey: number) {
    return rows.filter((_, currentIndex) => currentIndex !== indexKey);
}

function errorFor(
    errors: Partial<Record<keyof IncentiveProfileFormPayload | string, string>>,
    key: keyof IncentiveProfileFormPayload | string,
) {
    return errors[key] ?? null;
}
