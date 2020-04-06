import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import axios from 'axios';
import Button from '../components/Button';
import API_ENDPOINTS from '../endpoints';
import { getHashParams } from '../helpers';

interface AuthHashParams {
    access_token: string;
    token_type: string;
    expires_in: string;
}

const Home = (): React.ReactElement => {
    const clientId = 'ac96599f92324f9ea5a9f0e80f48b9a4';
    let location = useLocation();
    const scopes = ['user-read-private', 'user-modify-playback-state', 'user-read-currently-playing', 'user-read-playback-state'];
    // const state = '';
    const redirectUri = 'http://localhost:3000/';
    const authURL = `https://accounts.spotify.com/authorize?response_type=token&client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scopes.join('%20'))}&redirect_uri=${encodeURIComponent(redirectUri)}`

    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        if (!location.hash) return;

        setIsLoggedIn(true);

        let locationArgs: AuthHashParams = getHashParams(location.hash);
        axios.defaults.headers.common['Authorization'] = 'Bearer ' + locationArgs.access_token;
    });

    if (!isLoggedIn) {
        return (<div>
            <a href={authURL}> Login </a>
        </div>);
    }

    const getCurrentlyPlaying = async () => {
        const userResponse = await axios.get(API_ENDPOINTS.CURRENT_PLAYBACK);
        console.log(userResponse.data);
    }

    return (<div>
        YOU ARE LOGGED IN
        <Button name="dogs" onClick={getCurrentlyPlaying}></Button>
    </div>)

};

export default Home;
