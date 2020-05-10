import React from 'react';
import { PlaybackState } from 'common';

import './Player.css';

const Player: React.FC<{ playback: PlaybackState }> = ({ playback }): React.ReactElement => {
    const vals = [
        'M240.58,13.245s.423.565-16.322,0S195.826-2.681,180.116-3.263,159.21,17.895,144.788,20.627,127.233,4.162,114.275,3.551,98.875,31.144,83.924,27.62,67.029-3.627,46.289-3.263,30.445,13.486,12.011,13.245s.06.3-10.646,0',
        'M240.58,13.245s.423.565-16.322,0-26.564,7.963-42.275,7.382-24.187-10.114-38.61-7.382-15.236,7.992-28.194,7.382-16.638-3.858-31.589-7.382-15.146,3.909-35.886,4.273-17.261-4.032-35.7-4.273.06.3-10.646,0',
        'M240.58,13.245s.423.565-16.322,0S196.552,36.786,180.841,36.2,158.7.257,144.273,2.989s-14.3,25.822-27.258,25.211-15.9-26.982-30.85-30.506-14.256,38.147-35,38.511S30.445,13.486,12.011,13.245s.06.3-10.646,0'
    ]

    return (
        playback ?
            <div className="player">
                {/* <h3>{playback.is_playing ? 'Playing' : 'Paused'}</h3> */}
                <div className="player__album">
                    <img className={`player__cover  ${playback.is_playing ? 'player__cover--playing' : ''}`} src={playback?.item.album.images[0].url}></img>
                </div>
                <div className="player__details">
                    <div className="mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="250.416" height="50.639" viewBox="0 0 248.416 50.639">
                            <path id="wiggly" className={playback.is_playing ? 'playing' : ''} d={vals[1]} transform="translate(5, 10)" fill="none" stroke="#5b0fa9" strokeLinecap="round" strokeWidth="5">
                                {/* <animate attributeName="d" values={vals[0] + ';' + vals[1]}

                                keyTimes="0; 0.5; 1" calcMode="spline" dur="0.7s" repeatCount="indefinite" /> */}
                            </path>

                        </svg>
                    </div>
                    <div className="song__name mb-1">{playback.item.name}</div>
                    <div className="song__artist mb-3">{playback.item.album.artists[0].name}</div>
                </div>


                {/* <a className='link song__link' href={`https://open.spotify.com/track/${playback.item.id}`}>View on Spotify</a> */}
            </div>
            :
            (<div>No tracks playing</div>)
    )
};


export default Player;
