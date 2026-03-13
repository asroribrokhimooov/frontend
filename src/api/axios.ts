import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL as string | undefined;

export const api = axios.create({
  baseURL: baseURL || '',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const data = response.data as { data?: unknown };
    response.data = data?.data !== undefined ? data.data : response.data;
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
