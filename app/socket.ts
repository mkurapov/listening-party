import * as http from "http";
import * as socketio from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { SocketEvent, User, Party, PlaybackState, Track } from 'common'
import dotenv from 'dotenv';
dotenv.config()

export class Socket {
    private io: socketio.Server;
    private server: http.Server;

    private partyMap = new Map<string, Party>();
    private userMap = new Map<string, string>(); //socket id, user id

    constructor(server: http.Server, port: number | string) {
        this.server = server;
        this.io = socketio.listen(this.server, { origins: '*:*' });
        this.io.on("connection", (socket: socketio.Socket) => {
            console.log("Connected client on port:", port);
            socket.on(SocketEvent.USER_LOGGEDIN_REQ, (userId) => {
                this.userMap.set(socket.id, userId);
                console.log('New user logged in ')
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected");
            });

            socket.on("disconnecting", () => {
                const partyId = Object.keys(socket.rooms).filter(room => room != socket.id)[0];
                const userIdToDisconnect = this.userMap.get(socket.id);
                removeUserFromParty(partyId, userIdToDisconnect);
            });

            socket.on(SocketEvent.CREATE_PARTY_REQ, socketId => {
                const newParty: Party = {
                    id: uuidv4(),
                    users: [],
                    queue: [],
                    playbackState: null
                }
                this.partyMap.set(newParty.id, newParty);
                this.io.to(socketId).emit(SocketEvent.CREATE_PARTY_RES, newParty.id);
            })

            socket.on(SocketEvent.PARTY_EXISTS_CHECK_REQ, (partyId) => {
                this.io.to(socket.id).emit(SocketEvent.PARTY_EXISTS_CHECK_RES, this.partyMap.has(partyId))
            });

            socket.on(SocketEvent.PARTY_JOINED_UNAUTHED_REQ, (partyId) => {
                console.log('unauthed join to ', partyId);
                if (this.partyMap.has(partyId)) {
                    const party = this.partyMap.get(partyId)
                    const partyStub: Pick<Party, "users"> = {
                        users: party.users.map((user: User) => {
                            return {
                                display_name: user.display_name,
                                images: user.images,
                                id: null,
                                product: null
                            }
                        })
                    }
                    console.log(partyStub)
                    this.io.to(socket.id).emit(SocketEvent.PARTY_JOINED_UNAUTHED_RES, partyStub);
                }
            });

            socket.on(SocketEvent.PARTY_ADD_TO_QUEUE_REQ, ({ track, partyId }: { track: Track, partyId: string }) => {
                console.log('adding to queue: ', { track, partyId });
                const currentParty = this.partyMap.get(partyId);
                if (currentParty) {
                    currentParty.queue.push(track);
                    this.io.to(partyId).emit(SocketEvent.PARTY_ADD_TO_QUEUE_RES, currentParty);
                }
            });

            socket.on(SocketEvent.PARTY_JOINED_REQ, ({ user, socketId, partyId }: { user: User, socketId: string, partyId: string }) => {
                console.log(`${user.id} trying to join ${partyId}`)

                if (!this.partyMap.has(partyId)) {
                    // this.io.to(socketId).emit(SocketEvent.PARTY_NOT_FOUND_RES);
                    return;
                }

                // dont push same user twice
                const partyState = this.partyMap.get(partyId);
                if (!partyState.users.find(userInParty => userInParty.id === user.id)) {
                    partyState.users.push(user);
                }

                socket.join(partyId);
                this.io.to(socketId).emit(SocketEvent.PARTY_JOINED_RES, partyState)
                socket.broadcast.to(partyId).emit(SocketEvent.PARTY_NEW_USER_JOINED_RES, partyState);
                setNewAdmin(partyState)
            });

            socket.on(SocketEvent.USER_LEFT_PARTY_REQ, ({ userId, partyId }: { userId: string, partyId: string }) => {
                removeUserFromParty(partyId, userId);
            })

            socket.on(SocketEvent.PARTY_PLAYBACK_REQ, ({ playbackState, partyId }: { playbackState: PlaybackState, partyId: string }) => {
                const currentParty = this.partyMap.get(partyId);
                if (currentParty && playbackState) {
                    const updatedPartyState = { ...currentParty, playbackState };
                    this.partyMap.set(partyId, updatedPartyState);
                    this.io.to(partyId).emit(SocketEvent.PARTY_PLAYBACK_CHANGED_RES, updatedPartyState);
                }
            });

            socket.on(SocketEvent.PARTY_CHANGED_ADMIN_REQ, ({ partyId, newAdminUser }: { partyId: string, newAdminUser: User }) => {
                console.log('chaning admin user in ', partyId, 'to: ', newAdminUser)
                const partyState = this.partyMap.get(partyId);
                if (partyState) {
                    // shouldnt happen, but just check
                    if (partyState.adminUser.id !== newAdminUser.id) {
                        partyState.adminUser = newAdminUser;
                    }
                    this.io.to(partyState.id).emit(SocketEvent.PARTY_CHANGED_ADMIN_RES, partyState);
                }
            });

            const removeUserFromParty = (partyId, userIdToDisconnect) => {
                if (this.partyMap.has(partyId)) {
                    const partyState = this.partyMap.get(partyId);
                    partyState.users = partyState.users.filter(u => u.id !== userIdToDisconnect);

                    if (partyState.adminUser.id === userIdToDisconnect) {
                        setNewAdmin(partyState);
                    }

                    this.io.to(partyId).emit(SocketEvent.USER_LEFT_PARTY_RES, partyState);
                }

                this.userMap.delete(socket.id);
            }

            const setNewAdmin = (partyState: Party) => {
                if (partyState.users.length > 0) {
                    partyState.adminUser = partyState.users[0];
                }
                this.io.to(partyState.id).emit(SocketEvent.PARTY_CHANGED_ADMIN_RES, partyState);
            }
        });
    }
}