import { Express, Request, Response } from "express";
import express from "express";
import * as http from "http";
import * as path from "path";
import * as socketio from 'socket.io';
import cors from 'cors';
import axios, { AxiosError, AxiosResponse } from 'axios';
import cookieParser from 'cookie-parser'

import querystring from 'query-string';
import { User } from '../models/User';
import { generateRandomString } from '../helpers/helpers'
import Axios from "axios";

const FE_PATH = '/build/';
const SPOTIFY_ACCOUNT_URL = 'https://accounts.spotify.com';

const SPOTIFY_AUTH_URL = SPOTIFY_ACCOUNT_URL + '/authorize';
const SPOTIFY_TOKEN_URL = SPOTIFY_ACCOUNT_URL + '/api/token';

const CLIENT_ID = 'ac96599f92324f9ea5a9f0e80f48b9a4';
const CLIENT_SECRET = '104d17c7173e4cce98a5efbe5d5efdbd';
const REDIRECT_URL = 'http://localhost:8080/callback';

interface SpotifyTokenResponse {
    access_token: string;
    refresh_token: string;
}


export class Server {

    private app: Express;
    private server: http.Server;

    private io: socketio.Server;
    private port: number;

    private users: User[] = [];

    private stateKey = 'spotify_auth_state';

    public callback = (req: Request, res: Response): Promise<any> => {

        const code = req.query.code || null;
        const state = req.query.state || null;
        const storedState = req.cookies ? req.cookies[this.stateKey] : null;

        if (state === null || state !== storedState) {
            res.redirect('/#' +
                querystring.stringify({
                    error: 'state_mismatch'
                }));
            return;
        }

        axios({
            method: 'post',
            url: SPOTIFY_TOKEN_URL,
            params: {
                code: code,
                redirect_uri: REDIRECT_URL,
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then((response: AxiosResponse<SpotifyTokenResponse>) => {
            res.clearCookie(this.stateKey);
            console.log(response.data);
            res.redirect('/home');

        }).catch(error => {
            console.log(error.response.data);
            console.log(error.response.status);
        })

        // const options = {
        //     url: 'https://api.spotify.com/v1/me',
        //     headers: { 'Authorization': 'Bearer ' + access_token },
        //     json: true
        // };

    }


    constructor(app: Express) {
        this.app = app;

        this.app.use(express.static(path.resolve("./") + FE_PATH));
        this.app.use(cors())
        this.app.use(cookieParser())

        this.app.get("/login", (req: Request, res: Response): void => {
            // res.send("You have reached the API!");

            const state = generateRandomString(16);
            res.cookie(this.stateKey, state);

            const scopes = ['user-read-private', 'user-modify-playback-state', 'user-read-currently-playing', 'user-read-playback-state'];
            const authURL = SPOTIFY_AUTH_URL + '?' +
                querystring.stringify({
                    response_type: 'code',
                    client_id: CLIENT_ID,
                    scope: scopes.join(' '),
                    redirect_uri: REDIRECT_URL,
                    state: state
                });
            res.redirect(authURL);
        });

        this.app.get('/callback', this.callback);

        this.app.get("*", (req: Request, res: Response): void => {
            res.sendFile(path.resolve("./") + `${FE_PATH}/index.html`);
        });
    }

    public start(port: number): void {
        this.port = port;
        this.server = this.app.listen(port, () => console.log(`Server listening on port ${port}!`));
        // this.io = socketio.listen(this.server, { origins: '*:*' });
        // this.io.on("connection", (socket: any) => {
        //     console.log("Connected client on port:", this.port);

        //     socket.on("login", (user: User) => {
        //         this.users.push(user);
        //         console.log('logged in', user);
        //         console.log('users:', this.users);
        //     });

        //     socket.on("disconnect", () => {
        //         console.log("Client disconnected");
        //     });
        // });
        // console.log(socketio);
    }
}