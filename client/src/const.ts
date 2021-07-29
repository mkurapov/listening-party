const SPOTIFY_ACCOUNT_URL = 'https://accounts.spotify.com';
const SPOTIFY_URL = 'https://api.spotify.com/v1'

const APP_URL = process.env.REACT_APP_APP_URL ? process.env.REACT_APP_APP_URL : 'https://listeningpartey.herokuapp.com/';

export const APP_API = {
    ROOT: APP_URL,
    REFRESH_TOKEN: APP_URL + '/refresh_token',
    LOGIN: APP_URL + '/login'
}

export const SPOTIFY_API = {
    LOGIN: SPOTIFY_ACCOUNT_URL + '/authorize',
    ME: SPOTIFY_URL + '/me',
    CURRENTLY_PLAYING: SPOTIFY_URL + '/me/player/currently-playing',
    PLAYER: SPOTIFY_URL + '/me/player',
    PLAY: SPOTIFY_URL + '/me/player/play',
    PAUSE: SPOTIFY_URL + '/me/player/pause',
    QUEUE: SPOTIFY_URL + '/me/player/queue',
    SEARCH: SPOTIFY_URL + '/search'
}
