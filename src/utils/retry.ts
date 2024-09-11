import retryFn from 'async-await-retry';
import retryFetch from 'fetch-retry';
import isomorphicFetch from 'isomorphic-fetch';

export const retry = async <T>(callback: () => Promise<T>) => {
  try {
    return await retryFn(callback, undefined, {
      interval: 1500,
      exponential: true,
    });
  } catch (e) {
    console.log('got err retrying', e);
    return null;
  }
};

export const fetchWithRetry = retryFetch(isomorphicFetch, {
  retries: 3,
});
