export interface User {
  id: string;
  display_name: string;
  product: string;
  images: [
    {
      url: string;
    }
  ];
}

export interface PartyStub {
  users: Pick<User, "display_name" | "images">[];
  playbackState: Pick<PlaybackState, "item">;
}

export interface Party {
  users?: User[];
  id: string;
  adminUser?: User;
  createdAt?: Date;
  playbackState?: PlaybackState;
}

export interface Album {
  id: string;
  album_type: string;
  artists: Artist[];
  images: [
    {
      url: string;
    }
  ];
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
  artists: Artist[];
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

export enum SocketEvent {
  USER_LOGGEDIN_REQ = "USER_LOGGEDIN_REQ",
  USER_DISCONNECTED_REQ = "USER_DISCONNECTED_REQ",
  CREATE_PARTY_REQ = "CREATE_PARTY_REQ",
  CREATE_PARTY_RES = "CREATE_PARTY_RES",
  USER_JOINED_RES = "USER_JOINED_RES",
  USER_JOINED_REQ = "USER_JOINED_REQ",
  USER_LEFT_PARTY_REQ = "USER_LEFT_PARTY_REQ",
  USER_LEFT_PARTY_RES = "USER_LEFT_PARTY_RES",
  PARTY_JOINED_REQ = "PARTY_JOINED_REQ",
  PARTY_JOINED_UNAUTHED_REQ = "PARTY_JOINED_UNAUTHED_REQ",
  PARTY_JOINED_UNAUTHED_RES = "PARTY_JOINED_UNAUTHED_RES",
  PARTY_JOINED_RES = "PARTY_JOINED_RES",
  PARTY_PLAYBACK_CHANGED_RES = "PARTY_PLAYBACK_CHANGED_RES",
  PARTY_PLAYBACK_REQ = "PARTY_PLAYBACK_REQ",
  PARTY_NEW_USER_JOINED_RES = "PARTY_NEW_USER_JOINED_RES",
  PARTY_CHANGED_ADMIN_RES = "PARTY_CHANGED_ADMIN_RES",
  PARTY_CHANGED_ADMIN_REQ = "PARTY_CHANGED_ADMIN_REQ",
  PARTY_EXISTS_CHECK_REQ = "PARTY_EXISTS_CHECK_REQ",
  PARTY_EXISTS_CHECK_RES = "PARTY_EXISTS_CHECK_RES",
  PARTY_ADD_TO_QUEUE_REQ = "PARTY_ADD_TO_QUEUE_REQ",
  PARTY_ADD_TO_QUEUE_RES = "PARTY_ADD_TO_QUEUE_RES",
  PARTY_POLL = "PARTY_POLL",
  TEST = "TEST",
  USER_ALREADY_CONNECTED_RES = "USER_ALREADY_CONNECTED_RES",
}
