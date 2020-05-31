import React from 'react';
import {  User } from 'common'
import './UserAvatar.css';

const UserAvatar: React.FC<{ user: Pick<User, 'display_name' | 'images'> }> = ({ user }): React.ReactElement => {
    return <span className="avatar">
        {user.images.length > 0 ?
            <img className="avatar__img" alt="user avatar" src={user.images[0].url}></img>
            :
            <span className="avatar__placeholder">
                <span className="avatar__placeholder__letter">{user.display_name.substr(0, 1)}</span>

            </span>
        }
    </span>
};
export default UserAvatar;