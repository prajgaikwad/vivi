class PlayGenApp {
    constructor() {
        this.currentUser = null;
        this.selectedTrack = null;
        this.generatedTracks = [];
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Sections
        this.loginSection = document.getElementById('login-section');
        this.appSection = document.getElementById('app-section');
        
        // Login elements
        this.loginBtn = document.getElementById('login-btn');
        
        // User info elements
        this.userAvatar = document.getElementById('user-avatar');
        this.userName = document.getElementById('user-name');
        this.logoutBtn = document.getElementById('logout-btn');
        
        // Search elements
        this.songInput = document.getElementById('song-input');
        this.searchBtn = document.getElementById('search-btn');
        this.searchResults = document.getElementById('search-results');
        this.songList = document.getElementById('song-list');
        
        // Loading element
        this.loading = document.getElementById('loading');
        
        // Playlist elements
        this.playlistContainer = document.getElementById('playlist-container');
        this.playlistTracks = document.getElementById('playlist-tracks');
        this.savePlaylistBtn = document.getElementById('save-playlist-btn');
        this.generateNewBtn = document.getElementById('generate-new-btn');
        
        // Message container
        this.messageContainer = document.getElementById('message-container');
    }

    bindEvents() {
        // Login button
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        
        // Logout button
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Search functionality
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.songInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
        
        // Playlist actions
        this.savePlaylistBtn.addEventListener('click', () => this.handleSavePlaylist());
        this.generateNewBtn.addEventListener('click', () => this.handleGenerateNew());
    }

    // Handle authentication state changes
    handleAuthStateChange(isAuthenticated) {
        if (isAuthenticated) {
            this.showAppSection();
            this.loadUserProfile();
        } else {
            this.showLoginSection();
        }
    }

    // Show login section
    showLoginSection() {
        this.loginSection.classList.remove('hidden');
        this.appSection.classList.add('hidden');
    }

    // Show app section
    showAppSection() {
        this.loginSection.classList.add('hidden');
        this.appSection.classList.remove('hidden');
    }

    // Handle login button click
    async handleLogin() {
        try {
            await window.spotifyAuth.login();
        } catch (error) {
            console.error('Login failed:', error);
            this.showMessage('Login failed. Please try again.', 'error');
        }
    }

    // Handle logout button click
    handleLogout() {
        window.spotifyAuth.logout();
        this.currentUser = null;
        this.selectedTrack = null;
        this.generatedTracks = [];
        this.hideAllSections();
    }

    // Load user profile
    async loadUserProfile() {
        try {
            this.currentUser = await window.spotifyAPI.getCurrentUser();
            this.displayUserInfo();
        } catch (error) {
            console.error('Failed to load user profile:', error);
            this.showMessage('Failed to load user profile', 'error');
        }
    }

    // Display user information
    displayUserInfo() {
        if (this.currentUser) {
            this.userName.textContent = this.currentUser.display_name || 'User';
            if (this.currentUser.images && this.currentUser.images.length > 0) {
                this.userAvatar.src = this.currentUser.images[0].url;
            } else {
                this.userAvatar.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiMxREI5NTQiLz4KPHN2ZyB4PSIxNSIgeT0iMTUiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPgo8cGF0aCBkPSJtMjAgMTJjMCA0LjQzNzI4LTEuNTY3NTkgOC41LTQuMjUwNDUgMTEuMjIyNy0uNjE3ODUtLjczNjItMS4wOTE0NS0yLjc3OTItMS4wOTE0NS00LjIyMjcgMC01IDItNyA3LTcgMC0yLjc2MTQyIDIuMjM4NTgtNSA1LTV6bS04LjUgMGMwIDIuNzYxNDItMi4yMzg1OCA1LTUgNXMtNS0yLjIzODU4LTUtNXYtMmMwLTUuNTIyODUgNC40NzcxNS0xMCAxMC0xMHMxMCA0LjQ3NzE1IDEwIDEweiIvPgo8L3N2Zz4KPC9zdmc+';
            }
            this.userAvatar.alt = this.currentUser.display_name || 'User Avatar';
        }
    }

    // Handle search button click
    async handleSearch() {
        const query = this.songInput.value.trim();
        
        if (!query) {
            this.showMessage('Please enter a song name', 'error');
            return;
        }

        this.setLoading(true);
        this.hideAllSections();

        try {
            const tracks = await window.spotifyAPI.searchTracks(query, 10);
            this.displaySearchResults(tracks);
        } catch (error) {
            console.error('Search failed:', error);
            this.showMessage('Search failed. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Display search results
    displaySearchResults(tracks) {
        this.songList.innerHTML = '';
        
        if (tracks.length === 0) {
            this.songList.innerHTML = '<p>No songs found. Try a different search term.</p>';
        } else {
            tracks.forEach(track => {
                const songItem = this.createSongItem(track);
                this.songList.appendChild(songItem);
            });
        }
        
        this.searchResults.classList.remove('hidden');
    }

    // Create song item element
    createSongItem(track) {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.addEventListener('click', () => this.selectTrack(track));
        
        const image = track.album.images[0]?.url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzIi8+CjxzdmcgeD0iMjAiIHk9IjIwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIj4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PHBvbHlnb24gcG9pbnRzPSIxMCw4IDEyLDE2IDE0LDgiLz48L3N2Zz4KPC9zdmc+Cjwvc3ZnPg==';
        
        songItem.innerHTML = `
            <img src="${image}" alt="${track.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzIi8+CjwvcmVjdD4KPC9zdmc+'">
            <div class="song-info">
                <div class="song-title">${track.name}</div>
                <div class="song-artist">${track.artists.map(artist => artist.name).join(', ')}</div>
            </div>
        `;
        
        return songItem;
    }

    // Select a track and generate playlist
    async selectTrack(track) {
        this.selectedTrack = track;
        this.setLoading(true);
        this.hideAllSections();

        try {
            const recommendations = await window.spotifyAPI.getSmartRecommendations(track.id, 20);
            this.generatedTracks = recommendations.map(t => window.spotifyAPI.formatTrack(t));
            this.displayPlaylist();
        } catch (error) {
            console.error('Failed to generate playlist:', error);
            this.showMessage('Failed to generate playlist. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Display generated playlist
    displayPlaylist() {
        this.playlistTracks.innerHTML = '';
        
        this.generatedTracks.forEach((track, index) => {
            const trackItem = this.createTrackItem(track, index + 1);
            this.playlistTracks.appendChild(trackItem);
        });
        
        this.playlistContainer.classList.remove('hidden');
    }

    // Create track item element
    createTrackItem(track, number) {
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        
        const image = track.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzIi8+PC9yZWN0Pjwvc3ZnPg==';
        
        trackItem.innerHTML = `
            <div class="track-number">${number}</div>
            <img src="${image}" alt="${track.name}" class="track-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzIi8+PC9yZWN0Pjwvc3ZnPg=='">
            <div class="track-info">
                <div class="track-name">${track.name}</div>
                <div class="track-artist">${track.artist}</div>
            </div>
            <div class="track-duration">${track.duration}</div>
        `;
        
        return trackItem;
    }

    // Handle save playlist button click
    async handleSavePlaylist() {
        if (!this.selectedTrack || this.generatedTracks.length === 0) {
            this.showMessage('No playlist to save', 'error');
            return;
        }

        // Prompt for playlist name
        const playlistName = prompt(
            'Enter a name for your playlist:', 
            `${this.selectedTrack.name} - Play Gen Mix`
        );

        if (!playlistName) {
            return;
        }

        this.setLoading(true);

        try {
            const result = await window.spotifyAPI.createSmartPlaylist(
                this.selectedTrack, 
                playlistName, 
                { limit: this.generatedTracks.length }
            );

            this.showMessage(`Playlist "${playlistName}" saved to your Spotify!`, 'success');
            
            // Optionally redirect to Spotify
            setTimeout(() => {
                if (confirm('Playlist saved! Would you like to open it in Spotify?')) {
                    window.open(result.playlist.external_urls.spotify, '_blank');
                }
            }, 1000);

        } catch (error) {
            console.error('Failed to save playlist:', error);
            this.showMessage('Failed to save playlist. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Handle generate new playlist button click
    handleGenerateNew() {
        this.selectedTrack = null;
        this.generatedTracks = [];
        this.hideAllSections();
        this.songInput.value = '';
        this.songInput.focus();
    }

    // Set loading state
    setLoading(isLoading) {
        this.isLoading = isLoading;
        
        if (isLoading) {
            this.loading.classList.remove('hidden');
            this.searchBtn.disabled = true;
            this.searchBtn.textContent = 'Searching...';
        } else {
            this.loading.classList.add('hidden');
            this.searchBtn.disabled = false;
            this.searchBtn.textContent = 'Search';
        }
    }

    // Hide all sections except user info
    hideAllSections() {
        this.searchResults.classList.add('hidden');
        this.playlistContainer.classList.add('hidden');
    }

    // Show message to user
    showMessage(message, type = 'success') {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        this.messageContainer.appendChild(messageEl);

        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for dependencies to be ready
    const initApp = () => {
        if (window.spotifyAuth && window.spotifyAPI) {
            window.app = new PlayGenApp();
        } else {
            setTimeout(initApp, 100);
        }
    };
    initApp();
});