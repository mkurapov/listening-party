import * as http from "http";
import * as socketio from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { SocketEvent, User, Party, PlaybackState, PartyStub } from 'common'
import dotenv from 'dotenv';
import { StateModel } from './database';

dotenv.config()

export class Socket {
    private io: socketio.Server;
    private server: http.Server;

    private partyMap = new Map<string, Party>();
    private userMap = new Map<string, User>(); //socket id, user

    private PLAYSTATE_POLL = 200;

    constructor(server: http.Server, port: number | string) {
        this.server = server;

        setInterval(() => {
            this.saveState();
        }, 10000);

        this.io = socketio.listen(this.server, { origins: '*:*' });
        this.io.on("connection", (socket: socketio.Socket) => {
            console.log("Connected client on port:", port);
            socket.on(SocketEvent.USER_LOGGEDIN_REQ, (userId) => {
                this.userMap.set(socket.id, userId);
                console.log('New user logged in ')
            });

            socket.on("disconnect", () => {
                console.log("disconnected");
            });

            socket.on("disconnecting", () => {
                console.log("disconnecting");
                const partyId = Object.keys(socket.rooms).filter(room => room != socket.id)[0];
                const userToDisconnect = this.userMap.get(socket.id);
                if (userToDisconnect) {
                    socket.leave(partyId);
                    console.log('userId:', userToDisconnect.id, ' partyId: ', partyId);
                    removeUserFromParty(userToDisconnect.id, partyId);
                }
            });

            socket.on(SocketEvent.CREATE_PARTY_REQ, ({ socketId }) => {
                const newParty: Party = {
                    id: uuidv4(),
                    users: [],
                    queue: [],
                    playbackState: null
                }

                const partyCreator = this.userMap.get(socketId);
                newParty.adminUser = partyCreator;

                this.partyMap.set(newParty.id, newParty);

                this.io.to(socketId).emit(SocketEvent.CREATE_PARTY_RES, newParty.id);
                this.io.to(newParty.id).emit(SocketEvent.PARTY_POLL, this.partyMap.get(newParty.id));

                setInterval(() => {
                    this.io.to(newParty.id).emit(SocketEvent.PARTY_POLL, this.partyMap.get(newParty.id));
                }, this.PLAYSTATE_POLL);
            })

            socket.on(SocketEvent.PARTY_EXISTS_CHECK_REQ, (partyId) => {
                this.io.to(socket.id).emit(SocketEvent.PARTY_EXISTS_CHECK_RES, this.partyMap.has(partyId))
            });

            socket.on(SocketEvent.PARTY_JOINED_UNAUTHED_REQ, (partyId) => {
                console.log('unauthed join to ', partyId);
                if (this.partyMap.has(partyId)) {
                    const party = this.partyMap.get(partyId)

                    const partyStub: PartyStub = {
                        playbackState: party.playbackState,
                        users: party.users.map((user: User) => {
                            return {
                                display_name: user.display_name,
                                images: user.images
                            }
                        })
                    }
                    this.io.to(socket.id).emit(SocketEvent.PARTY_JOINED_UNAUTHED_RES, partyStub);
                }
            });

            socket.on(SocketEvent.PARTY_JOINED_REQ, ({ user, socketId, partyId }: { user: User, socketId: string, partyId: string }) => {
                console.log(`${user.id} trying to join ${partyId}`)

                if (!this.partyMap.has(partyId)) {
                    return;
                }

                // dont push same user twice
                const partyState = this.partyMap.get(partyId);
                if (!partyState.users.find(userInParty => userInParty.id === user.id)) {
                    partyState.users.push(user);
                }

                // make this boi admin
                if (!partyState.adminUser) {
                    partyState.adminUser = user;
                }

                socket.join(partyId);
                this.io.to(socketId).emit(SocketEvent.PARTY_JOINED_RES, partyState);
            });

            socket.on(SocketEvent.USER_LEFT_PARTY_REQ, ({ userId, partyId }: { userId: string, partyId: string }) => {
                socket.leave(partyId);
                removeUserFromParty(userId, partyId);
            })

            socket.on(SocketEvent.PARTY_PLAYBACK_REQ, ({ playbackState, partyId }: { playbackState: PlaybackState, partyId: string }) => {
                const currentParty = this.partyMap.get(partyId);
                if (currentParty && playbackState) {
                    const updatedPartyState = { ...currentParty, playbackState };
                    this.partyMap.set(partyId, updatedPartyState);
                }
            });

            socket.on(SocketEvent.PARTY_CHANGED_ADMIN_REQ, ({ partyId, newAdminUser }: { partyId: string, newAdminUser: User }) => {
                const partyState = this.partyMap.get(partyId);
                if (partyState) {
                    partyState.adminUser = newAdminUser;
                }
            });

            const removeUserFromParty = (userIdToDisconnect, partyId) => {
                if (this.partyMap.has(partyId)) {
                    const partyState = this.partyMap.get(partyId);
                    partyState.users = partyState.users.filter(u => u.id !== userIdToDisconnect);

                    if (partyState.adminUser?.id === userIdToDisconnect) {
                        if (partyState.users.length > 0) {
                            partyState.adminUser = partyState.users[0];
                        } else {
                            partyState.adminUser = null;
                        }
                    }
                }
                this.userMap.delete(socket.id);
            }
        });
    }

    public saveState(): void {
        const currentState = {
            numUsers: this.userMap.size,
            numParties: this.partyMap.size
        };

        const state = new StateModel(currentState)
        state.save();
    }
}