import api from './api';
import { User } from '../types/User';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    user: User;
    message: string;
}

export const authService = {
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        const response = await api.post('/auth/login', credentials);
        return response.data.access_token ? response.data : { access_token: response.data.access_token, user: response.data.user, message: 'Credenciales inválidas' };
    },

    getProfile: async (): Promise<{ user: User }> => {
        const response = await api.get('/auth/profile');
        return response.data;
    },
};