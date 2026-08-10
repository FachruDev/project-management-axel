export type User = {
    id: number;
    name: string;
    email: string;
    external_id: string | null;
    is_active: boolean;
    roles: string[];
    permissions: string[];
    avatar?: string;
    [key: string]: unknown; // This allows for additional properties...
};

export type Auth = {
    user: User | null;
};
