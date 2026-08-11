<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkDeleteProjectTasksRequest extends FormRequest
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
            'task_ids' => ['required', 'array', 'min:1'],
            'task_ids.*' => ['integer', Rule::exists('project_tasks', 'id')],
        ];
    }
}
