import React, { useEffect, useState } from 'react';
import { SocketEvent, Party, PlaybackState, User, Track } from 'common'
import axios, { AxiosResponse } from 'axios';
import { match, useHistory } from 'react-router';

import { useUser } from '../contexts/UserContext';
import socket from '../socket';
import { SPOTIFY_API, APP_API } from '../const';
import './Party.css'
import Button from '../components/Button';

interface Props {
    match: any;
}

interface SearchResults {
    tracks: {
        href: string;
        items: Track[]
    }
}

const imageStyle = {
    // width: '100vw',
    height: '300px'
}

const Toast: React.FC<{ message: string }> = ({ message }): React.ReactElement => {
    return <div className="toast">
        {message}
    </div>
}

const AdminUser: React.FC<{ adminUser: User | undefined }> = ({ adminUser }): React.ReactElement => {
    if (!adminUser) {
        return <div></div>;
    }

    return (
        <div className="user user--admin">
            <UserAvatar user={adminUser} />
            <span className="user__info">
                <span className="user__info__name">{adminUser.display_name}</span>
                <span className="user__info__dj">Your DJ</span>
            </span>
        </div>
    );
}

const UserList: React.FC<{ users: User[], partyId: string, isAdmin: boolean }> = ({ users, partyId, isAdmin }): React.ReactElement => {
    const onMakeAdmin = (user: User): void => {
        console.log('changing to user', user)
        socket.emit(SocketEvent.PARTY_CHANGED_ADMIN_REQ, { partyId: partyId, newAdminUser: user });
        console.log(SocketEvent.PARTY_CHANGED_ADMIN_REQ);
    }

    return (
        <div>{users.map(user =>
            <div className="user">
                <UserAvatar user={user} />
                <span className="user__info">
                    <span className="user__info__name">{user.display_name}</span>
                    {isAdmin && <span onClick={() => onMakeAdmin(user)} className="user__info__make_dj">Make DJ</span>}
                </span>
            </div>
        )}</div>);
}

const LeftSideBar: React.FC<{ party: Party, user: User }> = ({ party, user }): React.ReactElement => {
    const history = useHistory();

    const onLeaveClick = (): void => {
        history.push('/');
    }

    const onCopyLink = (): void => {

    }

    return (
        <div className="sidebar hidden-xs">
            <div className="sidebar__block">
                <Button classes="btn--fill btn--secondary" name="Leave Party" onClick={onLeaveClick}></Button>
            </div>
            <div className="sidebar__block">
                <div className="text-left h2 mb-1 font-weight-normal">Users in party</div>
                <AdminUser adminUser={party.adminUser} />
            </div>
            <div className="users sidebar__block" id="users">
                {party.users ? <UserList partyId={party.id} users={party.users.filter(u => u.id !== party.adminUser?.id)} isAdmin={party.adminUser?.id === user.id} /> : null}
            </div>
            <div className="sidebar__block">
                <Button classes="btn--fill btn--primary" name="Copy invite link" onClick={onCopyLink}></Button>
            </div>
        </div>
    )
}

const UnauthedParty: React.FC<{ currentParty: Party | undefined }> = ({ currentParty }): React.ReactElement => {
    return (
        <div>
            < div > This is a party, but you aint authed.</div>
            {currentParty ?
                <div>
                    <div>Users in party</div>
                    <div className="users">{currentParty?.users?.map(user =>
                        <div className="user">
                            <UserAvatar key={user.id} user={user} />
                            <span>{user.display_name}</span>
                        </div>
                    )}</div>
                </div>
                :
                <div>no one here</div>
            }
            <a href={APP_API.LOGIN}>Login</a>
        </div>)
};

const UserAvatar: React.FC<{ user: User }> = ({ user }): React.ReactElement => {
    return <span className="avatar">
        {user.images.length > 0 ?
            <img className="avatar__img" src={user.images[0].url}></img>
            :
            <span className="avatar__placeholder">
                <span className="avatar__placeholder__letter">{user.display_name.substr(0, 1)}</span>

            </span>
        }
    </span>
};


const Player: React.FC<{ playback: PlaybackState }> = ({ playback }): React.ReactElement => {
    return (
        playback ?
            <div className="player">
                <div>
                    {/* <h3>{playback.is_playing ? 'Playing' : 'Paused'}</h3> */}
                    <img className={`player__cover  mb-2 ${playback.is_playing ? 'player__cover--playing' : ''}`} src={playback?.item.album.images[0].url}></img>
                    <div className="song__name mb-1">{playback.item.name}</div>
                    <div className="song__artist mb-2">{playback.item.album.artists[0].name}</div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="250.416" height="50.639" viewBox="0 0 248.416 50.639">
                        <path id="wiggly" className={playback.is_playing ? 'playing' : ''} d="M240.58,13.245s.423.565-16.322,0-26.564,7.963-42.275,7.382-24.187-10.114-38.61-7.382-15.236,7.992-28.194,7.382-16.638-3.858-31.589-7.382-15.146,3.909-35.886,4.273-17.261-4.032-35.7-4.273.06.3-10.646,0" transform="translate(5, 10)" fill="none" stroke="#5b0fa9" strokeLinecap="round" strokeWidth="5" />
                    </svg>

                </div>
                <a className='song__link' href={playback.item.href}>View on Spotify</a>
            </div>
            :
            (<div>No tracks playing</div>)
    )
};




const PartyPage: React.FC<Props> = ({ match }): React.ReactElement => {
    const { user, isLoading } = useUser();
    const [currentParty, setCurrentParty] = useState<Party | undefined>(undefined);
    const partyId = match.params.id;
    const history = useHistory();
    const POLL_TIME = 1000;
    let pollCurrentlyPlaying: any;

    const currentPartyRef = React.useRef(currentParty);

    // this is so that the socket io handler methods get the latest version of currentParty
    useEffect(() => {
        currentPartyRef.current = currentParty;
    }, [currentParty])

    useEffect(() => {
        // NEED TO CHECK IF PARTY EXISTS HERE 
        socket.emit(SocketEvent.PARTY_EXISTS_CHECK_REQ, partyId);

        socket.on(SocketEvent.PARTY_EXISTS_CHECK_RES, onPartyExistsCheck);
        socket.on(SocketEvent.PARTY_JOINED_UNAUTHED_RES, onPartyJoinedUnauthed);
        return () => handleUserLeaving();
    }, [])

    useEffect(() => {
        if (!user || isLoading) {
            if (!isLoading) {
                console.log('You are not authed');
                localStorage.setItem('pending_party', partyId);
                socket.emit(SocketEvent.PARTY_JOINED_UNAUTHED_REQ, partyId);
            }
            return;
        }

        console.log('Logged in as ', user.display_name);

        socket.on(SocketEvent.USER_LEFT_PARTY_RES, onUserLeftParty);
        socket.on(SocketEvent.PARTY_PLAYBACK_CHANGED_RES, onPlaybackChanged);
        socket.on(SocketEvent.PARTY_NEW_USER_JOINED_RES, onNewUserJoined);
        socket.on(SocketEvent.PARTY_JOINED_RES, onPartyJoined);
        socket.on(SocketEvent.PARTY_CHANGED_ADMIN_RES, onAdminChanged);
        socket.on(SocketEvent.PARTY_ADD_TO_QUEUE_RES, onSongAddedToQueue);

        socket.emit(SocketEvent.PARTY_JOINED_REQ, { user: user, socketId: socket.id, partyId: partyId })
    }, [user, isLoading])

    const onSongAddedToQueue = (party: Party) => {
        if (party.adminUser?.id === user?.id) {
            axios.get(SPOTIFY_API.QUEUE)
                .then((res: AxiosResponse<any>) => {
                    console.log(res);
                    if (!res.data || !res.data.item) {
                        return;
                    }
                })
                .catch(err => { console.log('could not get set song to queue') })
        }
        setCurrentParty(party);
    }

    const onPartyExistsCheck = (hasParty: boolean) => {
        if (!hasParty) {
            console.log('This party was not found... redirecting back');
            setTimeout(() => {
                history.push('/');
            }, 2000);
        }
    }


    const onUserLeftParty = (party: Party) => {
        console.log('A user left party.');
        setCurrentParty(party);
    }

    const onPlaybackChanged = (party: Party) => {
        console.log('Playback state updated.');
        const isAdminUser = party.adminUser?.id === user?.id;
        if (!isAdminUser && party.playbackState) {

            const isNowPlaying = party.playbackState.is_playing && !currentPartyRef.current?.playbackState?.is_playing; //false
            const isNowPaused = !party.playbackState.is_playing && currentPartyRef.current?.playbackState?.is_playing;//undefined
            const isNewSong = currentPartyRef.current?.playbackState?.item.id !== party.playbackState.item.id; //false

            if (isNowPlaying || isNewSong) {
                playSong(party.playbackState, true);
            } else if (isNowPaused) {
                pauseSong();
            }
        }

        setCurrentParty(party);
    }

    const onNewUserJoined = (party: Party) => {
        console.log('New user joined:', party.users ? party.users[party.users?.length - 1].display_name : '');
        setCurrentParty(party);
    }

    const onPartyJoined = (party: Party) => {
        setCurrentParty(party);
        console.log('Joined existing party:', party);
        if (party.playbackState && party.playbackState.is_playing) {
            playSong(party.playbackState, true);
        }
    }

    const onPartyJoinedUnauthed = (partyStub: Party) => {
        console.log('party stub: ', partyStub)
        setCurrentParty(partyStub);
    }

    const onAdminChanged = (party: Party) => {
        const wasPreviouslyAdmin = currentPartyRef.current?.adminUser?.id === user?.id;

        if ((party.adminUser?.id === user?.id) && !wasPreviouslyAdmin) {
            console.log('Youve been assigned admin.')
            clearInterval(pollCurrentlyPlaying);
            getCurrentlyPlaying(party.id);
            pollCurrentlyPlaying = setInterval(() => {
                getCurrentlyPlaying(party.id);
            }, POLL_TIME);
        }
        setCurrentParty(party);
    }

    const handleUserLeaving = () => {
        socket.off(SocketEvent.USER_LEFT_PARTY_RES, onUserLeftParty);
        socket.off(SocketEvent.PARTY_PLAYBACK_CHANGED_RES, onPlaybackChanged);
        socket.off(SocketEvent.PARTY_NEW_USER_JOINED_RES, onNewUserJoined);
        socket.off(SocketEvent.PARTY_JOINED_RES, onPartyJoined);
        socket.off(SocketEvent.PARTY_CHANGED_ADMIN_RES, onAdminChanged);
        socket.off(SocketEvent.PARTY_JOINED_UNAUTHED_RES, onPartyJoinedUnauthed);
        socket.off(SocketEvent.PARTY_EXISTS_CHECK_RES, onPartyExistsCheck);
        socket.off(SocketEvent.PARTY_ADD_TO_QUEUE_RES, onSongAddedToQueue);


        console.log('Leaving party.')

        clearInterval(pollCurrentlyPlaying);
        socket.emit(SocketEvent.USER_LEFT_PARTY_REQ, { userId: user?.id, partyId: partyId })
    }

    const playSong = (playbackState: PlaybackState, isFirstTime = false) => {
        console.log('setting currently playing...');

        const args = {
            uris: [playbackState.item.uri],
            position_ms: isFirstTime ? playbackState.progress_ms : 0
        }
        axios.put(SPOTIFY_API.PLAY, args)
            .then(() => console.log('Playing new song: ', playbackState.item.name))
            .catch(err => {
                const error = err.response.data.error;
                if (error.reason === "NO_ACTIVE_DEVICE") {
                    console.log('Could not play song. No active device found.')
                } else if (error.reason === "PREMIUM_REQUIRED") {
                    console.log('Could not play song. Premium required.')
                } else {
                    console.log('Could not play song. Error: ', error);
                }
            });
    }

    const pauseSong = () => {
        axios.put(SPOTIFY_API.PAUSE)
            .then(() => console.log('Paused song.'))
            .catch(err => {
                const error = err.response.data.error;
                console.log('Could not pause song: ', error)
            });
    }

    const getCurrentlyPlaying = (partyId: string) => {
        console.log('Getting currently playing...');
        axios.get(SPOTIFY_API.CURRENTLY_PLAYING)
            .then((res: AxiosResponse<PlaybackState>) => {
                console.log(res.data);
                if (!res.data || !res.data.item) {
                    console.log('Nothing is playing, its an ad, or you are in private mode.');
                    return;
                }
                socket.emit(SocketEvent.PARTY_PLAYBACK_REQ, { playbackState: res.data, partyId: partyId })
            })
            .catch(err => { console.log('could not get currently playing') })
    }

    const onLeaveParty = () => {
        history.push('/');
    }

    const addToQueue = () => {
        searchSong('lost in yesterday').then(res => {
            if (!res.data || res.data.tracks.items.length === 0) {
                return;
            }

            const newSong = res.data.tracks.items[0];

            console.log('adding song: ', newSong);
            socket.emit(SocketEvent.PARTY_ADD_TO_QUEUE_REQ, { track: newSong, partyId: partyId });
        })

    }

    const searchSong = (query: string): Promise<AxiosResponse<SearchResults>> => {
        return axios.get(SPOTIFY_API.SEARCH, { params: { type: "track", q: query.replace(' ', '+') } })
    }


    return (
        <div className="party-wrap">
            {user && !isLoading && user.id && currentParty ?
                (<div>
                    {/* <h2 className="mb-2">Welcome to the party {user.display_name} 🎉</h2> */}
                    {currentParty.playbackState ? <Player playback={currentParty.playbackState} /> : null}
                    <LeftSideBar party={currentParty} user={user} />
                </div>)
                :
                <UnauthedParty currentParty={currentParty} />
            }
        </div >);

};

export default PartyPage;


