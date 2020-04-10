import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client'
import { SocketEvent, Party } from '../common';
import axios from 'axios';
import Button from '../components/Button';
import { getHashParams } from '../helpers/helpers';
import { withRouter, match, useHistory } from 'react-router';

import { useUser } from '../contexts/UserContext';
import socket from '../socket';
import { User } from '../common';

interface Props {
    match: any;
}

const PartyPage: React.FC<Props> = ({ match }): React.ReactElement => {
    const { user, isLoading } = useUser();
    const [numberOfUsers, setNumberOfUsers] = useState(0);
    const [party, setParty] = useState<Party | undefined>(undefined);
    const [usersInParty, setUsersInParty] = useState<User[]>([]);
    const partyId = match.params.id;
    const history = useHistory();


    socket.on(SocketEvent.PARTY_JOINED_RES, (party: Party) => {
        console.log('USER JOINED PARTY', party);
        setParty(party);
    });

    socket.on(SocketEvent.USER_LEFT_PARTY_RES, (party: Party) => {
        console.log('USER LEFT PARTY', party);
        setParty(party);
    });

    socket.on(SocketEvent.PARTY_NOT_FOUND_RES, (party: Party) => {
        console.log('This party was not found... redirecting back');
        setTimeout(() => {
            history.push('/');
        }, 2000);
    });

    useEffect(() => {
        console.log('loaded party first time')
        // NEED TO CHECK IF PARTY EXISTS HERE 
        return () => { socket.emit(SocketEvent.USER_LEFT_PARTY_REQ) };
    }, [])


    useEffect(() => {
        if (!user || isLoading) {
            console.log('You are not authed');
            return;
        }

        console.log('Logged in as ', user.id);
        socket.emit(SocketEvent.PARTY_JOINED_REQ, { user: user, socketId: socket.id, partyId: partyId })
    }, [user])

    // const onPartyJoinedUnauthed = (numberOfUsers: number) => {
    //     console.log('PARTY JOINED BACK')
    //     setNumberOfUsers(numberOfUsers);
    // }

    return (
        <div>
            {user && user.id ?
                <div>
                    <h1>A duper dope party</h1>
                    <div>Hi, {user.id}!</div>
                    <div>Users in there: {party?.users?.map(user => user.display_name)}</div>
                </div>
                :
                <div>This is a party, but you aint authed.</div>}
        </div>);

};

export default PartyPage;
