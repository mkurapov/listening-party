import React, { useState, useEffect, useMemo, createContext, useContext, useRef } from "react";

import axios, { AxiosResponse } from 'axios';

import { getHashParams, getTimeWithMinutesOffset } from '../helpers/helpers';
import { SPOTIFY_API, APP_API } from "../const";
import socket from "../socket";
import { User, SocketEvent } from "common";
import { useHistory } from "react-router";

interface AuthHashParams {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

interface RefreshAccessTokenResponse {
    access_token: string;
}

export interface UserContext {
    user: User | undefined;
    isLoading: boolean;
    logout: () => void;
}

const UserContext = createContext<UserContext>({
    user: undefined,
    isLoading: false,
    logout: () => { },
});

const UserProvider: React.FC = ({ children }): React.ReactElement => {
    const [user, setUser] = useState<User>();
    const [isLoading, setIsLoading] = useState(true);
    const history = useHistory();
    let storedUser: string | null;
    let storedAccessToken: string | null;
    let storedRefreshToken: string | null;

    const refreshTokenCheckInterval = useRef<any>(null)
    const REFRESH_TOKEN_POLL_TIME = 30 * 6000;

    const startRefreshTokenPoll = () => {
        if (refreshTokenCheckInterval.current !== null) {
            return;
        }
        refreshTokenCheckInterval.current = setInterval(() => {
            refreshAccessToken();
        }, REFRESH_TOKEN_POLL_TIME);
    }

    const stopRefreshTokenPoll = () => {
        if (refreshTokenCheckInterval.current === null) {
            return;
        }
        clearInterval(refreshTokenCheckInterval.current);
        refreshTokenCheckInterval.current = null;
    }

    useEffect(() => {
        console.log('Checking login...');

        storedUser = localStorage.getItem('user');
        storedAccessToken = localStorage.getItem('access_token');
        storedRefreshToken = localStorage.getItem('refresh_token');

        if (!storedUser || !storedAccessToken || !storedRefreshToken) {
            console.log('No saved user found.')
            if (!window.location.hash) {
                console.log('No hash.')
                setIsLoading(false);
                return;
            }
            console.log('Found hash.')
            loginCallback();
            return;
        }

        console.log('Using stored user.');

        // Use stored user
        const parsedUser = JSON.parse(storedUser) as User;

        const expiryDate = localStorage.getItem('expiry_time');
        if (expiryDate && new Date().getTime() > parseInt(expiryDate)) {
            console.log('expired refresh token');
            refreshAccessToken();
        } else {
            setAuthheader(storedAccessToken);
        }

        startRefreshTokenPoll();
        updateUser(parsedUser);
        checkIfPendingParty();

        return () => stopRefreshTokenPoll();
    }, [])

    const refreshAccessToken = () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            return;
        }
        console.log('GETTING NEW ACCESS TOKEN');
        getNewAccessToken(refreshToken).then(res => {
            setAuthheader(res.data.access_token);
            localStorage.setItem('access_token', res.data.access_token);
            localStorage.setItem('expiry_time', getTimeWithMinutesOffset(59).getTime().toString())
        });
    }

    const checkIfPendingParty = () => {
        const pendingPartyId = localStorage.getItem('pending_party');
        if (pendingPartyId) {
            console.log('Is trying to join party ', pendingPartyId);
            history.push('/party/' + pendingPartyId)
            localStorage.removeItem('pending_party');
        }
    }

    const loginCallback = (): void => {
        let locationArgs: AuthHashParams = getHashParams(window.location.hash);
        setAuthheader(locationArgs.access_token);
        axios.get(SPOTIFY_API.ME).then((res: AxiosResponse<User>) => {
            updateUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
            localStorage.setItem('access_token', locationArgs.access_token);
            localStorage.setItem('refresh_token', locationArgs.refresh_token);
            localStorage.setItem('expiry_time', getTimeWithMinutesOffset(59).getTime().toString())
            checkIfPendingParty();
        });
    }

    const updateUser = (user: User): void => {
        setUser(user);
        setIsLoading(false);
        socket.emit(SocketEvent.USER_LOGGEDIN_REQ, user);
    }

    const logout = (): void => {
        setUser(undefined);
        localStorage.clear();
    }

    const getNewAccessToken = (refreshToken: string): Promise<AxiosResponse<RefreshAccessTokenResponse>> => {
        return axios.get(APP_API.REFRESH_TOKEN, {
            params: {
                refresh_token: refreshToken
            }
        });
    }

    const setAuthheader = (accessToken: string) => {
        axios.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
    }

    const SettingsContext = useMemo(() => ({
        user,
        isLoading,
        logout
    }), [user, logout]);

    return (
        <UserContext.Provider value={SettingsContext}>
            {children}
        </UserContext.Provider>
    );
};

const useUser = () => useContext(UserContext);
export { UserProvider, useUser };

