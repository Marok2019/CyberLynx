import api from './api';
import { Asset, CreateAssetRequest } from '../types/Asset';

interface AssetListResponse {
    assets: Asset[];
    total: number;
    pages: number;
    current_page: number;
}

export const assetService = {
    // US-001: Crear activos
    createAsset: async (asset: CreateAssetRequest): Promise<{ message: string; asset: Asset }> => {
        const response = await api.post('/assets', asset);
        return response.data;
    },

    // US-002: Listar y filtrar activos
    getAssets: async (params?: {
        name?: string;
        type?: string;
        status?: string;
        page?: number;
    }): Promise<AssetListResponse> => {
        const response = await api.get('/assets', { params });
        return response.data;
    },

    // US-003: Actualizar activo
    updateAsset: async (id: number, asset: Partial<CreateAssetRequest>): Promise<{ message: string; asset: Asset }> => {
        const response = await api.put(`/assets/${id}`, asset);
        return response.data;
    },

    // US-003: Eliminar activo
    deleteAsset: async (id: number): Promise<{ message: string }> => {
        const response = await api.delete(`/assets/${id}`);
        return response.data;
    },
};