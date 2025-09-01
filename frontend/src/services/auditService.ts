import api from './api';
import { Audit, CreateAuditRequest } from '../types/Audit';
import { Asset } from '../types/Asset';

interface AuditListResponse {
    audits: Audit[];
    total: number;
}

export const auditService = {
    // US-004: Crear auditorías
    createAudit: async (audit: CreateAuditRequest): Promise<{ message: string; audit: Audit }> => {
        const response = await api.post('/audits', audit);
        return response.data;
    },

    // US-004: Listar auditorías
    getAudits: async (status?: string): Promise<AuditListResponse> => {
        const params = status ? { status } : undefined;
        const response = await api.get('/audits', { params });
        return response.data;
    },

    // US-004: Actualizar auditoría
    updateAudit: async (id: number, audit: Partial<CreateAuditRequest & { status: string }>): Promise<{ message: string; audit: Audit }> => {
        const response = await api.put(`/audits/${id}`, audit);
        return response.data;
    },

    // US-004: Asignar activos a auditoría
    assignAssets: async (auditId: number, assetIds: number[]): Promise<{ message: string; assigned_assets: Asset[] }> => {
        const response = await api.post(`/audits/${auditId}/assets`, { asset_ids: assetIds });
        return response.data;
    },

    // US-004: Obtener activos de auditoría
    getAuditAssets: async (auditId: number): Promise<{ audit: Audit; assets: Asset[]; total_assets: number }> => {
        const response = await api.get(`/audits/${auditId}/assets`);
        return response.data;
    },
};