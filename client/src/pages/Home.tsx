import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { SocketEvent, Party, User } from 'common'
import Button from '../components/Button';
import { useUser } from '../contexts/UserContext';
import { APP_API } from '../const';
import socket from '../socket';
import Wiggle from '../components/Wiggle';

import './Home.css';

const WiggleSeparator: React.FC = (): React.ReactElement => {
    return (<div className="wiggle-separator"><Wiggle /></div>)
}
const FAQ: React.FC = (): React.ReactElement => {
    return (
        <div className="page">
            <div className="page-info">
                <h1 className="text--xl text-center font-weight-bold mb-3">FAQ</h1>
                <div className="page__list text-center">
                    <div className="font-weight-bold text--lg">Who can be host?</div>
                    <div className="mb-4 text--lg">The current host can make any other user the host.</div>
                    <div className="font-weight-bold text--lg">Does this require Spotify Premium?</div>
                    <div className="mb-4 text--lg">Yes, playing a track on your device through this app requires a paid account.</div>
                    <div className="font-weight-bold text--lg">Does this work for podcasts?</div>
                    <div className="mb-4 text--lg">No, sorry, no podcast parties for now.</div>
                    <div className="font-weight-bold text--lg">Do I have to have the tab open in order for this to work?</div>
                    <div className="mb-4 text--lg">Yes, in order to have the music synced, the tab to the link should be open. A Chrome extension is possible in the future.  😎 </div>
                    <div className="font-weight-bold text--lg">Can I request feaures/make a comment?</div>
                    <div className="text--lg">Of course! It would be also much appreciated. You can do this <a className="link" href="https://forms.gle/LYAqcmCUKxigzUhg7">here</a>.</div>
                </div>
            </div>
        </div>
    )
}

const HowItWorks: React.FC = (): React.ReactElement => {
    return (
        <div className="page">
            <div className="page-info">
                <h1 className="text--xl text-center font-weight-bold mb-3">How does it work?</h1>
                <ol className="page__list">
                    <li className="page__list-item text--lg">Login with Spotify</li>
                    <li className="page__list-item text--lg">Start a party & start playing Spotify on any device</li>
                    <li className="page__list-item text--lg">Send your friends the party link</li>
                    <li className="page__list-item text--lg">The host's (DJ's) currently playing track gets synced-up to every user in the party</li>
                </ol>
            </div>
        </div>
    )
}

const HomePageUnauthed = (): React.ReactElement => {
    return (
        <div className="page page--full">
            <div>
                <h1 className="text--xl font-weight-bold mb-3">Spotify Listening Party 🎉</h1>
                <h2 className="text--lg mb-4">Listen to music in-sync with your friends</h2>
                <a href={APP_API.LOGIN} className="btn btn--primary">Login with Spotify</a>
            </div>
        </div>);
}

const HomePageAuthed: React.FC<{ user: User }> = ({ user }): React.ReactElement => {
    const history = useHistory();
    const { logout } = useUser();

    useEffect(() => {
        socket.on(SocketEvent.CREATE_PARTY_RES, (newPartyId: Party) => {
            history.push('/party/' + newPartyId)
        });

        return () => unregisterListeners();
    }, [])

    const unregisterListeners = () => {
        socket.off(SocketEvent.CREATE_PARTY_RES);
    };


    const createRoom = (): void => {
        socket.emit(SocketEvent.CREATE_PARTY_REQ, { socketId: socket.id });
    }

    return (
        <>
            <div className="page page--full">
                <div className="text-center">
                    <div className="text--xxl">Hi, {user.display_name}!</div>
                    <div className="home__subtext mb-3 text--lg">Welcome to Listening Party.</div>
                    <Button classes="btn--primary d-block mb-4" name="Start a party 🎉" onClick={createRoom}></Button>
                </div>
                <div className="home__logout">
                    <a onClick={logout} className="link">or logout</a>
                </div>
            </div>
        </>
    );
}

const Home = (): React.ReactElement => {
    const { user, logout } = useUser();

    return (<div className="home">
        <WiggleSeparator />
        {user && user.id ? <HomePageAuthed user={user} /> : <HomePageUnauthed />}
        <WiggleSeparator />
        <HowItWorks />
        <WiggleSeparator />
        <FAQ />
        <WiggleSeparator />
        <div className="home__footer">
            <a href="https://maxs.space" onClick={logout} className="link">made by max</a>
        </div>
    </div >);

};

export default Home;
