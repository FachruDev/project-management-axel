import {
    Briefcase,
    CalendarDays,
    CheckCircle,
    FileText,
    Info,
    MapPin,
    UploadCloud,
} from 'lucide-react';
import { useMemo } from 'react';

import { MultiSelect } from '@/components/multi-select';
import type { Option } from '@/components/multi-select';
import type { ProjectPreparationProps } from '@/types';

import type { PreparationForm } from './types';
import { Field, fileInputClass, inputClass, LockedSection, Panel } from './ui';

type PreparationOptions = ProjectPreparationProps['options'];

export function BasicInformationSection({ form }: { form: PreparationForm }) {
    return (
        <Panel title="Basic Information" icon={Info}>
            <div className="grid gap-4 md:grid-cols-3">
                <Field label="Project Name" error={form.errors.name} required>
                    <input
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                        className={inputClass}
                    />
                </Field>
                <Field
                    label="Project Date"
                    error={form.errors.project_date}
                    required
                >
                    <input
                        type="date"
                        value={form.data.project_date}
                        onChange={(event) =>
                            form.setData('project_date', event.target.value)
                        }
                        className={inputClass}
                    />
                </Field>
                <Field label="Mandays" error={form.errors.mandays} required>
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.data.mandays}
                        onChange={(event) =>
                            form.setData('mandays', event.target.value)
                        }
                        className={inputClass}
                    />
                </Field>
            </div>
        </Panel>
    );
}

export function CustomerIncentiveSection({
    form,
    options,
    onCustomerIdsChange,
}: {
    form: PreparationForm;
    options: Pick<PreparationOptions, 'customers' | 'incentive_profiles'>;
    onCustomerIdsChange: (customerIds: string[]) => void;
}) {
    const customerOptions = useMemo<Option[]>(() => {
        return options.customers.map((customer) => ({
            value: String(customer.id),
            label: customer.name,
        }));
    }, [options.customers]);

    const selectedCustomers = options.customers.filter((customer) =>
        form.data.customer_ids.includes(String(customer.id)),
    );

    return (
        <Panel title="Customer & Incentive" icon={Briefcase}>
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <Field
                    label="Customers"
                    error={form.errors.customer_ids}
                    required
                    wrapper="div"
                >
                    <MultiSelect
                        options={customerOptions}
                        value={form.data.customer_ids}
                        onChange={onCustomerIdsChange}
                        placeholder="Select customers..."
                        searchPlaceholder="Search customers..."
                        maxBadges={5}
                        hasError={Boolean(form.errors.customer_ids)}
                    />
                </Field>

                <div className="grid gap-5">
                    <Field
                        label="Primary Customer"
                        error={form.errors.primary_customer_id}
                    >
                        <select
                            value={form.data.primary_customer_id}
                            onChange={(event) =>
                                form.setData(
                                    'primary_customer_id',
                                    event.target.value,
                                )
                            }
                            className={inputClass}
                            disabled={selectedCustomers.length === 0}
                        >
                            <option value="" className="text-slate-400">
                                Use first selected customer
                            </option>
                            {selectedCustomers.map((customer) => (
                                <option key={customer.id} value={customer.id}>
                                    {customer.name}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field
                        label="Incentive Profile"
                        error={form.errors.incentive_profile_id}
                        required
                    >
                        <select
                            value={form.data.incentive_profile_id}
                            onChange={(event) =>
                                form.setData(
                                    'incentive_profile_id',
                                    event.target.value,
                                )
                            }
                            className={inputClass}
                        >
                            <option value="" className="text-slate-400">
                                Select incentive profile...
                            </option>
                            {options.incentive_profiles.map((profile) => (
                                <option key={profile.id} value={profile.id}>
                                    {profile.code} v{profile.version} -{' '}
                                    {profile.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
            </div>
        </Panel>
    );
}

export function PicLocationSection({
    form,
    users,
}: {
    form: PreparationForm;
    users: PreparationOptions['users'];
}) {
    return (
        <Panel title="PIC & Location" icon={MapPin}>
            <div className="grid gap-5 md:grid-cols-3">
                <Field label="PIC PM" error={form.errors.pm_user_id} required>
                    <select
                        value={form.data.pm_user_id}
                        onChange={(event) =>
                            form.setData('pm_user_id', event.target.value)
                        }
                        className={inputClass}
                    >
                        <option value="">Select PM</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="PIC Request" error={form.errors.request_user_id}>
                    <select
                        value={form.data.request_user_id}
                        onChange={(event) =>
                            form.setData('request_user_id', event.target.value)
                        }
                        className={inputClass}
                    >
                        <option value="">Select requester</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Location" error={form.errors.location} required>
                    <input
                        placeholder="Site / Office location"
                        value={form.data.location}
                        onChange={(event) =>
                            form.setData('location', event.target.value)
                        }
                        className={inputClass}
                    />
                </Field>
            </div>
        </Panel>
    );
}

export function ProjectDocumentSections({
    form,
    showUat,
    showBast,
}: {
    form: PreparationForm;
    showUat: boolean;
    showBast: boolean;
}) {
    return (
        <>
            <Panel title="URS Information" icon={FileText}>
                <div className="grid gap-5 md:grid-cols-3">
                    <Field
                        label="URS Number"
                        error={form.errors.urs_number}
                        required
                    >
                        <input
                            placeholder="Doc. Ref. Number"
                            value={form.data.urs_number}
                            onChange={(event) =>
                                form.setData('urs_number', event.target.value)
                            }
                            className={inputClass}
                        />
                    </Field>
                    <Field
                        label="URS Date"
                        error={form.errors.urs_date}
                        required
                    >
                        <input
                            type="date"
                            value={form.data.urs_date}
                            onChange={(event) =>
                                form.setData('urs_date', event.target.value)
                            }
                            className={inputClass}
                        />
                    </Field>
                    <Field
                        label="URS File"
                        error={form.errors.urs_file}
                        required
                    >
                        <input
                            type="file"
                            onChange={(event) =>
                                form.setData(
                                    'urs_file',
                                    event.target.files?.[0] ?? null,
                                )
                            }
                            className={fileInputClass}
                        />
                    </Field>
                </div>
            </Panel>

            <Panel title="Project Timeline" icon={CalendarDays}>
                <div className="grid gap-5 md:grid-cols-2">
                    <Field
                        label="Plan Start"
                        error={form.errors.plan_start_date}
                        required
                    >
                        <input
                            type="date"
                            value={form.data.plan_start_date}
                            onChange={(event) =>
                                form.setData(
                                    'plan_start_date',
                                    event.target.value,
                                )
                            }
                            className={inputClass}
                        />
                    </Field>
                    <Field
                        label="Plan End"
                        error={form.errors.plan_end_date}
                        required
                    >
                        <input
                            type="date"
                            value={form.data.plan_end_date}
                            onChange={(event) =>
                                form.setData(
                                    'plan_end_date',
                                    event.target.value,
                                )
                            }
                            className={inputClass}
                        />
                    </Field>
                </div>
            </Panel>

            <Panel title="Request Evidence" icon={UploadCloud}>
                <Field
                    label="Upload Evidences"
                    error={form.errors.request_evidence}
                >
                    <input
                        type="file"
                        multiple
                        onChange={(event) =>
                            form.setData(
                                'request_evidence',
                                Array.from(event.target.files ?? []),
                            )
                        }
                        className={fileInputClass}
                    />
                </Field>
            </Panel>

            {showUat ? (
                <Panel title="UAT Information" icon={CheckCircle}>
                    <div className="grid gap-5 md:grid-cols-2">
                        <Field
                            label="UAT Date"
                            error={form.errors.uat_date}
                            required
                        >
                            <input
                                type="date"
                                value={form.data.uat_date}
                                onChange={(event) =>
                                    form.setData('uat_date', event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field
                            label="UAT File"
                            error={form.errors.uat_file}
                            required
                        >
                            <input
                                type="file"
                                onChange={(event) =>
                                    form.setData(
                                        'uat_file',
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                                className={fileInputClass}
                            />
                        </Field>
                    </div>
                </Panel>
            ) : (
                <LockedSection
                    title="UAT Information"
                    description="Section UAT akan aktif setelah project masuk fase planning atau setelah data UAT mulai tersedia."
                />
            )}

            {showBast ? (
                <Panel title="BAST Information" icon={CheckCircle}>
                    <div className="grid gap-5 md:grid-cols-2">
                        <Field
                            label="BAST Date"
                            error={form.errors.bast_date}
                            required
                        >
                            <input
                                type="date"
                                value={form.data.bast_date}
                                onChange={(event) =>
                                    form.setData(
                                        'bast_date',
                                        event.target.value,
                                    )
                                }
                                className={inputClass}
                            />
                        </Field>
                        <Field
                            label="BAST File"
                            error={form.errors.bast_file}
                            required
                        >
                            <input
                                type="file"
                                onChange={(event) =>
                                    form.setData(
                                        'bast_file',
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                                className={fileInputClass}
                            />
                        </Field>
                    </div>
                </Panel>
            ) : (
                <LockedSection
                    title="BAST Information"
                    description="Section BAST dikunci sampai UAT date atau UAT file tersedia. Lengkapi UAT terlebih dahulu sebelum mengisi BAST."
                />
            )}
        </>
    );
}
