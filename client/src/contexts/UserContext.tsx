import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";

import axios, { AxiosResponse } from 'axios';
import { User } from '../common/models';
import { SocketEvent } from '../common/events';

import { getHashParams, getTimeWithMinutesOffset } from '../helpers/helpers';
import { SPOTIFY_API, APP_API } from "../const";
import socket from "../socket";

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
    let storedUser: string | null;
    let storedAccessToken: string | null;
    let storedRefreshToken: string | null;

    useEffect(() => {
        storedUser = localStorage.getItem('user');
        storedAccessToken = localStorage.getItem('access_token');
        storedRefreshToken = localStorage.getItem('refresh_token');

        if (!storedUser || !storedAccessToken || !storedRefreshToken) {
            if (!window.location.hash) return;
            console.log('loggin in ...')
            login();
            return;
        }

        const parsedUser = JSON.parse(storedUser) as User;

        const expiryDate = localStorage.getItem('expiry_time');
        if (expiryDate && new Date().getTime() > parseInt(expiryDate)) {
            console.log('expired');
            getNewAccessToken(storedRefreshToken).then(res => {
                updateUser(parsedUser);
                setAuthheader(res.data.access_token);
                localStorage.setItem('access_token', res.data.access_token);
                localStorage.setItem('expiry_time', getTimeWithMinutesOffset(59).getTime().toString())
            });
        } else {
            setAuthheader(storedAccessToken);
            updateUser(parsedUser);
        }
    }, [])

    const login = (): void => {
        let locationArgs: AuthHashParams = getHashParams(window.location.hash);
        setAuthheader(locationArgs.access_token);
        axios.get(SPOTIFY_API.ME).then((res: AxiosResponse<User>) => {
            updateUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
            localStorage.setItem('access_token', locationArgs.access_token);
            localStorage.setItem('refresh_token', locationArgs.refresh_token);
            localStorage.setItem('expiry_time', getTimeWithMinutesOffset(1).getTime().toString())
        });
    }

    const updateUser = (user: User): void => {
        setUser(user);
        setIsLoading(false);
        socket.emit(SocketEvent.USER_LOGGEDIN_REQ, user.id);
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

