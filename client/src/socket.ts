import io from 'socket.io-client'
import { APP_URL } from './const';

const socket = io(APP_URL);
export default socket;