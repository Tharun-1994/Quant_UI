// src/services/strategyService.ts
import API from "../config/api.ts";
import { Strategy } from "../model/Strategy.ts";
import { PerformanceMetrics } from "../model/Performance.ts";
import { MarketRegime } from "../model/MarketRegime.ts";
import { StrategyResponse } from "../model/StrategyResponse.ts";

export async function fetchStrategies(): Promise<Strategy[]> {
  const res = await API.get<Strategy[]>("/strategies");
  return res.data;
}

export async function fetchStrategyById(id: number): Promise<Strategy> {
  const res = await API.get<Strategy>(`/get-strategy/${id}`);
  return res.data;
}

export async function checkStrategyName(name: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ name });
  const res = await API.get(`/check-username?${params.toString()}`, { signal });
  if (!res.status) throw new Error("Failed to check name");
  return res.data as { name: string; taken: boolean };
}

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
  const response = await API.post("/runbacktestv2", strategy);
  return response.data;
};

export async function fetchPerformanceData(strategyId: number): Promise<PerformanceMetrics> {
  const { data } = await API.get<PerformanceMetrics>(`/${strategyId}/performance`);
  return data;
}

export async function fetchMarketRegimes(strategyId: number): Promise<MarketRegime[]> {
  const { data } = await API.get(`/marketregime/${strategyId}`);
  return data;
}

export async function updateStrategy(id: number, strategy: Partial<Strategy>): Promise<Strategy> {
  const res = await API.put<Strategy>(`/update-strategy/${id}`, strategy);
  return res.data;
}

export async function deleteStrategy(id: number): Promise<void> {
  await API.delete(`/strategies/${id}`);
}

export async function downloadTradelist(strategyId: number, systemName: string): Promise<Blob> {
  const { data } = await API.get(`/${strategyId}/download/tradelist`, {
    params: { system_name: systemName },
    responseType: "blob",
  });
  return data;
}

export async function downloadEquity(strategyId: number, systemName: string): Promise<Blob> {
  const { data } = await API.get(`/${strategyId}/download/equity`, {
    params: { system_name: systemName },
    responseType: "blob",
  });
  return data;
}

export interface InputFile {
  filename: string;
  name: string;
  category: "prices" | "dates" | "universe" | "indicator";
  size_kb: number;
}

export async function fetchInputFiles(strategyId: number, systemName: string): Promise<InputFile[]> {
  const { data } = await API.get<InputFile[]>(`/${strategyId}/input-files`, {
    params: { system_name: systemName },
  });
  return data;
}

export async function downloadInputFile(
  strategyId: number,
  systemName: string,
  filename: string
): Promise<Blob> {
  const { data } = await API.get(`/${strategyId}/download-input/${filename}`, {
    params: { system_name: systemName },
    responseType: "blob",
  });
  return data;
}