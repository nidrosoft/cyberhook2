type RedrokSecretFields = {
    redrokPassword?: unknown;
    redrokPasswordEncrypted?: unknown;
    redrokToken?: unknown;
    redrokTokenExpiresAt?: unknown;
};

export function toClientSafeCompany<T extends RedrokSecretFields>(company: T) {
    const {
        redrokPassword: _redrokPassword,
        redrokPasswordEncrypted: _redrokPasswordEncrypted,
        redrokToken: _redrokToken,
        redrokTokenExpiresAt: _redrokTokenExpiresAt,
        ...safeCompany
    } = company;

    return safeCompany;
}
