// content.js

// Function to extract music information from the YouTube Music page
function getYTMusicInfo() {
    var artistElement = document.querySelector('.ytmusic-player-bar .yt-formatted-string');
    var songURLElement = document.querySelector('.ytmusic-player-bar .yt-formatted-string');
    var title = document.querySelector('.ytmusic-player-bar .title');
    var result = { artist: '', songURL: '', title: '' };
    if (artistElement) {
        result['artist'] = artistElement.textContent || artistElement.innerText || '';
    }
    if (songURLElement) {
        result['songURL'] = songURLElement.href || '';
    }
    if (title) {
        result['title'] = title.title;
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
