<?php

namespace App\Http\Controllers;

use App\Enums\AttachmentCollection;
use App\Enums\TaskStatus;
use App\Http\Requests\UpdateProjectPreparationRequest;
use App\Models\Attachment;
use App\Models\IncentivePicLevelRule;
use App\Models\IncentiveProjectRoleRule;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\TaskType;
use App\Models\User;
use App\Services\Projects\ProjectWriteService;
use DateTimeInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectPreparationController extends Controller
{
    public function __construct(
        private readonly ProjectWriteService $writeService,
    ) {}

    public function show(Project $project): Response
    {
        $project = $project->load([
            'pm',
            'requester',
            'incentiveProfile.projectRoleRules',
            'incentiveProfile.picLevelRules',
            'members.user',
            'accessRules.user',
            'tasks.taskType',
            'tasks.member.user',
            'attachments',
        ]);

        return Inertia::render('projects/preparation', [
            'project' => $this->projectPayload($project),
            'options' => $this->options($project),
        ]);
    }

    public function update(UpdateProjectPreparationRequest $request, Project $project): RedirectResponse
    {
        $project = $this->writeService->updatePreparation($project, $request->validated(), $this->actor($request));

        return redirect()
            ->route('projects.preparation.show', $project)
            ->with('success', 'Project preparation saved.');
    }

    /**
     * @return array<string, mixed>
     */
    private function projectPayload(Project $project): array
    {
        return [
            'id' => $project->id,
            'name' => $project->name,
            'status' => $project->currentStatus()->value,
            'incentive_profile_id' => $project->incentive_profile_id,
            'pm_user_id' => $project->pm_user_id,
            'request_user_id' => $project->request_user_id,
            'location' => $project->location,
            'urs_date' => $this->dateString($project->urs_date),
            'urs_number' => $project->urs_number,
            'plan_start_date' => $this->dateString($project->plan_start_date),
            'plan_end_date' => $this->dateString($project->plan_end_date),
            'uat_date' => $this->dateString($project->uat_date),
            'bast_date' => $this->dateString($project->bast_date),
            'members' => $project->members->map(fn ($member): array => [
                'id' => $member->id,
                'user_id' => $member->user_id,
                'incentive_project_role_rule_id' => $member->incentive_project_role_rule_id,
                'incentive_pic_level_rule_id' => $member->incentive_pic_level_rule_id,
                'project_role_name' => $member->project_role_name,
                'pic_level_name' => $member->pic_level_name,
                'is_support' => $member->is_support,
                'user' => $member->user ? $this->userOption($member->user) : null,
            ])->values()->all(),
            'access_rules' => $project->accessRules->map(fn ($rule): array => [
                'id' => $rule->id,
                'user_id' => $rule->user_id,
                'permission' => $rule->permission,
                'user' => $rule->user ? $this->userOption($rule->user) : null,
            ])->values()->all(),
            'tasks' => $project->tasks->map(fn (ProjectTask $task): array => [
                'id' => $task->id,
                'name' => $task->name,
                'task_type_id' => $task->task_type_id,
                'pic_user_id' => $task->member?->user_id,
                'status' => $this->taskStatusValue($task),
                'description' => $task->description,
                'plan_start_date' => $this->dateString($task->plan_start_date),
                'plan_end_date' => $this->dateString($task->plan_end_date),
            ])->values()->all(),
            'attachments' => $this->attachmentPayload($project),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function options(Project $project): array
    {
        return [
            'users' => User::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'external_id']),
            'task_types' => TaskType::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'color']),
            'task_statuses' => collect(TaskStatus::cases())
                ->map(fn (TaskStatus $status): array => [
                    'value' => $status->value,
                    'label' => str($status->value)->headline()->toString(),
                ])
                ->all(),
            'project_role_rules' => IncentiveProjectRoleRule::query()
                ->where('incentive_profile_id', $project->incentive_profile_id)
                ->orderBy('role_code')
                ->get(['id', 'role_code', 'role_name', 'is_support']),
            'pic_level_rules' => IncentivePicLevelRule::query()
                ->where('incentive_profile_id', $project->incentive_profile_id)
                ->orderBy('level_code')
                ->get(['id', 'level_code', 'level_name']),
            'access_permissions' => [
                ['value' => 'view', 'label' => 'View'],
                ['value' => 'edit', 'label' => 'Edit'],
                ['value' => 'manage_tasks', 'label' => 'Manage Tasks'],
            ],
        ];
    }

    /**
     * @return array{id: int, name: string, email: string, external_id: ?string}
     */
    private function userOption(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'external_id' => $user->external_id,
        ];
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }

    private function dateString(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return $value === null ? null : (string) $value;
    }

    /**
     * @return array<string, array<int, array{id: int, original_name: string}>>
     */
    private function attachmentPayload(Project $project): array
    {
        $payload = [];

        foreach (AttachmentCollection::cases() as $collection) {
            $payload[$collection->value] = $project->attachments
                ->filter(fn (Attachment $attachment): bool => $this->attachmentCollectionValue($attachment) === $collection->value)
                ->map(fn (Attachment $attachment): array => [
                    'id' => $attachment->id,
                    'original_name' => $attachment->original_name,
                ])
                ->values()
                ->all();
        }

        return $payload;
    }

    private function taskStatusValue(ProjectTask $task): string
    {
        $status = $task->getAttribute('status');

        if ($status instanceof TaskStatus) {
            return $status->value;
        }

        return (string) $status;
    }

    private function attachmentCollectionValue(Attachment $attachment): string
    {
        $collection = $attachment->getAttribute('collection');

        if ($collection instanceof AttachmentCollection) {
            return $collection->value;
        }

        return (string) $collection;
    }
}
