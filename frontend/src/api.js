import axios from "axios";
import api from "../api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export default api;