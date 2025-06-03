chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes("youtube.com/watch")) {
    const queryParameters = tab.url.split("?")[1];
    const urlParameters = new URLSearchParams(queryParameters);

    const videoId = urlParameters.get("v");
    if (videoId) {
      chrome.tabs.sendMessage(tabId, {
        type: "NEW",
        videoId: videoId,
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Failed to send NEW message:', chrome.runtime.lastError.message);
        }
      });
    }
  }
});