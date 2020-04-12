import React from 'react';
import './App.css';

import { Switch, Route } from 'react-router-dom';
import Home from './pages/Home';
import PartyPage from './pages/Party';
import { UserProvider } from './contexts/UserContext';


function App() {
  console.log(process.env.NODE_ENV);
  return (
    <UserProvider>
      <div className="App">
        {/* <header className="App-header">
          </header> */}
        <Switch>
          <Route exact path='/'>
            <Home></Home>
          </Route>
          <Route path='/party/:id' component={PartyPage} />
        </Switch>
      </div>
    </UserProvider>
  );
}

export default App;
