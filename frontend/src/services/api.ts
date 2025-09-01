import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Configurar axios con interceptor para el token
const api = axios.create({
    baseURL: API_BASE_URL,
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;