
export const getHashParams = <T>(hashInput: string): T => {
    const hash = hashInput.substring(1);
    var params: { [key: string]: any } = {};
    hash.split('&').map(hk => {
        let temp = hk.split('=');
        params[temp[0]] = temp[1]
    });
    return params as T;
}