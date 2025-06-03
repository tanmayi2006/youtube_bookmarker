const addNewBookmark = (bookmarks, bookmark) => {
  const bookmarkTitleElement = document.createElement("div");
  const controlsElement = document.createElement("div");
  const newBookmarkElement = document.createElement("div");

  bookmarkTitleElement.textContent = bookmark.desc;
  bookmarkTitleElement.className = "bookmark-title";
  controlsElement.className = "bookmark-controls";

  setBookmarkAttributes("play", onPlay, controlsElement);
  setBookmarkAttributes("delete", onDelete, controlsElement);

  newBookmarkElement.id = "bookmark-" + bookmark.time;
  newBookmarkElement.className = "bookmark";
  newBookmarkElement.setAttribute("timestamp", bookmark.time);

  newBookmarkElement.appendChild(bookmarkTitleElement);
  newBookmarkElement.appendChild(controlsElement);
  bookmarks.appendChild(newBookmarkElement);
};

const viewBookmarks = (currentBookmarks = []) => {
  const bookmarksElement = document.getElementById("bookmarks");
  bookmarksElement.innerHTML = "";

  if (currentBookmarks.length > 0) {
    for (let i = 0; i < currentBookmarks.length; i++) {
      const bookmark = currentBookmarks[i];
      addNewBookmark(bookmarksElement, bookmark);
    }
  } else {
    bookmarksElement.innerHTML = '<i class="row">No bookmarks to show</i>';
  }
};

const onPlay = async e => {
  if (!chrome.runtime.id) {
    console.error('Extension context invalidated');
    return;
  }

  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  const activeTab = await getActiveTabURL();

  if (activeTab.url.includes("youtube.com/watch")) {
    try {
      await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(activeTab.id, {
          type: "PLAY",
          value: bookmarkTime,
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.error('Failed to send PLAY message:', error.message);
    }
  } else {
    console.warn('Active tab is not a YouTube watch page');
  }
};

const onDelete = async e => {
  if (!chrome.runtime.id) {
    console.error('Extension context invalidated');
    return;
  }

  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  const activeTab = await getActiveTabURL();

  if (activeTab.url.includes("youtube.com/watch")) {
    const bookmarkElementToDelete = document.getElementById("bookmark-" + bookmarkTime);
    if (bookmarkElementToDelete) {
      bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete);
    }

    try {
      const updatedBookmarks = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(activeTab.id, {
          type: "DELETE",
          value: bookmarkTime,
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response || []);
          }
        });
      });

      // Re-fetch bookmarks to ensure UI consistency
      const queryParameters = activeTab.url.split("?")[1] || "";
      const urlParameters = new URLSearchParams(queryParameters);
      const currentVideo = urlParameters.get("v");

      chrome.storage.sync.get([currentVideo], (data) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          viewBookmarks(updatedBookmarks);
        } else {
          const currentVideoBookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
          viewBookmarks(currentVideoBookmarks);
        }
      });
    } catch (error) {
      console.error('Failed to send DELETE message:', error.message);
      // Re-fetch bookmarks to recover
      const queryParameters = activeTab.url.split("?")[1] || "";
      const urlParameters = new URLSearchParams(queryParameters);
      const currentVideo = urlParameters.get("v");

      chrome.storage.sync.get([currentVideo], (data) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          viewBookmarks([]);
        } else {
          const currentVideoBookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
          viewBookmarks(currentVideoBookmarks);
        }
      });
    }
  } else {
    console.warn('Active tab is not a YouTube watch page');
  }
};

const setBookmarkAttributes = (src, eventListener, controlParentElement) => {
  const controlElement = document.createElement("img");

  controlElement.src = "assets/" + src + ".png";
  controlElement.title = src;
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();
  const queryParameters = activeTab.url.split("?")[1] || "";
  const urlParameters = new URLSearchParams(queryParameters);

  const currentVideo = urlParameters.get("v");

  if (activeTab.url.includes("youtube.com/watch") && currentVideo) {
    chrome.storage.sync.get([currentVideo], (data) => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        viewBookmarks([]);
      } else {
        const currentVideoBookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
        viewBookmarks(currentVideoBookmarks);
      }
    });
  } else {
    const container = document.getElementsByClassName("container")[0];
    container.innerHTML = '<div class="title">This is not a YouTube video page.</div>';
  }
});