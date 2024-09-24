// Elements
const audioPlayer = document.getElementById('audioPlayer');
const subtitlesDiv = document.getElementById('subtitles');
const audioInput = document.getElementById('audioInput');
const srtInput = document.getElementById('srtInput');

// Placeholder for subtitles parsed from SRT file
let subtitles = [];

// Handle audio file selection
audioInput.addEventListener('change', function(event) {
    const audioFile = event.target.files[0];
    if (audioFile) {
        const audioURL = URL.createObjectURL(audioFile);
        loadAudio(audioURL);
    }
});

// Handle SRT file selection
srtInput.addEventListener('change', function(event) {
    const srtFile = event.target.files[0];
    if (srtFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const srtData = e.target.result;
            subtitles = parseSRT(srtData);
            renderSubtitles(subtitles);
        };
        reader.readAsText(srtFile);
    }
});

// Function to load audio file
function loadAudio(src) {
    audioPlayer.src = src;
}

// Function to parse SRT file
function parseSRT(data) {
    const regex = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\n*$)/g;
    const parsedSubtitles = [];
    let match;

    while ((match = regex.exec(data)) !== null) {
        parsedSubtitles.push({
            index: match[1],
            startTime: timeToSeconds(match[2]),
            endTime: timeToSeconds(match[3]),
            text: match[4].replace(/\n/g, ' ')
        });
    }

    return parsedSubtitles;
}

// Convert SRT time format (HH:MM:SS,MS) to seconds
function timeToSeconds(time) {
    const parts = time.split(/[:,]/);
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    const milliseconds = parseInt(parts[3], 10);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

// Render subtitles to the DOM
function renderSubtitles(subtitles) {
    subtitlesDiv.innerHTML = '';
    subtitles.forEach(subtitle => {
        const subtitleDiv = document.createElement('div');
        subtitleDiv.classList.add('subtitle');
        subtitleDiv.setAttribute('data-start-time', subtitle.startTime);
        subtitleDiv.textContent = subtitle.text;
        subtitlesDiv.appendChild(subtitleDiv);

        // Add click event to jump to specific audio time
        subtitleDiv.addEventListener('click', () => {
            audioPlayer.currentTime = subtitle.startTime;
            audioPlayer.play();
        });
    });
}

// Highlight the active subtitle
function highlightSubtitle() {
    const currentTime = audioPlayer.currentTime;
    subtitles.forEach((subtitle, index) => {
        const subtitleDiv = subtitlesDiv.children[index];
        if (currentTime >= subtitle.startTime && currentTime <= subtitle.endTime) {
            subtitleDiv.classList.add('highlight');
        } else {
            subtitleDiv.classList.remove('highlight');
        }
    });
}

// Attach time update event to highlight subtitle during playback
audioPlayer.addEventListener('timeupdate', highlightSubtitle);
