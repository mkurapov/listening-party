import React, { useEffect } from 'react';
import './App.css';
import io from 'socket.io-client'
import axios from 'axios';

import { Switch, Route, useHistory } from 'react-router-dom';
import Home from './pages/Home';
import { User } from '../../models/User';
import Button from './components/Button';




function App() {
  const APP_URL = 'http://localhost:8080'
  const history = useHistory();

  // const socket = io("http://localhost:8080");

  const login = async () => {
    const loginResponse = await axios.get(APP_URL + '/login');
    console.log(loginResponse.data);
    // history.push(loginResponse.data.url);
    // window.location.href = loginResponse.data.url;
  }


  return (
    <div className="App">
      <header className="App-header">
      </header>
      <Switch>
        <Route exact path='/'>
          <a href="/login">Login</a>

        </Route>
      </Switch>

    </div>
  );
}

export default App;
