<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkDeleteProjectsRequest extends FormRequest
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
            'project_ids' => ['required', 'array', 'min:1'],
            'project_ids.*' => ['integer', Rule::exists('projects', 'id')],
        ];
    }
}
