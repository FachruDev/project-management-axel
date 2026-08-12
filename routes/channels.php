<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('project-board', function ($user): bool {
    return $user->can('view_projects');
});

Broadcast::channel('task-board', function ($user): bool {
    return $user->can('view_tasks');
});
