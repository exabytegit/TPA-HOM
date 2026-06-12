import { randomUUID } from "node:crypto";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

interface AdminSession {
  createdAt: number;
}

const sessions = new Map<string, AdminSession>();

const pruneExpiredSessions = (now = Date.now()): void => {
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(token);
    }
  }
};

export const createAdminSession = (): string => {
  pruneExpiredSessions();

  const token = randomUUID();
  sessions.set(token, {
    createdAt: Date.now()
  });

  return token;
};

export const validateAdminSession = (token: string | undefined): boolean => {
  if (!token) {
    return false;
  }

  pruneExpiredSessions();
  const session = sessions.get(token);

  if (!session) {
    return false;
  }

  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return false;
  }

  return true;
};

export const clearAdminSessions = (): void => {
  sessions.clear();
};
