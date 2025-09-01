export interface Audit {
    id: number;
    name: string;
    description: string;
    status: 'Created' | 'In_Progress' | 'Completed';
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    created_by: number;
    assets_count: number;
}

export interface CreateAuditRequest {
    name: string;
    description?: string;
    asset_ids?: number[];
}