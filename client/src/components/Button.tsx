import React, { useRef, useState, useCallback, useEffect } from 'react';

interface Props {
    onClick?: () => void;
    name: string;
}

const Button: React.FC<Props> = ({
    name,
    onClick,
}): React.ReactElement => {

    return (
        <button onClick={onClick}>{name}</button>
    );
};

export default Button;
