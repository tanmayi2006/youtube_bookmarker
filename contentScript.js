(() => {
  let youtubeLeftControls, youtubePlayer;
  let currentVideo = new URLSearchParams(window.location.search).get('v') || '';
  let currentVideoBookmarks = [];

  const fetchBookmarks = () => {
    return new Promise((resolve, reject) => {
      if (!currentVideo) {
        resolve([]);
        return;
      }
      chrome.storage.sync.get([currentVideo], (obj) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
        }
      });
    });
  };

  const addNewBookmarkEventHandler = async () => {
    if (!youtubePlayer) {
      console.error('YouTube player not found');
      return;
    }
    const currentTime = youtubePlayer.currentTime;
    const newBookmark = {
      time: currentTime,
      desc: "Bookmark at " + getTime(currentTime),
    };

    currentVideoBookmarks = await fetchBookmarks();

    const updatedBookmarks = [...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time);
    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify(updatedBookmarks)
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage set error:', chrome.runtime.lastError);
      } else {
        // Open the popup after adding a bookmark
        if (chrome.runtime.id) {
          chrome.action.openPopup({}, () => {
            if (chrome.runtime.lastError) {
              console.error('Failed to open popup:', chrome.runtime.lastError.message);
            }
          });
        }
      }
    });
  };

  const newVideoLoaded = async () => {
    youtubePlayer = document.getElementsByClassName('video-stream')[0];
    if (!youtubePlayer) {
      console.warn('YouTube player not ready, retrying...');
      setTimeout(newVideoLoaded, 1000);
      return;
    }

    const bookmarkBtnExists = document.getElementsByClassName("bookmark-btn")[0];
    currentVideoBookmarks = await fetchBookmarks();

    if (!bookmarkBtnExists) {
      const bookmarkBtn = document.createElement("img");

      bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
      bookmarkBtn.className = "ytp-button bookmark-btn";
      bookmarkBtn.title = "Click to bookmark current timestamp";

      youtubeLeftControls = document.querySelector(".ytp-left-controls");
      if (!youtubeLeftControls) {
        console.error('Could not find .ytp-left-controls');
        return;
      }

      youtubeLeftControls.appendChild(bookmarkBtn);
      bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
    }
  };

  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId } = obj;

    if (type === "NEW") {
      currentVideo = videoId || currentVideo;
      if (currentVideo) {
        newVideoLoaded();
      }
    } else if (type === "PLAY") {
      if (youtubePlayer) {
        youtubePlayer.currentTime = value;
      } else {
        console.error('YouTube player not found for PLAY action');
      }
    } else if (type === "DELETE") {
      fetchBookmarks().then(bookmarks => {
        currentVideoBookmarks = bookmarks.filter((b) => b.time != value);
        chrome.storage.sync.set({ [currentVideo]: JSON.stringify(currentVideoBookmarks) }, () => {
          if (chrome.runtime.lastError) {
            console.error('Storage set error:', chrome.runtime.lastError);
          }
          response(currentVideoBookmarks);
        });
      }).catch(error => {
        console.error('Failed to fetch bookmarks for DELETE:', error);
        response([]);
      });
    }
  });

  if (currentVideo && window.location.href.includes("youtube.com/watch")) {
    newVideoLoaded();
  }
})();