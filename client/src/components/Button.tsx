import React, { useRef, useState, useCallback, useEffect } from 'react';

interface Props {
    onClick?: () => void;
    name: string;
}

const styles = {
    'font-size': '20px',
    'padding': '10px 20px'
}

const Button: React.FC<Props> = ({
    name,
    onClick,
}): React.ReactElement => {

    return (
        <button style={styles} onClick={onClick}>{name}</button>
    );
};

export default Button;
