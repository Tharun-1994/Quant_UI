/**
 * api.ts
 * ======
 * Single source of truth for the backend API base URL.
 *
 * HOW TO CHANGE THE URL
 * ---------------------
 * Change it here only. Every service file imports this instance.
 * Never write axios.create({ baseURL: "..." }) anywhere else.
 *
 * For environment-based config (dev vs prod):
 *   baseURL: process.env.REACT_APP_API_URL ?? "http://192.168.1.66:8001/api"
 */

import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL ?? "http://192.168.1.66:8001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default API;