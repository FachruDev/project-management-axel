<?php

namespace App\Services\Projects;

use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ProjectVisibilityService
{
    /**
     * @param  Builder<Project>  $query
     * @return Builder<Project>
     */
    public function visibleProjects(Builder $query, User $user): Builder
    {
        if ($this->seesGlobalProjects($user)) {
            return $query;
        }

        return $query->where(function (Builder $query) use ($user): void {
            $query
                ->where('pm_user_id', $user->id)
                ->orWhere('request_user_id', $user->id)
                ->orWhereHas('members', fn (Builder $query) => $query->where('user_id', $user->id))
                ->orWhereHas('accessRules', fn (Builder $query) => $query->where('user_id', $user->id));
        });
    }

    /**
     * @param  Builder<ProjectTask>  $query
     * @return Builder<ProjectTask>
     */
    public function visibleTasks(Builder $query, User $user): Builder
    {
        if ($this->seesGlobalProjects($user)) {
            return $query;
        }

        return $query->where(function (Builder $query) use ($user): void {
            $query
                ->whereHas('member', fn (Builder $query) => $query->where('user_id', $user->id))
                ->orWhereHas('project', fn (Builder $query) => $query
                    ->where('pm_user_id', $user->id)
                    ->orWhere('request_user_id', $user->id)
                    ->orWhereHas('members', fn (Builder $query) => $query->where('user_id', $user->id))
                    ->orWhereHas('accessRules', fn (Builder $query) => $query->where('user_id', $user->id)));
        });
    }

    public function canAccessTask(ProjectTask $task, User $user): bool
    {
        return $this->visibleTasks(ProjectTask::query()->whereKey($task->id), $user)->exists();
    }

    private function seesGlobalProjects(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin']);
    }
}
