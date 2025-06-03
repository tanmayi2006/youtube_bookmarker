function getTime(t) {
  var date = new Date(0);
  date.setSeconds(t);
  return date.toISOString().substr(11, 8);
}

function getActiveTabURL() {
  return chrome.tabs.query({
    currentWindow: true,
    active: true
  }).then(tabs => tabs[0]);
}