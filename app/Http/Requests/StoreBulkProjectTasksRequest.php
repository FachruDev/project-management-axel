<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBulkProjectTasksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage_tasks') === true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'tasks' => ['required', 'array', 'min:1'],
            'tasks.*.name' => ['required', 'string', 'max:200'],
            'tasks.*.task_type_id' => ['nullable', 'integer', Rule::exists('task_types', 'id')],
            'tasks.*.pic_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'tasks.*.description' => ['nullable', 'string', 'max:2000'],
            'tasks.*.plan_start_date' => ['required', 'date'],
            'tasks.*.plan_end_date' => ['required', 'date'],
            'tasks.*.attachments' => ['nullable', 'array'],
            'tasks.*.attachments.*' => ['file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
