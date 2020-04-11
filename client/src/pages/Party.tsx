import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client'
import { SocketEvent, Party, PlaybackState } from '../common';
import axios, { AxiosResponse } from 'axios';
import Button from '../components/Button';
import { getHashParams } from '../helpers/helpers';
import { withRouter, match, useHistory } from 'react-router';

import { useUser } from '../contexts/UserContext';
import socket from '../socket';
import { User } from '../common';
import { SPOTIFY_API } from '../const';
import '../App.css'

interface Props {
    match: any;
}

const imageStyle = {
    // width: '100vw',
    height: '300px'
}

const PartyPage: React.FC<Props> = ({ match }): React.ReactElement => {
    const { user, isLoading } = useUser();
    const [currentParty, setCurrentParty] = useState<Party | undefined>(undefined);
    const partyId = match.params.id;
    const history = useHistory();
    let pollCurrentlyPlaying: any;

    const currentPartyRef = React.useRef(currentParty);

    // this is so that the socket io handler methods get the latest version of currentParty
    useEffect(() => {
        currentPartyRef.current = currentParty;
    }, [currentParty])

    useEffect(() => {
        // NEED TO CHECK IF PARTY EXISTS HERE 
        return () => handleUserLeaving();
    }, [])

    const registerListeners = () => {
        socket.on(SocketEvent.USER_LEFT_PARTY_RES, onUserLeftParty);
        socket.on(SocketEvent.PARTY_PLAYBACK_CHANGED_RES, onPlaybackChanged);
        socket.on(SocketEvent.PARTY_NOT_FOUND_RES, onPartyNotFound);
        socket.on(SocketEvent.PARTY_NEW_USER_JOINED_RES, onNewUserJoined);
        socket.on(SocketEvent.PARTY_JOINED_RES, onPartyJoined);
        socket.on(SocketEvent.PARTY_CHANGED_ADMIN_RES, onAdminChanged);
    }

    useEffect(() => {
        if (!user || isLoading) {
            if (!isLoading) {
                console.log('You are not authed');
            }
            return;
        }

        console.log('Logged in as ', user.display_name);

        registerListeners();
        socket.emit(SocketEvent.PARTY_JOINED_REQ, { user: user, socketId: socket.id, partyId: partyId })
    }, [user])



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
        console.log('New user joined,', party.users ? party.users[party.users?.length - 1].display_name : '');
        setCurrentParty(party);
    }

    const onPartyNotFound = () => {
        console.log('This party was not found... redirecting back');
        setTimeout(() => {
            history.push('/');
        }, 2000);
    }

    const onPartyJoined = (party: Party) => {
        setCurrentParty(party);
        if (party.playbackState && party.playbackState.is_playing) {
            playSong(party.playbackState, true);
        }
    }

    const onAdminChanged = (party: Party) => {
        const wasPreviouslyAdmin = currentPartyRef.current?.adminUser?.id === user?.id;

        if ((party.adminUser?.id === user?.id) && !wasPreviouslyAdmin) {
            console.log('Youve been assigned admin.')
            clearInterval(pollCurrentlyPlaying);
            getCurrentlyPlaying(party.id);
            pollCurrentlyPlaying = setInterval(() => {
                getCurrentlyPlaying(party.id);
            }, 2000);
        }
        setCurrentParty(party);
    }

    const handleUserLeaving = () => {
        socket.off(SocketEvent.USER_LEFT_PARTY_RES, onUserLeftParty);
        socket.off(SocketEvent.PARTY_PLAYBACK_CHANGED_RES, onPlaybackChanged);
        socket.off(SocketEvent.PARTY_NOT_FOUND_RES, onPartyNotFound);
        socket.off(SocketEvent.PARTY_NEW_USER_JOINED_RES, onNewUserJoined);
        socket.off(SocketEvent.PARTY_JOINED_RES, onPartyJoined);
        socket.off(SocketEvent.PARTY_CHANGED_ADMIN_RES, onAdminChanged);

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




    // const onPartyJoinedUnauthed = (numberOfUsers: number) => {
    //     console.log('PARTY JOINED BACK')
    //     setNumberOfUsers(numberOfUsers);
    // }

    return (
        <div>
            {user && user.id ?
                <div>
                    <h2>Welcome to the party {user.display_name} 🎉</h2>
                    <h2 className="subheading">{currentParty?.adminUser?.display_name === user.display_name ? 'You are the DJ.' : `Your DJ is ${currentParty?.adminUser?.display_name}`}</h2>
                    {currentParty?.playbackState ?
                        <div>
                            <h3>Playing {currentParty?.playbackState?.item.name} by {currentParty?.playbackState?.item.album.artists[0].name}</h3>
                            <img style={imageStyle} src={currentParty.playbackState.item.album.images[0].url}></img>
                            <h3>{currentParty.playbackState.is_playing ? 'Playing' : 'Paused'}</h3>
                        </div>
                        :
                        <div>No tracks playing</div>
                    }
                    <h2 className="users">People in the party are {currentParty?.users?.map(user => user.display_name).join(', ')}</h2>
                </div>
                :
                <div>This is a party, but you aint authed.</div>}
        </div>);

};

export default PartyPage;
