
export const getHashParams = <T>(hashInput: string): T => {
    const hash = hashInput.substring(1);
    var params: { [key: string]: any } = {};
    hash.split('&').map(hk => {
        let temp = hk.split('=');
        params[temp[0]] = temp[1]
    });
    return params as T;
}

export const generateRandomString = (length: number): string => {

    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}