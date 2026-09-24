import axios from 'axios';

const host = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';

const api = axios.create({
  baseURL: `http://${host}:3000/api`,
  withCredentials: true, // Send and receive session cookies
});

// Response interceptor to handle unauthenticated 401 redirects
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or not logged in.');
      // Optional: window.location.href = 'http://localhost:5173/login';
    }
    return Promise.reject(error);
  }
);

export default api;
