import { Express, Request, Response } from "express";
import express from "express";
import * as http from "http";
import * as path from "path";
import * as socketio from 'socket.io';
import { User } from '../models/User';

const FE_PATH = '/build/client';


export class Server {

    private app: Express;
    private server: http.Server;

    private io: socketio.Server;
    private port: number;

    private users: User[] = [];

    constructor(app: Express) {
        this.app = app;

        this.app.use(express.static(path.resolve("./") + FE_PATH));

        // this.app.get("/api", (req: Request, res: Response): void => {
        //     res.send("You have reached the API!");
        // });

        this.app.get("*", (req: Request, res: Response): void => {
            res.sendFile(path.resolve("./") + `${FE_PATH}/index.html`);
        });
    }

    public start(port: number): void {
        this.port = port;
        this.server = this.app.listen(port, () => console.log(`Server listening on port ${port}!`));
        this.io = socketio.listen(this.server, { origins: '*:*' });
        this.io.on("connection", (socket: any) => {
            console.log("Connected client on port:", this.port);

            socket.on("login", (user: User) => {
                this.users.push(user);
                console.log('logged in', user);
                console.log('users:', this.users);
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected");
            });
        });
        console.log(socketio);
    }
}