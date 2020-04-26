import React, { useEffect, useState, useCallback, useRef } from 'react';
import { SocketEvent, Party, PlaybackState, User, Track, PartyStub } from 'common'
import axios, { AxiosResponse } from 'axios';
import { match, useHistory } from 'react-router';

import { useUser } from '../contexts/UserContext';
import socket from '../socket';
import { SPOTIFY_API, APP_API } from '../const';
import './Party.css'
import Button from '../components/Button';
import { parentPort } from 'worker_threads';

interface Props {
    match: any;
}

interface SearchResults {
    tracks: {
        href: string;
        items: Track[]
    }
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
        socket.emit(SocketEvent.PARTY_CHANGED_ADMIN_REQ, { partyId: partyId, newAdminUser: user });
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

const UnauthedParty: React.FC<{ partyStub: PartyStub }> = ({ partyStub }): React.ReactElement => {
    const USERS_TO_SHOW = 1;

    const partyInfo = (): string => {
        if (partyStub && partyStub.users) {
            let personInfo;
            if (partyStub.users.length === 1) {
                personInfo = `1 person in the party is`;
            } else {
                personInfo = `${partyStub.users.length} people in the party are`;
            }
            return `${personInfo} listening to ${partyStub.playbackState?.item.artists[0].name}`;
        }
        return '';
    }

    const unlicedUsersView = () => {
        return partyStub?.users?.map((user, i) =>
            <div className="user--unauthed mr-1">
                <UserAvatar key={i} user={user} />
                <span className="user__info--unauthed mt-2">{user.display_name}</span>
            </div>
        );
    }

    const slicedUsersView = () => {
        return (
            <div>
                {
                    partyStub.users?.slice(0, USERS_TO_SHOW - 1).map((user, i) =>
                        <div className="user--unauthed mr-1">
                            <UserAvatar key={i} user={user} />
                            <span className="user__info--unauthed mt-2">{user.display_name}</span>
                        </div>
                    )
                }
                <div className="user--unauthed mr-1" >
                    <OtherUsersAvatar count={partyStub.users.length - USERS_TO_SHOW} />
                    <span className="user__info--unauthed mt-2">others</span>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="text--lg mb-4">{partyInfo()}</div>
            <div className="users--unauthed mb-4">
                {partyStub.users.length > USERS_TO_SHOW ? slicedUsersView() : unlicedUsersView()}</div>
            <a className="btn btn--primary d-block" href={APP_API.LOGIN}>Join them with Spotify</a>
        </div>);
};

const OtherUsersAvatar: React.FC<{ count: number }> = ({ count }): React.ReactElement => {
    return <span className="avatar">
        <span className="avatar__placeholder">
            <span className="avatar__placeholder__letter">+ {count}</span>
        </span>
    </span>
};

const UserAvatar: React.FC<{ user: Pick<User, 'display_name' | 'images'> }> = ({ user }): React.ReactElement => {
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

const Wiggle: React.FC = (): React.ReactElement => {
    return <svg xmlns="http://www.w3.org/2000/svg" width="250.416" height="50.639" viewBox="0 0 248.416 50.639">
        <path d="M240.58,13.245s.423.565-16.322,0S195.826-2.681,180.116-3.263,159.21,17.895,144.788,20.627,127.233,4.162,114.275,3.551,98.875,31.144,83.924,27.62,67.029-3.627,46.289-3.263,30.445,13.486,12.011,13.245s.06.3-10.646,0" transform="translate(5, 10)" fill="none" stroke="#5b0fa9" strokeLinecap="round" strokeWidth="5" />
    </svg>;
}


const Player: React.FC<{ playback: PlaybackState }> = ({ playback }): React.ReactElement => {
    const vals = [
        'M240.58,13.245s.423.565-16.322,0S195.826-2.681,180.116-3.263,159.21,17.895,144.788,20.627,127.233,4.162,114.275,3.551,98.875,31.144,83.924,27.62,67.029-3.627,46.289-3.263,30.445,13.486,12.011,13.245s.06.3-10.646,0',
        'M240.58,13.245s.423.565-16.322,0-26.564,7.963-42.275,7.382-24.187-10.114-38.61-7.382-15.236,7.992-28.194,7.382-16.638-3.858-31.589-7.382-15.146,3.909-35.886,4.273-17.261-4.032-35.7-4.273.06.3-10.646,0',
        'M240.58,13.245s.423.565-16.322,0S196.552,36.786,180.841,36.2,158.7.257,144.273,2.989s-14.3,25.822-27.258,25.211-15.9-26.982-30.85-30.506-14.256,38.147-35,38.511S30.445,13.486,12.011,13.245s.06.3-10.646,0'
    ]

    return (
        playback ?
            <div className="player">
                <div>
                    {/* <h3>{playback.is_playing ? 'Playing' : 'Paused'}</h3> */}
                    <img className={`player__cover  mb-3 ${playback.is_playing ? 'player__cover--playing' : ''}`} src={playback?.item.album.images[0].url}></img>
                    <div className="song__name mb-1">{playback.item.name}</div>
                    <div className="song__artist mb-3">{playback.item.album.artists[0].name}</div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="250.416" height="50.639" viewBox="0 0 248.416 50.639">
                        <path id="wiggly" className={playback.is_playing ? 'playing' : ''} d={vals[1]} transform="translate(5, 10)" fill="none" stroke="#5b0fa9" strokeLinecap="round" strokeWidth="5">
                            {/* <animate attributeName="d" values={vals[0] + ';' + vals[1]}

                                keyTimes="0; 0.5; 1" calcMode="spline" dur="0.7s" repeatCount="indefinite" /> */}
                        </path>

                    </svg>

                </div>
                <a className='link song__link' href={`https://open.spotify.com/track/${playback.item.id}`}>View on Spotify</a>
            </div>
            :
            (<div>No tracks playing</div>)
    )
};


const PartyPage: React.FC<Props> = ({ match }): React.ReactElement => {
    const { user, isLoading } = useUser();
    const [currentParty, setCurrentParty] = useState<Party | undefined>(undefined);
    const [partyStub, setCurrentPartyStub] = useState<PartyStub | undefined>(undefined);
    const partyId = match.params.id;

    const currentPartyRef = useRef(currentParty)
    const intervalRef = useRef<any>(null)
    const DJ_POLL_TIME = 2000;

    // this is so that the socket io handler methods get the latest version of currentParty
    useEffect(() => {
        currentPartyRef.current = currentParty;
    }, [currentParty])

    useEffect(() => {
        // socket.on(SocketEvent.PARTY_EXISTS_CHECK_RES, onPartyExistsCheck);
        socket.emit(SocketEvent.PARTY_EXISTS_CHECK_REQ, partyId);

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

        socket.emit(SocketEvent.PARTY_JOINED_REQ, { user: user, socketId: socket.id, partyId: partyId })
        socket.on(SocketEvent.PARTY_POLL, onPartyPoll);

    }, [user, isLoading])


    const onPartyPoll = (party: Party) => {
        if (party.adminUser?.id === user?.id) {
            startPolling(party.id);
        } else if (party.playbackState) {
            stopPolling();
            const isNowPlaying = party.playbackState.is_playing && !currentPartyRef.current?.playbackState?.is_playing;
            const isNowPaused = !party.playbackState.is_playing && currentPartyRef.current?.playbackState?.is_playing;
            const isNewSong = currentPartyRef.current?.playbackState?.item.id !== party.playbackState.item.id;

            if (isNowPlaying || isNewSong) {
                playSong(party.playbackState, true);
            } else if (isNowPaused) {
                pauseSong();
            }
        }
        setCurrentParty(party);
    }

    const onPartyJoinedUnauthed = (partyStub: PartyStub) => {
        console.log('party stub: ', partyStub)
        setCurrentPartyStub(partyStub);
    }

    const handleUserLeaving = () => {
        socket.emit(SocketEvent.USER_LEFT_PARTY_REQ, { userId: user?.id, partyId: partyId });

        socket.off(SocketEvent.PARTY_JOINED_UNAUTHED_RES, onPartyJoinedUnauthed);
        socket.off(SocketEvent.PARTY_POLL, onPartyPoll);
        stopPolling();

        console.log('Leaving party.');
    }

    const startPolling = (partyId: string) => {
        if (intervalRef.current !== null) {
            return;
        }
        console.log("STARTING POLL")
        intervalRef.current = setInterval(() => {
            getCurrentlyPlaying(partyId);
        }, DJ_POLL_TIME);
    }

    const stopPolling = () => {
        if (intervalRef.current === null) {
            return;
        }
        console.log("STOPPED POLL")
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
                if (!res.data || !res.data.item) {
                    console.log('Nothing is playing, its an ad, or you are in private mode.');
                    return;
                }
                socket.emit(SocketEvent.PARTY_PLAYBACK_REQ, { playbackState: res.data, partyId: partyId })
            })
            .catch(err => { console.log('could not get currently playing') })
    };

    const searchSong = (query: string): Promise<AxiosResponse<SearchResults>> => {
        return axios.get(SPOTIFY_API.SEARCH, { params: { type: "track", q: query.replace(' ', '+') } })
    }


    return (
        <div className="party-wrap">
            {user && !isLoading && currentParty ?
                (<div>
                    {/* <h2 className="mb-2">Welcome to the party {user.display_name} 🎉</h2> */}
                    {currentParty.playbackState ? <Player playback={currentParty.playbackState} /> : null}
                    <LeftSideBar party={currentParty} user={user} />
                </div>)
                :
                <div className="party--unauthed">
                    <Wiggle />
                    {partyStub ? <UnauthedParty partyStub={partyStub} /> : <div>Loading...</div>}
                    <div className="party--unauthed__footer">
                        <div className="mb-3">
                            <Wiggle />
                        </div>
                        <a className="link" href="/">go to the home page</a>
                    </div>
                </div>
            }
        </div >);

};

export default PartyPage;


