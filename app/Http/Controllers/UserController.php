<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->trim()->toString();
        $departmentId = $request->string('department_id')->trim()->toString();

        $users = User::query()
            ->with(['department', 'roles'])
            ->withCount(['projectMemberships', 'projectAccessRules'])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('external_id', 'like', "%{$search}%");
                });
            })
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
            ->when($departmentId !== '', fn ($query) => $query->where('department_id', $departmentId))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'external_id' => $user->external_id,
                'is_active' => $user->is_active,
                'department_id' => $user->department_id,
                'department' => $user->department ? [
                    'id' => $user->department->id,
                    'code' => $user->department->code,
                    'name' => $user->department->name,
                ] : null,
                'roles' => $user->roles->pluck('name')->values()->all(),
                'project_memberships_count' => $user->project_memberships_count ?? 0,
                'project_access_rules_count' => $user->project_access_rules_count ?? 0,
            ]);

        return Inertia::render('users/index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'department_id' => $departmentId,
            ],
            'departments' => Department::query()
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'is_active']),
            'roles' => Role::query()
                ->where('guard_name', 'web')
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = User::create(Arr::except($validated, ['roles']));
        $user->syncRoles($validated['roles'] ?? []);

        return redirect()
            ->route('users.index')
            ->with('success', 'User saved.');
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();
        $payload = Arr::except($validated, ['roles']);

        if (($payload['password'] ?? null) === null || $payload['password'] === '') {
            $payload = Arr::except($payload, ['password']);
        }

        $user->update($payload);
        $user->syncRoles($validated['roles'] ?? []);

        return redirect()
            ->route('users.index')
            ->with('success', 'User updated.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()?->is($user)) {
            return back()->withErrors([
                'user' => 'User yang sedang login tidak bisa dihapus.',
            ]);
        }

        if ($user->projectMemberships()->exists() || $user->projectAccessRules()->exists()) {
            return back()->withErrors([
                'user' => 'User sudah dipakai di project dan tidak bisa dihapus.',
            ]);
        }

        $user->delete();

        return redirect()
            ->route('users.index')
            ->with('success', 'User deleted.');
    }
}
