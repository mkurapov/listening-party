import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { SocketEvent, Party } from '../common';

import Button from '../components/Button';
import { useUser } from '../contexts/UserContext';
import { APP_URL } from '../const';
import socket from '../socket';


const Home = (): React.ReactElement => {
    const LOGIN_URL = APP_URL + '/login';
    const history = useHistory();
    const { user, logout } = useUser();

    useEffect(() => {
        socket.on(SocketEvent.CREATE_PARTY_RES, (newPartyId: Party) => {
            history.push('/party/' + newPartyId)
        });


    }, [])


    const createRoom = (): void => {
        socket.emit(SocketEvent.CREATE_PARTY_REQ, socket.id);
    }

    return (<div>
        {user && user.id ?
            <div>
                <div>Hi, {user.id}!</div>
                <Button name="Logout" onClick={logout}></Button>
                <Button name="Create new Room" onClick={createRoom}></Button>
            </div>
            :
            <a href={LOGIN_URL}>Login</a>}
    </div>);

};

export default Home;
