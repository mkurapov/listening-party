import React, { useEffect, useState } from 'react';
import { SocketEvent, Party, PlaybackState, User } from 'common'
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

const imageStyle = {
    // width: '100vw',
    height: '300px'
}

const Player: React.FC<{ playback: PlaybackState }> = ({ playback }): React.ReactElement => {
    return (
        <div>
            <h3 className="song mb-2">{playback?.item.name} by {playback?.item.album.artists[0].name}</h3>
            <img style={imageStyle} src={playback.item.album.images[0].url}></img>
            <h3>{playback.is_playing ? 'Playing' : 'Paused'}</h3>
        </div>
    )
};

const UserAvatar: React.FC<{ user: User; isAdmin: boolean }> = ({ user, isAdmin }): React.ReactElement => {
    return <span className="avatar">
        {user.images.length > 0 ?
            <img className="avatar__img" src={user.images[0].url}></img>
            :
            <span className="avatar__placeholder">
                <span className="avatar__placeholder__letter">{user.display_name.substr(0, 1)}</span>

            </span>
        }
        <span className="avatar__name">{user.display_name} {isAdmin ? '(DJ)' : ''}</span>
    </span>
};

const PartyPage: React.FC<Props> = ({ match }): React.ReactElement => {
    const { user, isLoading } = useUser();
    const [currentParty, setCurrentParty] = useState<Party | undefined>(undefined);
    const partyId = match.params.id;
    const history = useHistory();
    const POLL_TIME = 2000;
    let pollCurrentlyPlaying: any;

    const currentPartyRef = React.useRef(currentParty);
    console.log(SocketEvent.TEST);

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

        socket.emit(SocketEvent.PARTY_JOINED_REQ, { user: user, socketId: socket.id, partyId: partyId })
    }, [user, isLoading])

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

    // const onPartyJoinedUnauthed = (numberOfUsers: number) => {
    //     console.log('PARTY JOINED BACK')
    //     setNumberOfUsers(numberOfUsers);
    // }

    return (
        <div className="party-wrap">
            {user && !isLoading && user.id ?
                (<div>
                    <Button onClick={onLeaveParty} name="Leave Party"></Button>
                    <h2 className="mb-2">Welcome to the party {user.display_name} 🎉</h2>
                    {currentParty?.playbackState ?
                        <Player playback={currentParty.playbackState} />
                        :
                        <div>No tracks playing</div>
                    }
                    <div className="user-wrap">
                        <h2>People in the party are</h2>
                        <div className="users">{currentParty?.users?.map(user => <UserAvatar key={user.id} isAdmin={user.id === currentParty.adminUser?.id} user={user} />)}</div>
                    </div>
                </div>)
                :
                (
                    <div>
                        < div > This is a party, but you aint authed.</div>
                        {currentParty ?
                            <div>
                                <h4>Users in party</h4>
                                <div className="users">{currentParty?.users?.map(user => <UserAvatar key={user.id} isAdmin={false} user={user} />)}</div>
                            </div>
                            :
                            <div>no one here</div>
                        }
                        <a href={APP_API.LOGIN}>Login</a>
                    </div>
                )
            }
        </div >);

};

export default PartyPage;


