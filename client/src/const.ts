const SPOTIFY_ACCOUNT_URL = 'https://accounts.spotify.com';
const SPOTIFY_URL = 'https://api.spotify.com/v1'

export const APP_URL = 'http://localhost:8080';

export const SPOTIFY_API = {
    LOGIN: SPOTIFY_ACCOUNT_URL + '/authorize',
    ME: SPOTIFY_URL + '/me',
    CURRENT_PLAYBACK: SPOTIFY_URL + '/me/player'
}
