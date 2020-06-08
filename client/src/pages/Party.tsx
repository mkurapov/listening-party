import React, { useEffect, useState, useRef } from "react";
import axios, { AxiosResponse } from "axios";

import { useUser } from "../contexts/UserContext";
import socket from "../socket";
import { SPOTIFY_API, APP_API } from "../const";
import "./Party.css";
import Wiggle from "../components/Wiggle";
import Player from "../components/Player";
import Sidebar from "../components/Sidebar";
import UserAvatar from "../components/UserAvatar";
import { useHistory } from "react-router";
import Button from "../components/Button";
import { PartyStub, Track, Party, SocketEvent, PlaybackState, User, StubbedUsers } from "../types";

interface Props {
  match: any;
}

const OtherUsersAvatar: React.FC<{ count: number }> = ({ count }): React.ReactElement => {
  return (
    <span className="avatar">
      <span className="avatar__placeholder">
        <span className="avatar__placeholder__letter">+ {count}</span>
      </span>
    </span>
  );
};

const PartyStubComponent: React.FC<{ partyStub: PartyStub }> = ({ partyStub }) => {
  const USERS_TO_SHOW = 5;

  const UnslicedUsers = () => {
    return (
      <div>
        {partyStub.users.map((user, i) => (
          <div key={i} className="user--unauthed mr-1">
            <UserAvatar user={user} />
            <span className="user__info--unauthed mt-2">{user.display_name}</span>
          </div>
        ))}
      </div>
    );
  };

  const SlicedUsers = () => {
    return (
      <div>
        {partyStub.users.slice(0, USERS_TO_SHOW - 1).map((user, i) => (
          <div className="user--unauthed mr-1">
            <UserAvatar key={i} user={user} />
            <span className="user__info--unauthed mt-2">{user.display_name}</span>
          </div>
        ))}
        <div className="user--unauthed mr-1">
          <OtherUsersAvatar count={partyStub.users.length - USERS_TO_SHOW} />
          <span className="user__info--unauthed mt-2">others</span>
        </div>
      </div>
    );
  };

  const PartyInfo = () => {
    let personInfo;
    if (partyStub.users.length === 1) {
      personInfo = `1 person in the party is`;
    } else {
      personInfo = `${partyStub.users.length} people in the party are`;
    }
    const songArtist = partyStub.playbackState?.item.artists[0].name;

    return <div className="text--lg mb-4">{`${personInfo} listening to ${songArtist ? songArtist : "some great tunes."}`}</div>;
  };

  return (
    <div>
      <PartyInfo />
      <div className="users--unauthed mb-4">{partyStub.users.length > USERS_TO_SHOW ? <SlicedUsers /> : <UnslicedUsers />}</div>
      <a className="btn btn--primary d-block" href={APP_API.LOGIN}>
        Join them with Spotify
      </a>
    </div>
  );
};

const UnauthedParty: React.FC<{ partyStub: PartyStub | undefined; loginError: string | undefined }> = ({
  partyStub,
  loginError,
}): React.ReactElement => {
  return (
    <div className="party--unauthed">
      <Wiggle />
      <div>
        {loginError ? (
          <div className="text--lg party-message">You are already connected somewhere else. Please check another open Spotify Music Party tab.</div>
        ) : partyStub ? (
          <PartyStubComponent partyStub={partyStub} />
        ) : (
          <div className="text--lg party-message">Not a live party. Returning home...</div>
        )}
      </div>
      <div className="party--unauthed__footer">
        <div className="mb-3">
          <Wiggle />
        </div>
        <a className="link" href="/">
          go to the home page
        </a>
      </div>
    </div>
  );
};

const AuthedParty: React.FC<{ currentParty: Party; user: User; error: string | null }> = ({ currentParty, user, error }): React.ReactElement => {
  const [copyLinkBtnText, setCopyLinkBtnText] = useState("Copy invite link");
  const history = useHistory();

  const onCopyLink = (): void => {
    const dummy = document.createElement("input"),
      text = window.location.href;

    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    setCopyLinkBtnText("Copied! 🎉");
    setTimeout(() => {
      setCopyLinkBtnText("Copy invite link");
    }, 3000);
  };

  return (
    <div>
      <div className="nav__mobile">
        <a className="link link--leave-mobile text-center" onClick={() => history.push("/")}>
          Leave party
        </a>
        <Button classes="btn--sm btn--primary" name={copyLinkBtnText} onClick={onCopyLink}></Button>
      </div>
      <div className="party-contents">
        {currentParty.playbackState ? (
          <>
            <div className="party-title">Spotify Music Party</div>
            <Player playback={currentParty.playbackState} />
          </>
        ) : (
          <div className="text--lg party-message">{error ?? "Loading..."}</div>
        )}
      </div>

      <Sidebar party={currentParty} user={user} />
    </div>
  );
};

const PartyPage: React.FC<Props> = ({ match }): React.ReactElement => {
  const { user, isLoading: isLoadingUser, error: loginError } = useUser();
  const [currentParty, setCurrentParty] = useState<Party | undefined>(undefined);
  const [isLoadingParty, setIsLoadingParty] = useState<boolean>(true);

  const [partyStub, setCurrentPartyStub] = useState<PartyStub | undefined>(undefined);
  const partyId = match.params.id;
  const history = useHistory();

  const currentPartyRef = useRef(currentParty);
  const errorMessageRef = useRef<string | null>(null);

  const intervalRef = useRef<any>(null);

  const DJ_POLL_TIME = 1000;

  // this is so that the socket io handler methods get the latest version of currentParty
  useEffect(() => {
    currentPartyRef.current = currentParty;
  }, [currentParty]);

  useEffect(() => {
    socket.on(SocketEvent.PARTY_EXISTS_CHECK_RES, onPartyExistsCheck);
    socket.emit(SocketEvent.PARTY_EXISTS_CHECK_REQ, partyId);

    socket.on(SocketEvent.PARTY_JOINED_UNAUTHED_RES, onPartyJoinedUnauthed);
    return () => handleUserLeaving();
  }, []);

  const isAdminUser = (): boolean => user?.id === currentPartyRef.current?.adminUser?.id;

  useEffect(() => {
    if (!user || isLoadingUser) {
      if (!isLoadingUser) {
        console.log("You are not authed");
        localStorage.setItem("pending_party", partyId);
        socket.emit(SocketEvent.PARTY_JOINED_UNAUTHED_REQ, partyId);
        setIsLoadingParty(false);
      }
      return;
    }

    if (loginError) {
      return;
    }

    console.log("Logged in as ", user.display_name);

    socket.emit(SocketEvent.PARTY_JOINED_REQ, { user: user, socketId: socket.id, partyId: partyId });
    socket.on(SocketEvent.PARTY_POLL, onPartyPoll);
  }, [user, isLoadingUser]);

  const onPartyPoll = (party: Party) => {
    // console.log("polling party: ", party);
    if (party.adminUser?.id === user?.id) {
      startPollingCurrentlyPlaying(party.id);
    } else if (party.playbackState) {
      stopPollingCurrentlyPlaying();
      const isNowPlaying = party.playbackState.is_playing && !currentPartyRef.current?.playbackState?.is_playing;
      const isNowPaused = !party.playbackState.is_playing && currentPartyRef.current?.playbackState?.is_playing;
      const isNewSong = currentPartyRef.current?.playbackState?.item.id !== party.playbackState.item.id;

      if (isNowPlaying || isNewSong) {
        playSong(party.playbackState, true);
      } else if (isNowPaused) {
        pauseSong();
      }
    }

    setCurrentParty(party);
    if (isLoadingParty) {
      setIsLoadingParty(false);
    }
  };

  const onPartyExistsCheck = (hasParty: boolean) => {
    console.log("party check: ", hasParty);
    if (!hasParty) {
      errorMessageRef.current = "Party does not exist, returning to home screen...";
      console.log("error: ", errorMessageRef.current);
      setTimeout(() => {
        history.push("/");
      }, 3000);
    }
  };

  const onPartyJoinedUnauthed = (partyStub: PartyStub) => {
    console.log("party stub: ", partyStub);
    setCurrentPartyStub(partyStub);
  };

  const handleUserLeaving = () => {
    socket.emit(SocketEvent.USER_LEFT_PARTY_REQ, { userId: user?.id, partyId: partyId });

    socket.off(SocketEvent.PARTY_JOINED_UNAUTHED_RES, onPartyJoinedUnauthed);
    socket.off(SocketEvent.PARTY_POLL, onPartyPoll);
    socket.off(SocketEvent.PARTY_EXISTS_CHECK_RES, onPartyExistsCheck);
    stopPollingCurrentlyPlaying();

    console.log("Leaving party.");
  };

  const stopPollingCurrentlyPlaying = () => {
    if (intervalRef.current === null) {
      return;
    }
    console.log("STOPPED DJ  POLL");
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const startPollingCurrentlyPlaying = (partyId: string) => {
    if (intervalRef.current !== null) {
      return;
    }
    console.log("STARTING DJ POLL");
    intervalRef.current = setInterval(() => {
      getCurrentlyPlaying(partyId);
    }, DJ_POLL_TIME);
  };

  const playSong = (playbackState: PlaybackState, isFirstTime = false) => {
    console.log("setting currently playing...");

    const args = {
      uris: [playbackState.item.uri],
      position_ms: isFirstTime ? playbackState.progress_ms : 0,
    };
    axios
      .put(SPOTIFY_API.PLAY, args)
      .then(() => {
        console.log("Playing new song: ", playbackState.item.name);
        if (errorMessageRef.current) {
          errorMessageRef.current = null;
        }
      })
      .catch((err) => {
        const error = err.response.data.error;
        if (error.reason === "NO_ACTIVE_DEVICE") {
          console.log("Could not play song. No active device found.");
          errorMessageRef.current = `No active Spotify device found. Please open Spotify, and hit play to start listening.`;
          setTimeout(() => {
            playSong(playbackState);
          }, 1000);
        } else if (error.reason === "PREMIUM_REQUIRED") {
          console.log("Could not play song. Premium required.");
        } else {
          console.log("Could not play song. Error: ", error);
        }
      });
  };

  const pauseSong = () => {
    axios
      .put(SPOTIFY_API.PAUSE)
      .then(() => console.log("Paused song."))
      .catch((err) => {
        const error = err.response.data.error;
        console.log("Could not pause song: ", error);
      });
  };

  const getCurrentlyPlaying = (partyId: string) => {
    console.log("Getting currently playing...");
    axios
      .get(SPOTIFY_API.CURRENTLY_PLAYING)
      .then((res: AxiosResponse<PlaybackState>) => {
        if (!res.data || !res.data.item) {
          console.log("Nothing is playing, its an ad, or you are in private mode.");
          socket.emit(SocketEvent.PARTY_PLAYBACK_REQ, { playbackState: undefined, partyId: partyId });
          errorMessageRef.current = isAdminUser
            ? "Nothing is playing on your Spotify device, or you are listening in private mode."
            : "Nothing is playing. Ask your DJ to play some music.";
          return;
        }

        if (errorMessageRef.current) {
          errorMessageRef.current = null;
        }
        socket.emit(SocketEvent.PARTY_PLAYBACK_REQ, { playbackState: res.data, partyId: partyId });
      })
      .catch((err) => {
        console.log("could not get currently playing");
      });
  };

  return (
    <div className="party-page">
      {isLoadingUser || isLoadingParty ? (
        <div>
          <div className="party--unauthed">
            <Wiggle />
            <div className="text--lg">Loading...</div>
            <Wiggle />
          </div>
        </div>
      ) : user && currentParty && !loginError ? (
        <AuthedParty user={user} currentParty={currentParty} error={errorMessageRef.current} />
      ) : (
        <UnauthedParty partyStub={partyStub} loginError={loginError} />
      )}
    </div>
  );
};

export default PartyPage;
