import { Server } from "./app/server/server";
import { Socket } from "./app/server/socket";
import express from 'express';
const app = express();

const port = 8080;

const server = new Server(app);
const httpServer = server.start(port);
const socket = new Socket(httpServer, port);
