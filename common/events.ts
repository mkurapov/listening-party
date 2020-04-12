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
    PARTY_PLAYBACK_CHANGED_RES = 'PARTY_PLAYBACK_CHANGED_RES',
    PARTY_PLAYBACK_REQ = 'PARTY_PLAYBACK_REQ',
    PARTY_NEW_USER_JOINED_RES = 'PARTY_NEW_USER_JOINED_RES',
    PARTY_CHANGED_ADMIN_RES = 'PARTY_CHANGED_ADMIN_RES',
    PARTY_EXISTS_CHECK_REQ = 'PARTY_EXISTS_CHECK_REQ',
    PARTY_EXISTS_CHECK_RES = 'PARTY_EXISTS_CHECK_RES',
    TEST = 'TEST'
}