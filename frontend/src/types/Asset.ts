export interface Asset {
    id: number;
    name: string;
    type: 'Hardware' | 'Software' | 'Network';
    location: string;
    status: 'Active' | 'Inactive' | 'Maintenance';
    description: string;
    created_at: string;
    updated_at: string;
    created_by: number;
}

export interface CreateAssetRequest {
    name: string;
    type: 'Hardware' | 'Software' | 'Network';
    location?: string;
    status?: 'Active' | 'Inactive' | 'Maintenance';
    description?: string;
}