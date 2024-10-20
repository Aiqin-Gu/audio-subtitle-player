document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audioPlayer');
    const subtitlesDiv = document.getElementById('subtitles');
    const audioInput = document.getElementById('audioInput');
    const srtInput = document.getElementById('srtInput');
    const exportButton = document.getElementById('exportBookmarks');
    const showBookmarkedButton = document.getElementById('showBookmarked');
    const showAllButton = document.getElementById('showAll');
    const exportSavedWordsButton = document.getElementById('exportSavedWords');
    let bookmarks = new Set();
    let showOnlyBookmarked = false;
    let savedWords = new Set();
    let currentSrtFile = '';

    let subtitles = [];

    const tooltip = document.getElementById('tooltip');
    let tooltipTimeout;

    audioInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        const fileURL = URL.createObjectURL(file);
        audioPlayer.src = fileURL;
    });

    srtInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        currentSrtFile = file.name;
        const reader = new FileReader();

        reader.onload = (e) => {
            const srtContent = e.target.result;
            subtitles = parseSRT(srtContent);
            if (!loadState(currentSrtFile)) {
                // If no saved state, reset bookmarks and savedWords
                bookmarks = new Set();
                savedWords = new Set();
            }
            displaySubtitles();
        };

        reader.readAsText(file);
    });

    audioPlayer.addEventListener('timeupdate', () => {
        const currentTime = audioPlayer.currentTime;
        highlightCurrentSubtitle(currentTime);
    });

    exportButton.addEventListener('click', exportBookmarks);
    showBookmarkedButton.addEventListener('click', () => {
        showOnlyBookmarked = true;
        displaySubtitles();
    });
    showAllButton.addEventListener('click', () => {
        showOnlyBookmarked = false;
        displaySubtitles();
    });
    exportSavedWordsButton.addEventListener('click', exportSavedWords);

    function parseSRT(srtContent) {
        const subtitleBlocks = srtContent.trim().split('\n\n');
        return subtitleBlocks.flatMap(block => {
            const [id, time, ...textLines] = block.split('\n');
            const [startTime, endTime] = time.split(' --> ').map(timeToSeconds);
            const fullText = textLines.join(' ');
            
            // Split the text into sentences
            const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
            
            return sentences.map((sentence, index) => ({
                id: parseInt(id) + index / 100,
                startTime,
                endTime,
                text: sentence.trim()
            }));
        });
    }

    function timeToSeconds(timeString) {
        const [hours, minutes, seconds] = timeString.split(':').map(parseFloat);
        return hours * 3600 + minutes * 60 + seconds;
    }

    function displaySubtitles() {
        const subtitlesToShow = showOnlyBookmarked 
            ? subtitles.filter(subtitle => bookmarks.has(subtitle.id.toString()))
            : subtitles;

        subtitlesDiv.innerHTML = subtitlesToShow.map(subtitle => `
            <p class="subtitle ${bookmarks.has(subtitle.id.toString()) ? 'bookmarked-text' : ''}" data-start="${subtitle.startTime}" data-end="${subtitle.endTime}">
                <i class="fas fa-bookmark bookmark-icon ${bookmarks.has(subtitle.id.toString()) ? 'bookmarked' : ''}" data-id="${subtitle.id}"></i>
                <span class="subtitle-text">${wrapWordsInSpan(subtitle.text)}</span>
            </p>
        `).join('');

        subtitlesDiv.querySelectorAll('.subtitle').forEach(subtitleElement => {
            const id = subtitleElement.querySelector('.bookmark-icon').dataset.id;
            if (bookmarks.has(id)) {
                subtitleElement.classList.add('bookmarked-text');
                subtitleElement.querySelector('.bookmark-icon').classList.add('bookmarked');
            }
        });

        subtitlesDiv.querySelectorAll('.word').forEach(wordElement => {
            const word = wordElement.dataset.word.toLowerCase();
            if (savedWords.has(word)) {
                wordElement.classList.add('saved-word');
            }
        });

        subtitlesDiv.querySelectorAll('.subtitle').forEach(subtitleElement => {
            subtitleElement.addEventListener('click', (event) => {
                if (!event.target.classList.contains('bookmark-icon')) {
                    audioPlayer.currentTime = parseFloat(subtitleElement.dataset.start);
                    audioPlayer.play();
                }
            });
        });

        subtitlesDiv.querySelectorAll('.bookmark-icon').forEach(icon => {
            icon.addEventListener('click', (event) => {
                const id = event.target.dataset.id;
                if (bookmarks.has(id)) {
                    bookmarks.delete(id);
                    event.target.classList.remove('bookmarked');
                    event.target.closest('.subtitle').querySelector('.subtitle-text').classList.remove('bookmarked-text');
                } else {
                    bookmarks.add(id);
                    event.target.classList.add('bookmarked');
                    event.target.closest('.subtitle').querySelector('.subtitle-text').classList.add('bookmarked-text');
                }
            });
        });

        addWordHoverListeners();
        addWordRightClickListeners();
    }

    function wrapWordsInSpan(text) {
        return text.split(' ').map(word => {
            const cleanWord = word.replace(/[^a-zA-Z]/g, '');
            const isWordSaved = savedWords.has(cleanWord.toLowerCase());
            return `<span class="word ${isWordSaved ? 'saved-word' : ''}" data-word="${cleanWord}">${word}</span>`;
        }).join(' ');
    }

    function addWordHoverListeners() {
        const words = subtitlesDiv.querySelectorAll('.word');
        words.forEach(word => {
            word.addEventListener('mouseenter', handleWordHover);
            word.addEventListener('mouseleave', handleWordLeave);
        });
    }

    function addWordRightClickListeners() {
        const words = subtitlesDiv.querySelectorAll('.word');
        words.forEach(word => {
            word.addEventListener('contextmenu', handleWordRightClick);
        });
    }

    function handleWordHover(event) {
        const word = event.target.textContent;
        tooltipTimeout = setTimeout(() => {
            showTooltip(word, event.target);
        }, 1000);
    }

    function handleWordLeave() {
        clearTimeout(tooltipTimeout);
        hideTooltip();
    }

    function showTooltip(word, element) {
        const explanation = getWordExplanation(word);
        tooltip.textContent = explanation;
        tooltip.style.display = 'block';
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    }

    function hideTooltip() {
        tooltip.style.display = 'none';
    }

    function getWordExplanation(word) {
        // This is a mock dictionary function. Replace with a real dictionary API in production.
        const mockDictionary = {
            'hello': 'A greeting',
            'world': 'The earth, together with all of its countries and peoples',
            // Add more words and definitions as needed
        };
        return mockDictionary[word.toLowerCase()] || 'No definition available';
    }

    function highlightCurrentSubtitle(currentTime) {
        subtitlesDiv.querySelectorAll('.subtitle').forEach(subtitleElement => {
            const start = parseFloat(subtitleElement.dataset.start);
            const end = parseFloat(subtitleElement.dataset.end);
            if (currentTime >= start && currentTime <= end) {
                subtitleElement.classList.add('highlight');
            } else {
                subtitleElement.classList.remove('highlight');
            }
        });
    }

    function exportBookmarks() {
        const bookmarkedContent = subtitles
            .filter(subtitle => bookmarks.has(subtitle.id.toString()))
            .map(subtitle => subtitle.text)
            .join('\n\n');

        if (bookmarkedContent) {
            const blob = new Blob([bookmarkedContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bookmarked_sentences.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            alert('No bookmarks to export.');
        }
    }

    function handleWordRightClick(event) {
        event.preventDefault();
        const wordElement = event.target;
        const word = wordElement.dataset.word.toLowerCase();
        
        if (savedWords.has(word)) {
            savedWords.delete(word);
            wordElement.classList.remove('saved-word');
        } else {
            savedWords.add(word);
            wordElement.classList.add('saved-word');
        }
        saveState();
    }

    function exportSavedWords() {
        if (savedWords.size > 0) {
            const wordList = Array.from(savedWords).join('\n');
            const blob = new Blob([wordList], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'saved_words.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            alert('No saved words to export.');
        }
    }

    // Function to save state
    function saveState() {
        const state = {
            bookmarks: Array.from(bookmarks),
            savedWords: Array.from(savedWords),
            currentTime: audioPlayer.currentTime,
            srtFileName: currentSrtFile
        };
        localStorage.setItem('audioPlayerState', JSON.stringify(state));
    }

    // Save state when user leaves the page
    window.addEventListener('beforeunload', saveState);

    // Function to load state
    function loadState(srtFileName) {
        const savedState = localStorage.getItem('audioPlayerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            if (state.srtFileName === srtFileName) {
                bookmarks = new Set(state.bookmarks);
                savedWords = new Set(state.savedWords);
                audioPlayer.currentTime = state.currentTime;
                return true;
            }
        }
        return false;
    }
});
