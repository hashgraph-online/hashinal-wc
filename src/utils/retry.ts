import retryFetch from 'fetch-retry';

export const fetchWithRetry = () =>
  retryFetch(fetch, {
    retries: 3,
  });
