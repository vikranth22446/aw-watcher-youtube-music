"use strict";
/*
 * This code uses event pages, a special webextension thingy documented here:
 * https://developer.chrome.com/extensions/event_pages
 */

var client = require("./client.js");


// Mininum guaranteed in chrome is 1min
var check_interval = 5;
var max_check_interval = 60;
var heartbeat_interval = 20;
var heartbeat_pulsetime = heartbeat_interval + max_check_interval;


// Global variable to store current music information
var currentMusicInfo = { artist: '', songURL: '', title: '', channelURL: '', songURL: '', genre: ''};

// Function to handle the received music information
function handleMusicInfo(musicInfo) {
  // Update the global variable with the current music information
  currentMusicInfo = musicInfo;
  // console.log('Artist:', musicInfo.artist);
  // console.log('Song URL:', musicInfo.songURL);

  // You can perform further actions with the information here
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === 'ytMusicInfo') {
    handleMusicInfo(message.data);
  }
});



function getCurrentTabs(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    audible: true,
  };

  chrome.tabs.query(queryInfo, function (tabs) {
    callback(tabs);
  });
}

var last_heartbeat_data = null;
var last_heartbeat_time = null;
function getYTMusicTitle() {
  // Get the element with the class "ytmusic-player-bar"
  var playerBar = document.querySelector('.ytmusic-player-bar');

  // Check if the playerBar element exists before proceeding
  if (!playerBar) {
    console.error('Element with class "ytmusic-player-bar" not found');
    return '';
  }

  // Get the element with the class "title" inside the playerBar
  var titleElement = playerBar.querySelector('.title');

  // Check if the titleElement exists before accessing its title
  if (!titleElement) {
    console.error('Element with class "title" not found inside .ytmusic-player-bar');
    return '';
  }

  // Return the title of the element
  return titleElement.title || ''; // Return an empty string if the title attribute is not set
}

function getYTMusicArtist() {
  // Get the element with the class "ytmusic-player-bar"
  var playerBar = document.querySelector('.ytmusic-player-bar');

  // Check if the playerBar element exists before proceeding
  if (!playerBar) {
    console.error('Element with class "ytmusic-player-bar" not found');
    return '';
  }

  // Get the element with the class "yt-formatted-string" inside the playerBar for artist
  var artistElement = playerBar.querySelector('.yt-formatted-string');

  // Check if the artistElement exists before accessing its text
  if (!artistElement) {
    console.error('Element with class "yt-formatted-string" not found inside .ytmusic-player-bar');
    return '';
  }

  // Return the text of the element
  return artistElement.textContent || artistElement.innerText || ''; // Use whichever is available
}

function getYTMusicSongURL() {
  // Get the element with the class "ytmusic-player-bar"
  var playerBar = document.querySelector('.ytmusic-player-bar');

  // Check if the playerBar element exists before proceeding
  if (!playerBar) {
    console.error('Element with class "ytmusic-player-bar" not found');
    return '';
  }

  // Get the element with the class "yt-formatted-string" inside the playerBar for song URL
  var songURLElement = playerBar.querySelector('.yt-formatted-string');

  // Check if the songURLElement exists before accessing its URL
  if (!songURLElement) {
    console.error('Element with class "yt-formatted-string" not found inside .ytmusic-player-bar');
    return '';
  }

  // Return the URL of the element (assuming it has a URL attribute)
  return songURLElement.url || ''; // Adjust based on the actual structure of your HTML
}


function heartbeat(tab, tabCount) {
  //console.log(JSON.stringify(tab));
  var now = new Date();
  var title = currentMusicInfo.title;
  var musicArtist = currentMusicInfo.artist;
  var musicSongURL = currentMusicInfo.songURL;
  var genre = currentMusicInfo.genre;
  var channelURL = currentMusicInfo.channelURL;

  var data = {
    url: tab.url,
    tab_title: tab.title,
    
    title: title,
    artist: musicArtist,
    song_url: musicSongURL,
    channelURL:channelURL,
    genre: genre,

    audible: tab.audible,
    incognito: tab.incognito,
    tabCount: tabCount,
  };
  // First heartbeat on startup
  if (last_heartbeat_time === null) {
    //console.log("aw-watcher-web: First");
    client.sendHeartbeat(now, data, heartbeat_pulsetime);
    last_heartbeat_data = data;
    last_heartbeat_time = now;
  }
  // Any tab data has changed, finish previous event and insert new event
  else if (JSON.stringify(last_heartbeat_data) != JSON.stringify(data)) {
    //console.log("aw-watcher-web: Change");
    client.sendHeartbeat(
      new Date(now - 1),
      last_heartbeat_data,
      heartbeat_pulsetime
    );
    client.sendHeartbeat(now, data, heartbeat_pulsetime);
    last_heartbeat_data = data;
    last_heartbeat_time = now;
  }
  // If heartbeat interval has been exceeded
  else if (
    new Date(last_heartbeat_time.getTime() + heartbeat_interval * 1000) < now
  ) {
    //console.log("aw-watcher-web: Update");
    client.sendHeartbeat(now, data, heartbeat_pulsetime);
    last_heartbeat_time = now;
  }
}

/*
 * Heartbeat alarm
 */

function createNextAlarm() {
  var when = Date.now() + check_interval * 1000;
  chrome.alarms.create("heartbeat", { when: when });
}

function alarmListener(alarm) {
  if (alarm.name === "heartbeat") {
    getCurrentTabs(function (tabs) {
      if (tabs.length >= 1) {
        chrome.tabs.query({}, function (foundTabs) {
          heartbeat(tabs[0], foundTabs.length);
        });
      } else {
        //console.log("tabs had length < 0");
      }
      createNextAlarm();
    });
  }
}

function startAlarmListener() {
  chrome.alarms.onAlarm.addListener(alarmListener);
  createNextAlarm();
}

function stopAlarmListener() {
  chrome.alarms.onAlarm.removeListener(alarmListener);
}

/*
 * Heartbeat tab change
 */

function tabChangedListener(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    chrome.tabs.query({}, function (foundTabs) {
      heartbeat(tab, foundTabs.length);
    });
  });
}

function startTabChangeListener() {
  chrome.tabs.onActivated.addListener(tabChangedListener);
}

function stopTabChangeListener() {
  chrome.tabs.onActivated.removeListener(tabChangedListener);
}

/*
 * Start/stop logic
 */

function startWatcher() {
  console.log("Starting watcher");
  client.setup();
  startAlarmListener();
  startTabChangeListener();
}

function stopWatcher() {
  console.log("Stopping watcher");
  stopAlarmListener();
  stopTabChangeListener();
}

/*
 * Listen for events from popup.js
 */

function popupRequestReceived(msg) {
  if (msg.enabled != undefined) {
    chrome.storage.local.set({ enabled: msg.enabled });
    if (msg.enabled) {
      startWatcher();
    } else {
      stopWatcher();
    }
  }
}

async function askConsentNeeded() {
  // Source for compatibility check: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#handling_api_differences
  return false;
}

function getConsentThenStart() {
  // consentGiven is set in static/consent.js
  chrome.storage.local.get("consentGiven", (obj) => {
    if (obj.consentGiven === true) {
      startWatcher();
    } else {
      const url = chrome.runtime.getURL("../static/consent.html");
      chrome.windows.create({
        url,
        type: "popup",
        height: 550,
        width: 416,
      });
    }
  });
}

/*
 * Init
 */

function init() {
  chrome.storage.local.get("enabled", async function(obj) {
    // obj.enabled is undefined when the extension is first installed,
    // or if we need user consent, and they have yet to give it.
    if (obj.enabled == undefined) {
      if (await askConsentNeeded()) {
        getConsentThenStart();
      } else {
        // If we don't need consent, enable by default
        chrome.storage.local.set({ enabled: true });
        startWatcher();
      }
    } else if (obj.enabled) {
      startWatcher();
    }
  });
  // Listens to enables/disables by toggling the checkbox in the popup.
  chrome.runtime.onMessage.addListener(popupRequestReceived);
}

(function () {
  init();
})();
