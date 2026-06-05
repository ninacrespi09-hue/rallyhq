"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.code = data.code;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function useApiQuery(key, url, options = {}) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: () => apiFetch(url),
    ...options,
  });
}

export function useApiMutation({ url, method = "POST", invalidateKeys = [] } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      apiFetch(url, {
        method,
        body: body != null ? JSON.stringify(body) : undefined,
      }),
    onSuccess: () => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
      }
    },
  });
}

export { apiFetch };
