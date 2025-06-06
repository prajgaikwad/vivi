class SpotifyAPI {
    constructor(auth) {
        this.auth = auth;
        this.baseURL = 'https://api.spotify.com/v1';
    }

    // Make authenticated API request
    async makeRequest(endpoint, options = {}) {
        const token = await this.auth.getAccessToken();
        
        if (!token) {
            throw new Error('No access token available');
        }

        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            ...options
        };

        const response = await fetch(url, config);

        if (response.status === 401) {
            // Token might be expired, try to refresh
            await this.auth.refreshAccessToken();
            const newToken = await this.auth.getAccessToken();
            
            if (newToken) {
                config.headers['Authorization'] = `Bearer ${newToken}`;
                const retryResponse = await fetch(url, config);
                
                if (!retryResponse.ok) {
                    throw new Error(`API request failed: ${retryResponse.status} ${retryResponse.statusText}`);
                }
                
                return retryResponse.json();
            }
        }

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // Get current user profile
    async getCurrentUser() {
        try {
            return await this.makeRequest('/me');
        } catch (error) {
            console.error('Failed to get current user:', error);
            throw error;
        }
    }

    // Search for tracks
    async searchTracks(query, limit = 10) {
        try {
            const params = new URLSearchParams({
                q: query,
                type: 'track',
                limit: limit.toString(),
                market: 'US'
            });

            const response = await this.makeRequest(`/search?${params}`);
            return response.tracks.items;
        } catch (error) {
            console.error('Failed to search tracks:', error);
            throw error;
        }
    }

    // Get audio features for a track
    async getAudioFeatures(trackId) {
        try {
            return await this.makeRequest(`/audio-features/${trackId}`);
        } catch (error) {
            console.error('Failed to get audio features:', error);
            throw error;
        }
    }

    // Get track details
    async getTrack(trackId) {
        try {
            return await this.makeRequest(`/tracks/${trackId}`);
        } catch (error) {
            console.error('Failed to get track:', error);
            throw error;
        }
    }

    // Get recommendations based on seed tracks
    async getRecommendations(seedTracks, options = {}) {
        try {
            const params = new URLSearchParams({
                seed_tracks: Array.isArray(seedTracks) ? seedTracks.join(',') : seedTracks,
                limit: (options.limit || 20).toString(),
                market: 'US'
            });

            // Add audio feature parameters if provided
            const audioFeatureParams = [
                'target_acousticness', 'target_danceability', 'target_energy',
                'target_instrumentalness', 'target_liveness', 'target_loudness',
                'target_speechiness', 'target_tempo', 'target_valence',
                'min_acousticness', 'max_acousticness', 'min_danceability', 'max_danceability',
                'min_energy', 'max_energy', 'min_instrumentalness', 'max_instrumentalness',
                'min_liveness', 'max_liveness', 'min_loudness', 'max_loudness',
                'min_speechiness', 'max_speechiness', 'min_tempo', 'max_tempo',
                'min_valence', 'max_valence', 'target_popularity', 'min_popularity', 'max_popularity'
            ];

            audioFeatureParams.forEach(param => {
                if (options[param] !== undefined) {
                    params.append(param, options[param].toString());
                }
            });

            const response = await this.makeRequest(`/recommendations?${params}`);
            return response.tracks;
        } catch (error) {
            console.error('Failed to get recommendations:', error);
            throw error;
        }
    }

    // Get enhanced recommendations with audio features analysis
    async getSmartRecommendations(seedTrackId, limit = 20) {
        try {
            // First get audio features of the seed track
            const audioFeatures = await this.getAudioFeatures(seedTrackId);
            const seedTrack = await this.getTrack(seedTrackId);

            // Create recommendation parameters based on audio features
            const recommendationOptions = {
                limit: limit,
                target_danceability: audioFeatures.danceability,
                target_energy: audioFeatures.energy,
                target_valence: audioFeatures.valence,
                target_tempo: audioFeatures.tempo,
                target_acousticness: audioFeatures.acousticness,
                target_instrumentalness: audioFeatures.instrumentalness,
                target_popularity: seedTrack.popularity
            };

            // Add some variance to make recommendations more diverse
            const variance = 0.1;
            recommendationOptions.min_danceability = Math.max(0, audioFeatures.danceability - variance);
            recommendationOptions.max_danceability = Math.min(1, audioFeatures.danceability + variance);
            recommendationOptions.min_energy = Math.max(0, audioFeatures.energy - variance);
            recommendationOptions.max_energy = Math.min(1, audioFeatures.energy + variance);
            recommendationOptions.min_valence = Math.max(0, audioFeatures.valence - variance);
            recommendationOptions.max_valence = Math.min(1, audioFeatures.valence + variance);

            return await this.getRecommendations(seedTrackId, recommendationOptions);
        } catch (error) {
            console.error('Failed to get smart recommendations:', error);
            // Fallback to basic recommendations
            return await this.getRecommendations(seedTrackId, { limit });
        }
    }

    // Create a new playlist
    async createPlaylist(userId, name, description = '', isPublic = true) {
        try {
            const body = {
                name: name,
                description: description,
                public: isPublic
            };

            return await this.makeRequest(`/users/${userId}/playlists`, {
                method: 'POST',
                body: JSON.stringify(body)
            });
        } catch (error) {
            console.error('Failed to create playlist:', error);
            throw error;
        }
    }

    // Add tracks to playlist
    async addTracksToPlaylist(playlistId, trackUris) {
        try {
            const body = {
                uris: trackUris
            };

            return await this.makeRequest(`/playlists/${playlistId}/tracks`, {
                method: 'POST',
                body: JSON.stringify(body)
            });
        } catch (error) {
            console.error('Failed to add tracks to playlist:', error);
            throw error;
        }
    }

    // Get user's playlists
    async getUserPlaylists(limit = 20) {
        try {
            const params = new URLSearchParams({
                limit: limit.toString()
            });

            const response = await this.makeRequest(`/me/playlists?${params}`);
            return response.items;
        } catch (error) {
            console.error('Failed to get user playlists:', error);
            throw error;
        }
    }

    // Get multiple artists
    async getArtists(artistIds) {
        try {
            const ids = Array.isArray(artistIds) ? artistIds.join(',') : artistIds;
            const params = new URLSearchParams({ ids });
            
            const response = await this.makeRequest(`/artists?${params}`);
            return response.artists;
        } catch (error) {
            console.error('Failed to get artists:', error);
            throw error;
        }
    }

    // Get artist's top tracks
    async getArtistTopTracks(artistId, market = 'US') {
        try {
            const response = await this.makeRequest(`/artists/${artistId}/top-tracks?market=${market}`);
            return response.tracks;
        } catch (error) {
            console.error('Failed to get artist top tracks:', error);
            throw error;
        }
    }

    // Get related artists
    async getRelatedArtists(artistId) {
        try {
            const response = await this.makeRequest(`/artists/${artistId}/related-artists`);
            return response.artists;
        } catch (error) {
            console.error('Failed to get related artists:', error);
            throw error;
        }
    }

    // Format duration from milliseconds to MM:SS
    formatDuration(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Format track data for display
    formatTrack(track) {
        return {
            id: track.id,
            name: track.name,
            artist: track.artists.map(artist => artist.name).join(', '),
            album: track.album.name,
            duration: this.formatDuration(track.duration_ms),
            durationMs: track.duration_ms,
            image: track.album.images[0]?.url || '',
            uri: track.uri,
            external_urls: track.external_urls,
            preview_url: track.preview_url,
            popularity: track.popularity,
            explicit: track.explicit
        };
    }

    // Create a comprehensive playlist with metadata
    async createSmartPlaylist(seedTrack, playlistName, options = {}) {
        try {
            const user = await this.getCurrentUser();
            const recommendations = await this.getSmartRecommendations(
                seedTrack.id, 
                options.limit || 20
            );

            // Format the playlist description
            const description = `Generated by Play Gen based on "${seedTrack.name}" by ${seedTrack.artists[0].name}. Created on ${new Date().toLocaleDateString()}.`;

            // Create the playlist
            const playlist = await this.createPlaylist(
                user.id, 
                playlistName, 
                description, 
                options.isPublic !== false
            );

            // Add tracks to playlist
            const trackUris = recommendations.map(track => track.uri);
            await this.addTracksToPlaylist(playlist.id, trackUris);

            return {
                playlist: playlist,
                tracks: recommendations.map(track => this.formatTrack(track)),
                seedTrack: this.formatTrack(seedTrack)
            };

        } catch (error) {
            console.error('Failed to create smart playlist:', error);
            throw error;
        }
    }
}

// Initialize API when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to be ready
    const checkAuth = () => {
        if (window.spotifyAuth) {
            window.spotifyAPI = new SpotifyAPI(window.spotifyAuth);
        } else {
            setTimeout(checkAuth, 100);
        }
    };
    checkAuth();
});