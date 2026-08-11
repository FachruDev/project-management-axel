<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectPreparationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage_projects') === true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'pm_user_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'request_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'location' => ['required', 'string', 'max:200'],
            'urs_date' => ['required', 'date'],
            'urs_number' => ['required', 'string', 'max:100'],
            'urs_file' => ['nullable', 'file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', 'max:10240'],
            'request_evidence' => ['array'],
            'request_evidence.*' => ['file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', 'max:10240'],
            'plan_start_date' => ['required', 'date'],
            'plan_end_date' => ['required', 'date', 'after_or_equal:plan_start_date'],
            'uat_date' => ['nullable', 'date'],
            'uat_file' => ['nullable', 'file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', 'max:10240'],
            'bast_date' => ['nullable', 'date'],
            'bast_file' => ['nullable', 'file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', 'max:10240'],
            'members' => ['required', 'array', 'min:1'],
            'members.*.user_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'members.*.incentive_project_role_rule_id' => ['required', 'integer', Rule::exists('incentive_project_role_rules', 'id')],
            'members.*.incentive_pic_level_rule_id' => ['nullable', 'integer', Rule::exists('incentive_pic_level_rules', 'id')],
            'members.*.is_support' => ['required', 'boolean'],
            'access_rules' => ['array'],
            'access_rules.*.user_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'access_rules.*.permission' => ['required', 'string', Rule::in(['view', 'edit', 'manage_tasks'])],
            'tasks' => ['array'],
            'tasks.*.id' => ['nullable', 'integer', Rule::exists('project_tasks', 'id')],
            'tasks.*.name' => ['required', 'string', 'max:200'],
            'tasks.*.task_type_id' => ['nullable', 'integer', Rule::exists('task_types', 'id')],
            'tasks.*.pic_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'tasks.*.status' => ['required', 'string', Rule::in(['todo', 'assigned', 'inprogress', 'done', 'cancelled'])],
            'tasks.*.description' => ['nullable', 'string', 'max:2000'],
            'tasks.*.plan_start_date' => ['required', 'date'],
            'tasks.*.plan_end_date' => ['required', 'date'],
            'tasks.*.attachments' => ['nullable', 'array'],
            'tasks.*.attachments.*' => ['file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
