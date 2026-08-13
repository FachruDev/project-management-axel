import { Plus, Shield, Trash2, Users } from 'lucide-react';

import type {
    PreparationAccessRule,
    PreparationMember,
    ProjectPreparationProps,
} from '@/types';

import type { PreparationForm } from './types';
import { inputClass, Panel } from './ui';

type PreparationOptions = ProjectPreparationProps['options'];

export function MembersSection({
    form,
    options,
    onMemberChange,
    onAddMember,
}: {
    form: PreparationForm;
    options: Pick<
        PreparationOptions,
        'users' | 'project_role_rules' | 'pic_level_rules'
    >;
    onMemberChange: (index: number, value: PreparationMember) => void;
    onAddMember: () => void;
}) {
    return (
        <Panel
            title="Project Members"
            icon={Users}
            action={
                <button
                    type="button"
                    onClick={onAddMember}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/10"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Member</span>
                </button>
            }
        >
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                {form.data.members.map((member, indexKey) => (
                    <div
                        key={`member-${indexKey}`}
                        className="grid items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-primary/30 lg:grid-cols-[1fr_1fr_1fr_100px_auto]"
                    >
                        <select
                            value={member.user_id}
                            onChange={(event) =>
                                onMemberChange(indexKey, {
                                    ...member,
                                    user_id: event.target.value,
                                })
                            }
                            className={inputClass}
                        >
                            <option value="">User *</option>
                            {options.users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={member.incentive_project_role_rule_id}
                            onChange={(event) => {
                                const selectedRule =
                                    options.project_role_rules.find(
                                        (rule) =>
                                            String(rule.id) ===
                                            event.target.value,
                                    );
                                onMemberChange(indexKey, {
                                    ...member,
                                    incentive_project_role_rule_id:
                                        event.target.value,
                                    is_support: selectedRule?.is_support
                                        ? true
                                        : member.is_support,
                                });
                            }}
                            className={inputClass}
                        >
                            <option value="">Project Role *</option>
                            {options.project_role_rules.map((rule) => (
                                <option key={rule.id} value={rule.id}>
                                    {rule.role_name}{' '}
                                    {rule.is_support ? ' (Support)' : ''}
                                </option>
                            ))}
                        </select>
                        <select
                            value={member.incentive_pic_level_rule_id ?? ''}
                            onChange={(event) =>
                                onMemberChange(indexKey, {
                                    ...member,
                                    incentive_pic_level_rule_id:
                                        event.target.value,
                                })
                            }
                            className={inputClass}
                        >
                            <option value="">PIC Level</option>
                            {options.pic_level_rules.map((rule) => (
                                <option key={rule.id} value={rule.id}>
                                    {rule.level_name}
                                </option>
                            ))}
                        </select>
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100">
                            <input
                                type="checkbox"
                                checked={member.is_support}
                                onChange={(event) =>
                                    onMemberChange(indexKey, {
                                        ...member,
                                        is_support: event.target.checked,
                                    })
                                }
                                className="h-3.5 w-3.5 rounded-sm border-slate-300 text-primary focus:ring-primary/20"
                            />
                            Support *
                        </label>
                        <button
                            type="button"
                            title="Remove Member"
                            onClick={() =>
                                form.setData(
                                    'members',
                                    form.data.members.filter(
                                        (_, index) => index !== indexKey,
                                    ),
                                )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                {form.data.members.length === 0 && (
                    <p className="text-center text-xs font-medium text-slate-400">
                        No members assigned.
                    </p>
                )}
            </div>
        </Panel>
    );
}

export function AccessRulesSection({
    form,
    options,
    onAccessRuleChange,
}: {
    form: PreparationForm;
    options: Pick<PreparationOptions, 'users' | 'access_permissions'>;
    onAccessRuleChange: (index: number, value: PreparationAccessRule) => void;
}) {
    return (
        <Panel
            title="Access Rules"
            icon={Shield}
            action={
                <button
                    type="button"
                    onClick={() =>
                        form.setData('access_rules', [
                            ...form.data.access_rules,
                            { user_id: '', permission: 'view' },
                        ])
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/10"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Rule</span>
                </button>
            }
        >
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                {form.data.access_rules.map((rule, indexKey) => (
                    <div
                        key={`access-${indexKey}`}
                        className="grid items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-primary/30 md:grid-cols-[1fr_200px_auto]"
                    >
                        <select
                            value={rule.user_id}
                            onChange={(event) =>
                                onAccessRuleChange(indexKey, {
                                    ...rule,
                                    user_id: event.target.value,
                                })
                            }
                            className={inputClass}
                        >
                            <option value="">User *</option>
                            {options.users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={rule.permission}
                            onChange={(event) =>
                                onAccessRuleChange(indexKey, {
                                    ...rule,
                                    permission: event.target.value,
                                })
                            }
                            className={inputClass}
                        >
                            {options.access_permissions.map((permission) => (
                                <option
                                    key={permission.value}
                                    value={permission.value}
                                >
                                    {permission.label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            title="Remove Rule"
                            onClick={() =>
                                form.setData(
                                    'access_rules',
                                    form.data.access_rules.filter(
                                        (_, index) => index !== indexKey,
                                    ),
                                )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                {form.data.access_rules.length === 0 && (
                    <p className="text-center text-xs font-medium text-slate-400">
                        No individual access rules defined.
                    </p>
                )}
            </div>
        </Panel>
    );
}
