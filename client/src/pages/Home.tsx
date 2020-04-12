import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Party } from '../common/models';
import { SocketEvent } from '../common/events';

import Button from '../components/Button';
import { useUser } from '../contexts/UserContext';
import { APP_API } from '../const';
import socket from '../socket';

import '../App.css';



const Home = (): React.ReactElement => {
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
                <h1>Hi, {user.display_name}!</h1>
                <Button name="Start a party 🎉" onClick={createRoom}></Button>
                <a href="" className="d-block" onClick={logout}>Logout</a>
            </div>
            :
            <a href={APP_API.LOGIN}>Login</a>}
    </div>);

};

export default Home;
