import { AsyncLocalStorage } from "node:async_hooks";

type RequestSession = { user: { id: string; name: string; email: string } };

const storage = new AsyncLocalStorage<RequestSession>();

export function runWithRequestSession<T>(session: RequestSession, callback: () => Promise<T>): Promise<T> {
  return storage.run(session, callback);
}

export function getRequestSession(): RequestSession | null {
  return storage.getStore() ?? null;
}

export function setRequestSession(session: RequestSession): void {
  storage.enterWith(session);
}
