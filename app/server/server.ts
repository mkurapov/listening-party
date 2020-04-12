import { Express, Request, Response } from "express";
import express from "express";
import * as http from "http";
import * as path from "path";
import cors from 'cors';
import axios, { AxiosResponse } from 'axios';
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv';
dotenv.config()

import querystring from 'query-string';
import { generateRandomString } from '../helpers/helpers'

const FE_PATH = path.join(__dirname, '../../build/client');
const SPOTIFY_ACCOUNT_URL = 'https://accounts.spotify.com';

const SPOTIFY_AUTH_URL = SPOTIFY_ACCOUNT_URL + '/authorize';
const SPOTIFY_TOKEN_URL = SPOTIFY_ACCOUNT_URL + '/api/token';

const REDIRECT_URL = process.env.NODE_ENV === 'production' ?
    'https://listeningpartey.herokuapp.com/callback' :
    'http://localhost:8080/callback';

console.log('FE_PATH:', FE_PATH);
interface SpotifyTokenResponse {
    access_token: string;
    refresh_token: string;
}

export class Server {
    private app: Express;
    private port: number | string;

    private stateKey = 'spotify_auth_state';

    constructor(app: Express) {
        this.app = app;

        this.app.use(express.static(FE_PATH));
        this.app.use(cors())
        this.app.use(cookieParser())

        this.app.get("/login", this.login);
        this.app.get('/callback', this.callback);
        this.app.get('/refresh_token', this.refreshToken);

        this.app.get('*', (_: Request, res: Response): void => {
            res.sendFile(FE_PATH + '/index.html')
        });

        // this.app.use((req, res, next) => {
        //     if (req.method === 'GET' && req.accepts('html') && !req.is('json') &&
        //         !req.path.includes('.')) {
        //         res.sendFile(FE_PATH)
        //     } else next();
        // });
    }

    public start(port: number | string): http.Server {
        this.port = port;
        return this.app.listen(port, () => console.log(`Server listening on port ${port}!`));
    }

    public login = (_: Request, res: Response): void => {
        const state = generateRandomString(16);
        res.cookie(this.stateKey, state);

        const scopes = ['user-read-private', 'user-modify-playback-state', 'user-read-currently-playing', 'user-read-playback-state'];
        const authURL = SPOTIFY_AUTH_URL + '?' +
            querystring.stringify({
                response_type: 'code',
                client_id: process.env.CLIENT_ID,
                scope: scopes.join(' '),
                redirect_uri: REDIRECT_URL,
                state: state
            });
        res.redirect(authURL);
    }

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
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then((response: AxiosResponse<SpotifyTokenResponse>) => {
            res.clearCookie(this.stateKey);


            res.redirect(`/#` + querystring.stringify({
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token
            }));
        }).catch(error => {
            console.log(error.response.data);
            console.log(error.response.status);
        })
    }

    public refreshToken = (req: Request, res: Response): void => {
        const refresh_token = req.query.refresh_token;

        axios({
            method: 'post',
            url: SPOTIFY_TOKEN_URL,
            params: {
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then((response: AxiosResponse<SpotifyTokenResponse>) => {
            res.send({
                'access_token': response.data.access_token,
            });
        }).catch(error => {
            console.log(error.response);
            console.log(error.response);
        });
    };
}