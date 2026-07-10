"use node";

import { decryptToken, encryptToken } from "../crypto";

export const encryptRedrokPassword = encryptToken;
export const decryptRedrokPassword = decryptToken;
