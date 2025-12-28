import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Survey Providers
  getSurveyProviders: async () => {
    const response = await axios.get(`${API}/surveys/providers`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  getSurveyHistory: async () => {
    const response = await axios.get(`${API}/surveys/history`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  getTransactions: async () => {
    const response = await axios.get(`${API}/transactions`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Stats
  getStats: async () => {
    const response = await axios.get(`${API}/stats`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Wallet
  getWallet: async () => {
    const response = await axios.get(`${API}/wallet`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  requestWithdrawal: async (amount, method, accountDetails) => {
    const response = await axios.post(`${API}/withdrawals`, {
      amount,
      method,
      account_details: accountDetails
    }, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  getWithdrawals: async () => {
    const response = await axios.get(`${API}/withdrawals`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Leaderboard
  getLeaderboard: async () => {
    const response = await axios.get(`${API}/leaderboard`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  }
};
