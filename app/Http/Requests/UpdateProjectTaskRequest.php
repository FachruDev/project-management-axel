<?php

namespace App\Http\Requests;

use App\Enums\TaskStatus;
use App\Models\ProjectTask;
use App\Models\TaskType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateProjectTaskRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:200'],
            'task_type_id' => ['nullable', 'integer', Rule::exists('task_types', 'id')],
            'pic_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'status' => ['required', 'string', Rule::enum(TaskStatus::class)],
            'description' => ['nullable', 'string', 'max:2000'],
            'plan_start_date' => ['required', 'date'],
            'plan_end_date' => ['required', 'date', 'after_or_equal:plan_start_date'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $task = $this->route('task');

                if (! $task instanceof ProjectTask) {
                    return;
                }

                $project = $task->project;
                $taskTypeId = $this->input('task_type_id');
                $picUserId = $this->input('pic_user_id');

                if (! empty($taskTypeId)) {
                    $taskTypeExists = TaskType::query()
                        ->whereKey((int) $taskTypeId)
                        ->where(function ($query) use ($project): void {
                            $query->whereNull('project_id')
                                ->orWhere('project_id', $project->id);
                        })
                        ->exists();

                    if (! $taskTypeExists) {
                        $validator->errors()->add('task_type_id', 'Selected task type is not available for this project.');
                    }
                }

                if (! empty($picUserId)) {
                    $memberExists = $project->members()
                        ->where('user_id', (int) $picUserId)
                        ->exists();

                    if (! $memberExists) {
                        $validator->errors()->add('pic_user_id', 'Selected PIC must be a project member.');
                    }
                }
            },
        ];
    }
}
