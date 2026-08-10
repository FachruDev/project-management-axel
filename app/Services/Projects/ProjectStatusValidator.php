<?php

namespace App\Services\Projects;

use App\Enums\AttachmentCollection;
use App\Enums\ProjectStatus;
use App\Models\Project;
use Illuminate\Validation\ValidationException;

class ProjectStatusValidator
{
    public function validateFor(Project $project, ProjectStatus $status): void
    {
        match ($status) {
            ProjectStatus::Draft => $this->validateDraft($project),
            ProjectStatus::PendingApproval => $this->validatePendingApproval($project),
            ProjectStatus::Planning, ProjectStatus::Ongoing => $this->validatePlanningOrOngoing($project),
            ProjectStatus::AwaitingBast => $this->validateAwaitingBast($project),
            ProjectStatus::ReadyToClose => $this->validateReadyToClose($project),
            ProjectStatus::Closed => $this->validateClosed($project),
            ProjectStatus::Rejected => null,
        };
    }

    public function passes(Project $project, ProjectStatus $status): bool
    {
        try {
            $this->validateFor($project, $status);

            return true;
        } catch (ValidationException) {
            return false;
        }
    }

    public function validateDraft(Project $project): void
    {
        $this->throwIfInvalid($this->draftErrors($project));
    }

    public function validatePendingApproval(Project $project): void
    {
        $this->throwIfInvalid(array_merge(
            $this->draftErrors($project),
            $this->pendingApprovalErrors($project),
        ));
    }

    public function validatePlanningOrOngoing(Project $project): void
    {
        $this->throwIfInvalid(array_merge(
            $this->draftErrors($project),
            $this->pendingApprovalErrors($project),
            $this->planningOrOngoingErrors($project),
        ));
    }

    public function validateAwaitingBast(Project $project): void
    {
        $this->throwIfInvalid(array_merge(
            $this->draftErrors($project),
            $this->pendingApprovalErrors($project),
            $this->planningOrOngoingErrors($project),
            $this->awaitingBastErrors($project),
        ));
    }

    public function validateReadyToClose(Project $project): void
    {
        $this->throwIfInvalid(array_merge(
            $this->draftErrors($project),
            $this->pendingApprovalErrors($project),
            $this->planningOrOngoingErrors($project),
            $this->awaitingBastErrors($project),
            $this->readyToCloseErrors($project),
        ));
    }

    public function validateClosed(Project $project): void
    {
        $this->throwIfInvalid(array_merge(
            $this->draftErrors($project),
            $this->pendingApprovalErrors($project),
            $this->planningOrOngoingErrors($project),
            $this->awaitingBastErrors($project),
            $this->readyToCloseErrors($project),
            $this->closedErrors($project),
        ));
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function draftErrors(Project $project): array
    {
        $errors = [];

        if (blank($project->name)) {
            $errors['name'][] = 'Project name is required.';
        }

        if ($this->missingAttribute($project, 'project_date')) {
            $errors['project_date'][] = 'Project date is required.';
        }

        if ((float) $project->mandays <= 0) {
            $errors['mandays'][] = 'Project mandays must be greater than zero.';
        }

        if ($this->missingAttribute($project, 'incentive_profile_id')) {
            $errors['incentive_profile_id'][] = 'Incentive profile is required.';
        }

        if (! $project->hasCustomers()) {
            $errors['customers'][] = 'At least one customer is required.';
        }

        return $errors;
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function pendingApprovalErrors(Project $project): array
    {
        $errors = [];

        if ($this->missingAttribute($project, 'pm_user_id')) {
            $errors['pm_user_id'][] = 'Project PM is required.';
        }

        if (blank($project->location)) {
            $errors['location'][] = 'Project location is required.';
        }

        if ($this->missingAttribute($project, 'urs_date')) {
            $errors['urs_date'][] = 'URS date is required.';
        }

        if (blank($project->urs_number)) {
            $errors['urs_number'][] = 'URS number is required.';
        }

        if (! $project->hasAttachment(AttachmentCollection::UrsFile)) {
            $errors['urs_file'][] = 'URS file is required.';
        }

        if ($this->missingAttribute($project, 'plan_start_date')) {
            $errors['plan_start_date'][] = 'Plan start date is required.';
        }

        if ($this->missingAttribute($project, 'plan_end_date')) {
            $errors['plan_end_date'][] = 'Plan end date is required.';
        }

        if (! $project->hasMembers()) {
            $errors['project_members'][] = 'At least one project member is required.';
        }

        return $errors;
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function planningOrOngoingErrors(Project $project): array
    {
        $errors = [];

        if ($this->missingAttribute($project, 'uat_date')) {
            $errors['uat_date'][] = 'UAT date is required.';
        }

        if (! $project->hasAttachment(AttachmentCollection::UatFile)) {
            $errors['uat_file'][] = 'UAT file is required.';
        }

        return $errors;
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function awaitingBastErrors(Project $project): array
    {
        if ($project->allTasksDone()) {
            return [];
        }

        return [
            'tasks' => ['All project tasks must be done.'],
        ];
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function readyToCloseErrors(Project $project): array
    {
        $errors = [];

        if ($this->missingAttribute($project, 'bast_date')) {
            $errors['bast_date'][] = 'BAST date is required.';
        }

        if (! $project->hasAttachment(AttachmentCollection::BastFile)) {
            $errors['bast_file'][] = 'BAST file is required.';
        }

        return $errors;
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function closedErrors(Project $project): array
    {
        if (! $this->missingAttribute($project, 'actual_end_date')) {
            return [];
        }

        return [
            'actual_end_date' => ['Actual end date is required when project is closed.'],
        ];
    }

    /**
     * @param  array<string, array<int, string>>  $errors
     *
     * @throws ValidationException
     */
    private function throwIfInvalid(array $errors): void
    {
        if ($errors === []) {
            return;
        }

        throw ValidationException::withMessages($errors);
    }

    private function missingAttribute(Project $project, string $attribute): bool
    {
        return $project->getAttribute($attribute) === null;
    }
}
