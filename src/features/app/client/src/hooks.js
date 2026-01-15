import { useState, useEffect } from 'react';
import { api } from './api';

// A generic custom hook for fetching data with caching simulation.
// In a real-world app, this would be replaced by a library like React Query or SWR.
const useApiCache = (key, fetcher) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If the key is null (e.g., no workspaceId provided), don't fetch.
    if (!key) {
      setData(null);
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const result = await fetcher();
        if (!isCancelled) {
          setData(result);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    
    load();

    return () => {
      isCancelled = true;
    };
  }, [key]); // key changes will trigger a re-fetch

  // The 'mutate' function allows for optimistic updates from the UI.
  return { data, error, loading, mutate: setData };
};

export const useWorkspaces = () => {
  // The fetcher function now correctly returns the 'workspaces' array from the API response.
  return useApiCache('workspaces', async () => {
    const response = await api.getWorkspaces();
    return response.workspaces;
  });
};

export const useThreads = (workspaceId) => {
  // The fetcher function now correctly returns the 'threads' array from the API response.
  return useApiCache(workspaceId ? `threads-${workspaceId}` : null, async () => {
    const response = await api.getThreads(workspaceId);
    return response.threads;
  });
};

export const useMessages = (threadId) => {
  // The fetcher function now correctly returns the 'messages' array from the API response.
  return useApiCache(threadId ? `messages-${threadId}` : null, async () => {
    const response = await api.getMessages(threadId);
    return response.messages;
  });
};
