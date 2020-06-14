import cron from "node-cron";
import * as http from "http";
import * as socketio from "socket.io";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { State as StateModel, StateObject } from "./models/state";
import { Party, User, SocketEvent, PartyStub, PlaybackState } from "./types";

dotenv.config();

export class Socket {
  private io: socketio.Server;
  private server: http.Server;

  private partyMap = new Map<string, Party>();
  private socketToUserMap = new Map<string, User>(); //socket id, user ud
  private userMap = new Map<string, boolean>();

  private PLAYSTATE_POLL = 200;

  constructor(server: http.Server, port: number | string) {
    this.server = server;

    this.io = socketio.listen(this.server, { origins: "*:*" });
    this.io.on("connection", (socket: socketio.Socket) => {
      console.log(`Connected client on port ${port} with socketId: ${socket.id}`);
      socket.on(SocketEvent.USER_LOGGEDIN_REQ, (user: User) => {
        console.log(`User with id ${user.id} logged in `);

        if (this.userMap.get(user.id)) {
          console.log(`${user.id} already logged in `);
          this.io.to(socket.id).emit(SocketEvent.USER_ALREADY_CONNECTED_RES);
          return;
        }

        this.socketToUserMap.set(socket.id, user);
        this.userMap.set(user.id, true);
      });

      socket.on("disconnect", () => {
        console.log("disconnected");
      });

      socket.on("disconnecting", () => {
        const userToDisconnect = this.socketToUserMap.get(socket.id);

        if (userToDisconnect) {
          console.log(`disconnecting user id: ${userToDisconnect.id}`);
          this.socketToUserMap.delete(socket.id);
          this.userMap.delete(userToDisconnect.id);

          const partyId = Object.keys(socket.rooms).filter((room) => room != socket.id)[0];
          if (partyId) {
            socket.leave(partyId);
            console.log("userId:", userToDisconnect.id, " partyId: ", partyId);
            removeUserFromParty({ userId: userToDisconnect.id, partyId });
          }
        }
      });

      socket.on(SocketEvent.CREATE_PARTY_REQ, ({ socketId }) => {
        const newParty: Party = {
          id: uuidv4(),
          users: [],
          createdAt: new Date(),
          playbackState: null,
        };

        const partyCreator = this.socketToUserMap.get(socketId);
        newParty.adminUser = partyCreator;

        this.partyMap.set(newParty.id, newParty);

        this.startEmittingToParty(newParty.id);

        this.io.to(socketId).emit(SocketEvent.CREATE_PARTY_RES, newParty.id);
        this.io.to(newParty.id).emit(SocketEvent.PARTY_POLL, this.partyMap.get(newParty.id));
      });

      socket.on(SocketEvent.PARTY_EXISTS_CHECK_REQ, (partyId) => {
        this.io.to(socket.id).emit(SocketEvent.PARTY_EXISTS_CHECK_RES, this.partyMap.has(partyId));
      });

      socket.on(SocketEvent.PARTY_JOINED_UNAUTHED_REQ, (partyId) => {
        console.log("unauthed join to ", partyId);
        if (this.partyMap.has(partyId)) {
          const party = this.partyMap.get(partyId);

          const partyStub: PartyStub = {
            playbackState: party.playbackState,
            users: party.users.map((user: User) => {
              return {
                display_name: user.display_name,
                images: user.images,
              };
            }),
          };
          this.io.to(socket.id).emit(SocketEvent.PARTY_JOINED_UNAUTHED_RES, partyStub);
        }
      });

      socket.on(SocketEvent.PARTY_JOINED_REQ, ({ user, socketId, partyId }: { user: User; socketId: string; partyId: string }) => {
        console.log(`${user.id} trying to join ${partyId}`);

        if (!this.partyMap.has(partyId)) {
          return;
        }

        console.log(`${user.id} joined ${partyId}`);

        // dont push same user twice
        const party = this.partyMap.get(partyId);
        if (!party.users.find((userInParty) => userInParty.id === user.id)) {
          party.users.push(user);
        }

        // make this boi admin
        if (!party.adminUser) {
          party.adminUser = user;
        }

        socket.join(partyId);
        this.io.to(socketId).emit(SocketEvent.PARTY_JOINED_RES, party);
      });

      socket.on(SocketEvent.USER_LEFT_PARTY_REQ, ({ userId, partyId }: { userId: string; partyId: string }) => {
        socket.leave(partyId);
        removeUserFromParty({ userId, partyId });
      });

      socket.on(SocketEvent.PARTY_PLAYBACK_REQ, ({ playbackState, partyId }: { playbackState: PlaybackState; partyId: string }) => {
        const currentParty = this.partyMap.get(partyId);
        if (currentParty) {
          const updatedPartyState = { ...currentParty, playbackState };
          this.partyMap.set(partyId, updatedPartyState);
        }
      });

      socket.on(SocketEvent.PARTY_CHANGED_ADMIN_REQ, ({ partyId, newAdminUser }: { partyId: string; newAdminUser: User }) => {
        const partyState = this.partyMap.get(partyId);
        if (partyState) {
          partyState.adminUser = newAdminUser;
        }
      });

      const removeUserFromParty = ({ userId, partyId }) => {
        if (this.partyMap.has(partyId)) {
          const partyState = this.partyMap.get(partyId);
          partyState.users = partyState.users.filter((u) => u.id !== userId);

          if (partyState.adminUser?.id === userId) {
            if (partyState.users.length > 0) {
              partyState.adminUser = partyState.users[0];
            } else {
              partyState.adminUser = null;
            }
          }
        }
      };
    });
  }

  private startEmittingToParty(partyId: string): void {
    setInterval(() => {
      this.io.to(partyId).emit(SocketEvent.PARTY_POLL, this.partyMap.get(partyId));
    }, this.PLAYSTATE_POLL);
  }

  public start(): void {
    this.recoverState();

    cron.schedule("*/5 * * * * *", () => {
      this.saveState();
    });
  }

  private async recoverState(): Promise<void> {
    const savedState = await StateModel.findOne().sort({ createdAt: -1 }).lean<StateObject>().exec();

    if (savedState.parties) {
      console.log("**** recovering state **** ");
      this.partyMap = new Map<string, Party>();

      for (let party of savedState.parties as Party[]) {
        party.users = [];
        party.adminUser = undefined;

        this.partyMap.set(party.id, party);
        this.startEmittingToParty(party.id);
      }
    }
  }

  private saveState(): void {
    const numUsers = this.socketToUserMap.size;
    const numParties = this.partyMap.size;

    console.log("***** saving state *****");

    const parties = [];
    this.partyMap.forEach((party) => {
      parties.push(party);

      console.log(`*********`);
      console.log(`${party.id}: users: ${JSON.stringify(party.users.map((u) => u.id).join(" ,"))}`);
    });

    const state = new StateModel({
      parties,
    });
    state.save();
  }
}
