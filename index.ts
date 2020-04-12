import { Server } from "./app/server";
import { Socket } from "./app/socket";
import express from 'express';
const app = express();

const port: string | number = process.env.PORT || 8080;

const server = new Server(app);
const httpServer = server.start(port);
const socket = new Socket(httpServer, port);
