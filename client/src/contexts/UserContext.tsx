import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";

import axios, { AxiosResponse } from 'axios';
import { User, SocketEvent } from '../common';

import { getHashParams } from '../helpers/helpers';
import { SPOTIFY_API } from "../const";
import socket from "../socket";

interface AuthHashParams {
    access_token: string;
    refresh_token: string;
    token_type: string;
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

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        const savedAccessToken = localStorage.getItem('access_token');
        const savedRefreshToken = localStorage.getItem('access_token');


        if (!savedUser || !savedAccessToken || !savedRefreshToken) {
            if (!window.location.hash) return;
            login();
        }

        if (savedUser) {
            const user = JSON.parse(savedUser) as unknown as User;
            setUser(user);
            setIsLoading(false);
            socket.emit(SocketEvent.USER_CONNECTED_REQ, user.id);
        }
    }, [])

    const login = (): void => {
        let locationArgs: AuthHashParams = getHashParams(window.location.hash);
        axios.defaults.headers.common['Authorization'] = 'Bearer ' + locationArgs.access_token;
        axios.get(SPOTIFY_API.ME).then((res: AxiosResponse<User>) => {
            const user = res.data;
            setUser(user);
            socket.emit(SocketEvent.USER_CONNECTED_REQ, user.id);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('access_token', locationArgs.access_token);
            localStorage.setItem('refresh_token', locationArgs.refresh_token);
        });
    }

    const logout = (): void => {
        // socket.emit(SocketEvent.USER_DISCONNECTED_REQ, user);
        setUser(undefined);
        localStorage.clear();
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

