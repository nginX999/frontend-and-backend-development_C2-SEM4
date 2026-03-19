import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
});

export const getUsers = () => apiClient.get('/users');
export const getUserById = (id) => apiClient.get(`/users/${id}`);
export const createUser = (data) => apiClient.post('/users', data);
export const updateUser = (id, data) => apiClient.put(`/users/${id}`, data);
export const deleteUser = (id) => apiClient.delete(`/users/${id}`);

export default apiClient;