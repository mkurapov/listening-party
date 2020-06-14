import io from 'socket.io-client'
import { APP_API } from './const';

const socket = io(APP_API.ROOT);
export default socket;
