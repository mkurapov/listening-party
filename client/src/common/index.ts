export interface User {
    id: string;
    name: string;
    display_name: string;
}

export interface Party {
    users?: User[];
    id: string;
    queue?: Song[];
    // getAdmin(): User;
}

export interface Song {
    name: string;
    id: string;
}

export enum SocketEvent {
    USER_CONNECTED_REQ = 'USER_CONNECTED_REQ',
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
    PARTY_NOT_FOUND_RES = 'PARTY_NOT_FOUND_RES'
}