import React from 'react';

interface Props {
    isOpen: boolean;
    message: string;
}

const Toast: React.FC<Props> = ({ isOpen, message }): React.ReactElement => {
    console.log(isOpen);
    return (
        <div className="toast">
            {message}
        </div>)
}

export default Toast;