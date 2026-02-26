// src/services/strategyService.ts
import axios from "axios";
import { Strategy } from "../model/Strategy.ts";
import { PerformanceMetrics } from "../model/Performance.ts";
import { MarketRegime } from "../model/MarketRegime.ts";
import { StrategyResponse } from "../model/StrategyResponse.ts";

const API = axios.create({
  baseURL: "http://192.168.1.66:8001/api", // change to your FastAPI backend
  headers: {
    "Content-Type": "application/json",
  },
});

// Get all strategies
export async function fetchStrategies(): Promise<Strategy[]> {
  const res = await API.get<Strategy[]>("/strategies");
  return res.data;
}

// Get one strategy
export async function fetchStrategyById(id: number): Promise<Strategy> {
  const res = await API.get<Strategy>(`/get-strategy/${id}`);
  return res.data;
}

// api/strategy.ts
export async function checkStrategyName(name: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ name });
  const res = await API.get(`/check-username?${params.toString()}`, { signal });

  if (!res.status) throw new Error("Failed to check name");
  return (await res.data) as { name: string; taken: boolean };
}


// Create new strategy
export async function createStrategy(strategy: Strategy): Promise<StrategyResponse> {
  const { data } = await API.post<StrategyResponse>("/save-strategy", strategy);
  return data;
}

export async function runInSample(strategy: Strategy): Promise<Strategy> {
  const { data } = await API.post<Strategy>("/run-insample", strategy);
  return data;
}


export async function equityGraph(strategyId: number) {
  const { data } = await API.get(`/${strategyId}/equity`);
  return data; 
}

export async function saveMarketRegime(marketRegime: MarketRegime) {
  const { data } = await API.post("/save-marketregime-v2", marketRegime);
  return data;
}

export const runBacktest = async (strategy: Strategy) => {
  const response = await API.post("/runbacktestv2", strategy, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data; // BacktestResponseDto
};


export async function fetchPerformanceData(strategyId: number): Promise<PerformanceMetrics> {
  const { data } = await API.get<PerformanceMetrics>(`/${strategyId}/performance`);
  return data;
}


export async function fetchMarketRegimes(strategyId: number): Promise<MarketRegime[]> {
  const { data } = await API.get(`/marketregime/${strategyId}`);
  return data;
}


// Update existing strategy
export async function updateStrategy(id: number, strategy: Partial<Strategy>): Promise<Strategy> {
  const res = await API.put<Strategy>(`/update-strategy/${id}`, strategy);
  return res.data;
}

// Delete strategy
export async function deleteStrategy(id: number): Promise<void> {
  await API.delete(`/strategies/${id}`);
}


// Download tradelist CSV
export async function downloadTradelist(strategyId: number, systemName: string): Promise<Blob> {
  const { data } = await API.get(`/${strategyId}/download/tradelist`, {
    params: { system_name: systemName },
    responseType: "blob",
  });
  return data;
}

// Download equity CSV
export async function downloadEquity(strategyId: number, systemName: string): Promise<Blob> {
  const { data } = await API.get(`/${strategyId}/download/equity`, {
    params: { system_name: systemName },
    responseType: "blob",
  });
  return data;
}


export async function saveStrategy():Promise<void>{

}

