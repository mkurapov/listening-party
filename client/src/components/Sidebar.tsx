import React, { useEffect, useState } from 'react';
import { Party, User, SocketEvent } from 'common'
import { useHistory } from 'react-router';
import Button from './Button';
import socket from '../socket';
import UserAvatar from './UserAvatar';
import './Sidebar.css';

const AdminUser: React.FC<{ adminUser: User | undefined }> = ({ adminUser }): React.ReactElement => {
    if (!adminUser) {
        return <div></div>;
    }

    return (
        <div className="user user--admin">
            <UserAvatar user={adminUser} />
            <span className="user__info">
                <span className="user__info__name">{adminUser.display_name}</span>
                <span className="user__info__dj">Your DJ</span>
            </span>
        </div>
    );
}


const UserList: React.FC<{ users: User[], partyId: string, isAdmin: boolean }> = ({ users, partyId, isAdmin }): React.ReactElement => {
    const onMakeAdmin = (user: User): void => {
        socket.emit(SocketEvent.PARTY_CHANGED_ADMIN_REQ, { partyId: partyId, newAdminUser: user });
    }

    return (
        <div>{users.map((user, i) =>
            <div key={i} className="user">
                <UserAvatar user={user} />
                <span className="user__info">
                    <span className="user__info__name">{user.display_name}</span>
                    {isAdmin && <span onClick={() => onMakeAdmin(user)} className="user__info__make_dj">Make DJ</span>}
                </span>
            </div>
        )}</div>);
}

const MobileUserList: React.FC<{ users: User[], partyId: string, isAdmin: boolean }> = ({ users, partyId, isAdmin }): React.ReactElement => {
    return (
        <div className="users--mobile">{users.map((user, i) =>
            <div key={i} className="user">
                <UserAvatar user={user} />
            </div>
        )}</div>);
}


const Sidebar: React.FC<{ party: Party, user: User }> = ({ party, user }): React.ReactElement => {
    const [copyLinkBtnText, setCopyLinkBtnText] = useState('Copy invite link');

    const history = useHistory();

    const onLeaveClick = (): void => {
        history.push('/');
    }

    const onCopyLink = (): void => {
        const dummy = document.createElement('input'),
            text = window.location.href;

        document.body.appendChild(dummy);
        dummy.value = text;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
        setCopyLinkBtnText('Copied! 🎉');
        setTimeout(() => {
            setCopyLinkBtnText('Copy invite link');
        }, 3000);
    }

    return (
        <div className="sidebar">
            <div className="sidebar__block hidden-xs">
                <Button classes="btn--fill btn--secondary" name="Leave Party" onClick={onLeaveClick}></Button>
            </div>
            <div className="sidebar__block hidden-xs">
                <div className="text-left h2 mb-1 font-weight-normal">Users in party</div>
                <AdminUser adminUser={party.adminUser} />
            </div>
            <div className="users sidebar__block hidden-xs" id="users">
                {party.users ? <UserList partyId={party.id} users={party.users.filter(u => u.id !== party.adminUser?.id)} isAdmin={party.adminUser?.id === user.id} /> : null}
            </div>
            <div className="sidebar__block hidden-xs">
                <Button classes="btn--fill btn--primary" name={copyLinkBtnText} onClick={onCopyLink}></Button>
            </div>
            <div className="sidebar__mobile">
                <AdminUser adminUser={party.adminUser} />
                {party.users ? <MobileUserList partyId={party.id} users={party.users.filter(u => u.id !== party.adminUser?.id)} isAdmin={party.adminUser?.id === user.id} /> : null}
            </div>
        </div >
    )
}

export default Sidebar;