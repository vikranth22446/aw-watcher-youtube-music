// content.js

// Function to extract music information from the YouTube Music page
function convertToCommaSeparatedList(selector) {
    var element = document.querySelector(selector);
  
    if (element) {
      // Extract text content and remove leading/trailing whitespaces
      var textContent = element.textContent.trim();
  
      // Split the text content into an array using line breaks as the delimiter
      var tagsArray = textContent.split('\n').map(function(tag) {
        // Remove leading/trailing whitespaces from each tag
        return tag.trim();
      });
  
      // Filter out empty elements
      var nonEmptyTagsArray = tagsArray.filter(function(tag) {
        return tag !== '' && tag !== 'All' && tag !== 'Familiar' && tag !== 'Discover';
      });
  
      // Join the non-empty array elements into a comma-separated string
      var commaSeparatedList = nonEmptyTagsArray.join(', ');
  
      return commaSeparatedList;
    } else {
      return null; // or any other value indicating that the element was not found
    }
}
function getGenre() {
    var selector = 'ytmusic-player-queue.queue #chips';
    return convertToCommaSeparatedList(selector);
}
function getTitleLinkHref() {
    var titleLinkElement = document.querySelector('.ytp-title a.ytp-title-link');
  
    if (titleLinkElement) {
      return titleLinkElement.href;
    } else {
      return null; // or any other value indicating that the element was not found
    }
}

function getYTMusicInfo() {
    var artistElement = document.querySelector('.ytmusic-player-bar .yt-formatted-string');
    var channelURL = document.querySelector('.ytmusic-player-bar .yt-formatted-string');
    var songURL = getTitleLinkHref();
    var title = document.querySelector('.ytmusic-player-bar .title');
    var genre = getGenre();

    var result = { artist: '', songURL: '', title: '', channelURL: '', songURL: '', genre: ''};
    if (artistElement) {
        result['artist'] = artistElement.textContent || artistElement.innerText || '';
    }
    if (channelURL) {
        result['channelURL'] = channelURL.href || '';
    }
    if (songURL) {
        result['songURL'] = songURL || '';
    }
    if (title) {
        result['title'] = title.title;
    }
    if (genre) {
        result['genre'] = genre;
    }
    return result;
}

// Function to periodically send music information to the background script
function sendMusicInfoPeriodically() {
    var musicInfo = getYTMusicInfo();
    browser.runtime.sendMessage({ type: 'ytMusicInfo', data: musicInfo });
}

// Execute when the page is loaded or when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        // Send music information immediately
        sendMusicInfoPeriodically();

        // Periodically send music information every 5 seconds
        setInterval(sendMusicInfoPeriodically, 5000);
    });
} else {
    // Send music information immediately
    sendMusicInfoPeriodically();

    // Periodically send music information every 5 seconds
    setInterval(sendMusicInfoPeriodically, 5000);
}
