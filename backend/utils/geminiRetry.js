function isRetryableGeminiError(response, data) {
  return (
    data?.error?.code === 429 ||
    [500, 502, 503, 504].includes(response?.status) ||
    data?.error?.status === "UNAVAILABLE" ||
    data?.error?.status === "RESOURCE_EXHAUSTED"
  );
}

module.exports = { isRetryableGeminiError };
