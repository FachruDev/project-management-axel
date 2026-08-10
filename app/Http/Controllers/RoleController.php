<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();

        $roles = Role::query()
            ->with('permissions')
            ->withCount('users')
            ->where('guard_name', 'web')
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Role $role): array => [
                'id' => $role->id,
                'name' => $role->name,
                'guard_name' => $role->guard_name,
                'permissions' => $role->permissions->pluck('name')->values()->all(),
                'users_count' => $role->users_count ?? 0,
            ]);

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'filters' => [
                'search' => $search,
            ],
            'permission_groups' => $this->permissionGroups(),
        ]);
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);
        $role->syncPermissions($validated['permissions'] ?? []);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return redirect()
            ->route('roles.index')
            ->with('success', 'Role saved.');
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        $validated = $request->validated();
        $role->update(['name' => $validated['name']]);
        $role->syncPermissions($validated['permissions'] ?? []);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return redirect()
            ->route('roles.index')
            ->with('success', 'Role updated.');
    }

    public function destroy(Role $role): RedirectResponse
    {
        if ($role->users()->exists()) {
            return back()->withErrors([
                'role' => 'Role masih dipakai user dan tidak bisa dihapus.',
            ]);
        }

        $role->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return redirect()
            ->route('roles.index')
            ->with('success', 'Role deleted.');
    }

    /**
     * @return array<int, array{category: string, permissions: array<int, array{id: int, name: string}>}>
     */
    private function permissionGroups(): array
    {
        return Permission::query()
            ->where('guard_name', 'web')
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'category'])
            ->groupBy(fn (Permission $permission): string => (string) ($permission->getAttribute('category') ?: 'uncategorized'))
            ->map(fn ($permissions, string $category): array => [
                'category' => $category,
                'permissions' => $permissions
                    ->map(fn (Permission $permission): array => [
                        'id' => $permission->id,
                        'name' => $permission->name,
                    ])
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();
    }
}
