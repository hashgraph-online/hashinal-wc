import retryFetch from "fetch-retry";
const fetchWithRetry = () => retryFetch(fetch, {
  retries: 3
});
export {
  fetchWithRetry
};
//# sourceMappingURL=retry.js.map
