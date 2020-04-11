export interface User {
    id: string;
    name: string;
    display_name: string;
}

export interface Party {
    users?: User[];
    id: string;
    queue?: Song[];
    adminUser?: User;
    playbackState?: PlaybackState;
    // getAdmin(): User;
}

export interface PlaybackState {
    context: any;
    item: {
        id: string;
        type: string;
        uri: string;
        name: string;
        href: string;
        album: {
            id: string;
            album_type: string;
            artists: [{
                id: string;
                name: string;
                uri: string;
            }]
            images: [{
                url: string;
            }]
        }
    };
    is_playing: boolean;
    progress_ms: number;
}

export interface Song {
    name: string;
    id: string;
}

export enum SocketEvent {
    USER_LOGGEDIN_REQ = 'USER_LOGGEDIN_REQ',
    USER_DISCONNECTED_REQ = 'USER_DISCONNECTED_REQ',
    CREATE_PARTY_REQ = 'CREATE_PARTY_REQ',
    CREATE_PARTY_RES = 'CREATE_PARTY_RES',
    USER_JOINED_RES = 'USER_JOINED_RES',
    USER_JOINED_REQ = 'USER_JOINED_REQ',
    USER_LEFT_PARTY_REQ = 'USER_LEFT_PARTY_REQ',
    USER_LEFT_PARTY_RES = 'USER_LEFT_PARTY_RES',
    PARTY_JOINED_REQ = 'PARTY_JOINED_REQ',
    PARTY_JOINED_UNAUTHED_REQ = 'PARTY_JOINED_UNAUTHED_REQ',
    PARTY_JOINED_UNAUTHED_RES = 'PARTY_JOINED_UNAUTHED_RES',
    PARTY_JOINED_RES = 'PARTY_JOINED_RES',
    PARTY_NOT_FOUND_RES = 'PARTY_NOT_FOUND_RES',
    PARTY_PLAYBACK_CHANGED_RES = 'PARTY_PLAYBACK_CHANGED_RES',
    PARTY_PLAYBACK_REQ = 'PARTY_PLAYBACK_REQ',
    PARTY_NEW_USER_JOINED_RES = 'PARTY_NEW_USER_JOINED_RES',
    PARTY_CHANGED_ADMIN_RES = 'PARTY_CHANGED_ADMIN_RES'
}