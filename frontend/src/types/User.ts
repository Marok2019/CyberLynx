export interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'auditor';
    active: boolean;
    created_at: string;
}