import { Express, Request, Response } from "express";
import express from "express";
import * as http from "http";
import * as path from "path";
import * as socketio from 'socket.io';
import cors from 'cors';
import axios, { AxiosError, AxiosResponse } from 'axios';
import cookieParser from 'cookie-parser'
import { v4 as uuidv4 } from 'uuid';
import { SocketEvent } from '../client/src/common';


import querystring from 'query-string';
import { User, Party } from '../client/src/common';
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


    private totalUsers: number;
    private partyMap = new Map<string, Party>();
    private userMap = new Map<string, string>();

    private stateKey = 'spotify_auth_state';

    constructor(app: Express) {
        this.app = app;

        this.app.use(express.static(path.resolve("./") + FE_PATH));
        this.app.use(cors())
        this.app.use(cookieParser())

        this.app.get("/login", (req: Request, res: Response): void => {
            console.log('loggin in ')

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

        this.app.get('/callback', this.authenticate);

        this.app.get('*', (req: Request, res: Response): void => {
            res.sendFile(path.resolve("./") + FE_PATH)
        });
    }

    public start(port: number): void {
        this.port = port;
        this.server = this.app.listen(port, () => console.log(`Server listening on port ${port}!`));
        this.setUpSocket();
    }

    public authenticate = (req: Request, res: Response): Promise<any> => {
        const code = req.query.code || null;
        const state = req.query.state || null;
        const storedState = req.cookies ? req.cookies[this.stateKey] : null;

        console.log(code);
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


            res.redirect(`/#` + querystring.stringify({
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token
            }));
        }).catch(error => {
            console.log(error.response.data);
            console.log(error.response.status);
        })
    }

    private setUpSocket(): void {
        this.io = socketio.listen(this.server, { origins: '*:*' });
        this.io.on("connection", (socket: socketio.Socket) => {
            console.log("Connected client on port:", this.port);
            socket.on(SocketEvent.USER_CONNECTED_REQ, (userId) => {
                this.userMap.set(socket.id, userId);
            });

            // socket.on(SocketEvent.USER_DISCONNECTED_REQ, (user) => {
            //     this.userMap.delete(user.id);
            // });

            socket.on('reconnect', () => {
                console.log('reconnecting')
            })

            socket.on("newconnection", (user: User) => {

                // console.log('logged in', user);
                // this.io.emit('newconnection', user);
            });

            socket.on('unsubscribe', () => {

            });

            socket.on("disconnect", () => {
                console.log("Client disconnected");
            });

            socket.on("disconnecting", () => {
                // console.log('buddy leaving the party')
                removeUserFromParty();
            });

            socket.on(SocketEvent.CREATE_PARTY_REQ, socketId => {
                const newParty: Party = {
                    id: uuidv4(),
                    users: [],
                    queue: []
                }
                this.partyMap.set(newParty.id, newParty);
                // console.log('made new party: ', newParty);
                this.io.to(socketId).emit(SocketEvent.CREATE_PARTY_RES, newParty.id);
            })

            socket.on(SocketEvent.PARTY_JOINED_REQ, ({ user, socketId, partyId }) => {
                console.log(`${user.id} trying to join ${partyId}`)

                if (!this.partyMap.has(partyId)) {
                    this.io.to(socketId).emit(SocketEvent.PARTY_NOT_FOUND_RES);
                    return;
                }

                const currentParty = this.partyMap.get(partyId);
                if (!currentParty.users.find(userInParty => userInParty.id === user.id)) {
                    currentParty.users.push(user);
                }

                socket.join(partyId);
                this.io.to(partyId).emit(SocketEvent.PARTY_JOINED_RES, currentParty)
            });

            // socket.on(SocketEvent.PARTY_JOINED_UNAUTHED_REQ, ({ socketId, partyId }) => {
            //     let response = null;
            //     if (this.partyMap.has(partyId)) {
            //         response = this.partyMap.get(partyId);
            //     }
            //     this.io.to(socketId).emit(SocketEvent.PARTY_JOINED_UNAUTHED_RES, response);
            // });

            socket.on(SocketEvent.USER_LEFT_PARTY_REQ, () => {
                removeUserFromParty();
            })

            const removeUserFromParty = () => {
                const parties = Object.keys(socket.rooms).filter(room => room != socket.id);
                if (parties.length > 0) {
                    for (let partyId of parties) {
                        if (this.partyMap.has(partyId)) {
                            const partyState = this.partyMap.get(partyId);
                            const userIdToDisconnect = this.userMap.get(socket.id);
                            partyState.users = partyState.users.filter(u => u.id !== userIdToDisconnect);
                            this.io.to(partyId).emit(SocketEvent.USER_LEFT_PARTY_RES, partyState);
                        }
                    }
                }
                this.userMap.delete(socket.id);
            }

            const joinUserToParty = () => {

            }
        });
    }

}