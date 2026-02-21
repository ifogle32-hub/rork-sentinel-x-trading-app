import {
  EngineStatus,
  EngineHeartbeat,
  EnginePortfolio,
  EngineMetrics,
  EngineStrategy,
} from '@/types/engine';

const ENGINE_BASE_URL = 'http://10.0.0.23:8000';
const REQUEST_TIMEOUT = 6000;

const fetchWithTimeout = async (url: string): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    console.log(`[EngineAPI] GET ${url}`);
    const response = await fetch(url, { signal: controller.signal });
    console.log(`[EngineAPI] ${url} → ${response.status}`);
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`[EngineAPI] Timeout: ${url}`);
      throw new Error('Engine request timed out');
    }
    console.log(`[EngineAPI] Network error: ${url}`);
    throw new Error('Engine unreachable');
  } finally {
    clearTimeout(timeoutId);
  }
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`Engine returned ${response.status}`);
  }
  return response.json();
};

export const engineApi = {
  getStatus: async (): Promise<EngineStatus> => {
    const response = await fetchWithTimeout(`${ENGINE_BASE_URL}/status`);
    return handleResponse<EngineStatus>(response);
  },

  getHeartbeat: async (): Promise<EngineHeartbeat> => {
    const response = await fetchWithTimeout(`${ENGINE_BASE_URL}/heartbeat`);
    return handleResponse<EngineHeartbeat>(response);
  },

  getPortfolio: async (): Promise<EnginePortfolio> => {
    const response = await fetchWithTimeout(`${ENGINE_BASE_URL}/portfolio`);
    return handleResponse<EnginePortfolio>(response);
  },

  getMetrics: async (): Promise<EngineMetrics> => {
    const response = await fetchWithTimeout(`${ENGINE_BASE_URL}/metrics`);
    return handleResponse<EngineMetrics>(response);
  },

  getStrategy: async (): Promise<EngineStrategy> => {
    const response = await fetchWithTimeout(`${ENGINE_BASE_URL}/strategy`);
    return handleResponse<EngineStrategy>(response);
  },
};
