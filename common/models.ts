export interface User {
    id: string;
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

export interface Album {
    id: string;
    album_type: string;
    artists: Artist[]
    images: [{
        url: string;
    }]
}

export interface Artist {
    id: string;
    name: string;
    uri: string;
}

export interface Track {
    id: string;
    type: string;
    uri: string;
    name: string;
    href: string;
    album: Album;
    artists: Artist[]
}

export interface PlaybackState {
    context: any;
    item: Track;
    is_playing: boolean;
    progress_ms: number;
}

export interface Song {
    name: string;
    id: string;
}
