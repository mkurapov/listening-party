export interface User {
    id: string;
    name: string;
    display_name: string;
    product: string;
    images: [{
        url: string;
    }]
}

export interface Party {
    users?: User[];
    id: string;
    queue?: Song[];
    adminUser?: User;
    playbackState?: PlaybackState;
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
