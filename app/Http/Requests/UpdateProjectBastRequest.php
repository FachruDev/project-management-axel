<?php

namespace App\Http\Requests;

use App\Enums\ProjectStatus;
use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateProjectBastRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage_projects') === true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'bast_date' => ['required', 'date'],
            'bast_file' => ['required', 'file', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png', 'max:10240'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $project = $this->route('project');

                if (! $project instanceof Project) {
                    return;
                }

                $status = $project->currentStatus();
                $canUploadBast = $status === ProjectStatus::AwaitingBast
                    || (in_array($status, [ProjectStatus::Planning, ProjectStatus::Ongoing], true) && $project->allTasksDone());

                if ($canUploadBast) {
                    return;
                }

                $validator->errors()->add('project', 'BAST can only be uploaded after all tasks are done and the project is awaiting BAST.');
            },
        ];
    }
}
