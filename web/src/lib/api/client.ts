import { ApiError } from '../types';

export const BASE_URL = 'https://d2mdvlnmyov1e1.cloudfront.net';

export async function fetchApi<T>(
  endpoint: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL(endpoint, BASE_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }

  return response.json();
}
