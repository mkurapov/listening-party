const SPOTIFY_ACCOUNT_URL = 'https://accounts.spotify.com';
const SPOTIFY_API = 'https://api.spotify.com/v1'

export const API_ENDPOINTS = {
    LOGIN: SPOTIFY_ACCOUNT_URL + '/authorize',
    ME: SPOTIFY_API + '/me',
    CURRENT_PLAYBACK: SPOTIFY_API + '/me/player'
}

export default API_ENDPOINTS;