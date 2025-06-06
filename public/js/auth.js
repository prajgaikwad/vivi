// Spotify Auth Configuration
const SPOTIFY_CONFIG = {
    CLIENT_ID: '527bc50d121141e2b7b6e27336211312', // Replace with your actual Client ID
    REDIRECT_URI: 'https://vivi315.netlify.app/', // or your Netlify URL
    SCOPES: [
        'user-read-private',
        'user-read-email',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-library-read'
    ]
};

class SpotifyAuth {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.expiresAt = null;
        this.init();
    }

    init() {
        // Check if we're returning from Spotify auth
        if (window.location.hash) {
            this.handleCallback();
        } else {
            // Check for existing token
            this.loadTokenFromStorage();
        }
    }

    // Generate random string for state parameter
    generateRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    // Generate code verifier for PKCE
    generateCodeVerifier() {
        const array = new Uint32Array(56);
        crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
    }

    // Generate code challenge for PKCE
    async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    // Start Spotify login process
    async login() {
        const state = this.generateRandomString(16);
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);

        // Store code verifier for later use
        sessionStorage.setItem('code_verifier', codeVerifier);
        sessionStorage.setItem('state', state);

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: SPOTIFY_CONFIG.CLIENT_ID,
            scope: SPOTIFY_CONFIG.SCOPES.join(' '),
            redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
            state: state,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge
        });

        window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    }

    // Handle callback from Spotify
    async handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
            console.error('Spotify auth error:', error);
            this.showMessage('Authentication failed. Please try again.', 'error');
            return;
        }

        if (!code || !state) {
            console.error('Missing code or state parameter');
            return;
        }

        // Verify state
        const storedState = sessionStorage.getItem('state');
        if (state !== storedState) {
            console.error('State mismatch');
            return;
        }

        try {
            await this.exchangeCodeForToken(code);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            console.error('Token exchange failed:', error);
            this.showMessage('Authentication failed. Please try again.', 'error');
        }
    }

    // Exchange authorization code for access token
    async exchangeCodeForToken(code) {
        const codeVerifier = sessionStorage.getItem('code_verifier');
        
        if (!codeVerifier) {
            throw new Error('Code verifier not found');
        }

        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
                client_id: SPOTIFY_CONFIG.CLIENT_ID,
                code_verifier: codeVerifier
            })
        });

        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.status}`);
        }

        const data = await response.json();
        this.setTokens(data);
        
        // Clean up session storage
        sessionStorage.removeItem('code_verifier');
        sessionStorage.removeItem('state');
    }

    // Set tokens and expiration
    setTokens(tokenData) {
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        this.expiresAt = Date.now() + (tokenData.expires_in * 1000);

        // Store in localStorage
        localStorage.setItem('spotify_access_token', this.accessToken);
        if (this.refreshToken) {
            localStorage.setItem('spotify_refresh_token', this.refreshToken);
        }
        localStorage.setItem('spotify_expires_at', this.expiresAt.toString());

        // Notify that user is logged in
        this.onAuthStateChange(true);
    }

    // Load token from localStorage
    loadTokenFromStorage() {
        this.accessToken = localStorage.getItem('spotify_access_token');
        this.refreshToken = localStorage.getItem('spotify_refresh_token');
        const expiresAt = localStorage.getItem('spotify_expires_at');
        
        if (expiresAt) {
            this.expiresAt = parseInt(expiresAt);
        }

        if (this.accessToken && this.expiresAt > Date.now()) {
            this.onAuthStateChange(true);
        } else if (this.refreshToken) {
            this.refreshAccessToken();
        }
    }

    // Refresh access token
    async refreshAccessToken() {
        if (!this.refreshToken) {
            this.logout();
            return;
        }

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken,
                    client_id: SPOTIFY_CONFIG.CLIENT_ID
                })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            this.setTokens({
                access_token: data.access_token,
                refresh_token: data.refresh_token || this.refreshToken,
                expires_in: data.expires_in
            });

        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
        }
    }

    // Logout and clear tokens
    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.expiresAt = null;

        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_expires_at');

        this.onAuthStateChange(false);
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.accessToken && this.expiresAt > Date.now();
    }

    // Get valid access token
    async getAccessToken() {
        if (!this.accessToken) {
            return null;
        }

        // Check if token is expired
        if (this.expiresAt <= Date.now() + 60000) { // Refresh 1 minute before expiry
            await this.refreshAccessToken();
        }

        return this.accessToken;
    }

    // Callback for auth state changes
    onAuthStateChange(isAuthenticated) {
        if (window.app && window.app.handleAuthStateChange) {
            window.app.handleAuthStateChange(isAuthenticated);
        }
    }

    // Show message to user
    showMessage(message, type = 'success') {
        const messageContainer = document.getElementById('message-container');
        if (!messageContainer) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        messageContainer.appendChild(messageEl);

        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.spotifyAuth = new SpotifyAuth();
});