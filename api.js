// api.js - API Configuration and Helper Functions

const API_URL = 'http://localhost:5000/api';

// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// Set token to localStorage
const setToken = (token) => localStorage.setItem('token', token);

// Remove token from localStorage
const removeToken = () => localStorage.removeItem('token');

// Get user from localStorage
const getUser = () => JSON.parse(localStorage.getItem('user') || '{}');

// Set user to localStorage
const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));

// API Helper Function
const apiCall = async (endpoint, options = {}) => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Auth API
const authAPI = {
    register: async (userData) => {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        setToken(data.token);
        setUser(data.user);
        return data;
    },

    login: async (credentials) => {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        setToken(data.token);
        setUser(data.user);
        return data;
    },

    logout: () => {
        removeToken();
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    },

    getCurrentUser: async () => {
        return await apiCall('/auth/me');
    }
};

// Tasks API
const tasksAPI = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return await apiCall(`/tasks?${query}`);
    },

    getToday: async () => {
        return await apiCall('/tasks/today');
    },

    getMonthly: async (year, month) => {
        return await apiCall(`/tasks/monthly/${year}/${month}`);
    },

    create: async (taskData) => {
        return await apiCall('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    },

    update: async (taskId, updates) => {
        return await apiCall(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    delete: async (taskId) => {
        return await apiCall(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    },

    getStats: async () => {
        return await apiCall('/tasks/stats/summary');
    }
};

// Analytics API
const analyticsAPI = {
    get: async (days = 30) => {
        return await apiCall(`/analytics?days=${days}`);
    },

    getMonthly: async (year, month) => {
        return await apiCall(`/analytics/monthly/${year}/${month}`);
    }
};

// Rewards API
const rewardsAPI = {
    get: async () => {
        return await apiCall('/rewards');
    },

    getLeaderboard: async () => {
        return await apiCall('/rewards/leaderboard');
    }
};

// Export API
const exportAPI = {
    csv: (startDate, endDate) => {
        const token = getToken();
        const url = `${API_URL}/export/csv?startDate=${startDate}&endDate=${endDate}`;
        window.open(url, '_blank');
    },

    pdf: (startDate, endDate) => {
        const token = getToken();
        const url = `${API_URL}/export/pdf?startDate=${startDate}&endDate=${endDate}`;
        window.open(url, '_blank');
    }
};