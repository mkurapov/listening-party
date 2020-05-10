import React from 'react';

interface Props {
    onClick: () => void;
    name: string;
    classes?: string;
}


const Button: React.FC<Props> = ({
    name,
    onClick,
    classes,
}): React.ReactElement => {
    return (
        <button className={'btn ' + classes} onClick={onClick}>{name}</button>
    );
};

export default Button;
