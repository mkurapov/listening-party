import React, { useEffect } from 'react';
import './App.css';
import io from 'socket.io-client'

import { Switch, Route } from 'react-router-dom';
import Home from './pages/Home';
import { User } from '../../models/User';


function App() {

  const socket = io("http://localhost:8080");

  useEffect(() => {
    console.log(socket);
    const newUser: User = {
      name: 'Fred'
    };
    socket.emit('login', newUser);
  });

  return (
    <div className="App">
      <header className="App-header">
      </header>
      <Switch>
        <Route exact path='/'>
          <Home />
        </Route>
      </Switch>

    </div>
  );
}

export default App;
