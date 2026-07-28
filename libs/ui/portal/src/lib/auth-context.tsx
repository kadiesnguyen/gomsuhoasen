// Refs read: v2/apps/v2-portal/src/contexts/AppContext.tsx
// Kept: auth state, dispatch pattern, localStorage persistence
// Dropped: tenant selection, workspace, permissions

import { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { readStorageText, removeStorageItem, writeStorageText } from '@vt/common-utils';
import type { UserRole } from '@gomhoasen/contracts';
import { api } from './services/api';

interface User { id: string; fullName: string; email: string; role: UserRole; }
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
}

type Action =
  | { type: 'LOGIN'; payload: { user: User; accessToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User };

const getInitialToken = () => {
  try {
    return readStorageText(localStorage, 'ghs_token', '') || null;
  } catch (e) {
    return null;
  }
};

const persistToken = (token: string) => {
  try {
    writeStorageText(localStorage, 'ghs_token', token);
  } catch (e) {
    // Some embedded browsers block storage; keep auth in memory for the current session.
  }
};

const clearPersistedToken = () => {
  try {
    removeStorageItem(localStorage, 'ghs_token');
  } catch (e) {
    // Ignore storage access failures so logout can still clear in-memory auth state.
  }
};

const initial: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrating: true,
};

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'LOGIN':
      persistToken(action.payload.accessToken);
      return {
        user: action.payload.user,
        token: action.payload.accessToken,
        isAuthenticated: true,
        isHydrating: false,
      };
    case 'LOGOUT':
      clearPersistedToken();
      return { user: null, token: null, isAuthenticated: false, isHydrating: false };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true, isHydrating: false };
    default:
      return state;
  }
}

const AuthContext = createContext<{ state: AuthState; dispatch: React.Dispatch<Action> }>(
  { state: initial, dispatch: () => void 0 }
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial, (initState) => {
    const token = getInitialToken();
    return {
      ...initState,
      token,
      isAuthenticated: !!token,
      isHydrating: !!token,
    };
  });
  const hydratedTokenRef = useRef<string | null>(null);

  // Hydrate user from /me on mount
  useEffect(() => {
    if (!state.token) {
      hydratedTokenRef.current = null;
      return;
    }
    if (state.user || !state.isHydrating || hydratedTokenRef.current === state.token) return;

    hydratedTokenRef.current = state.token;
    api.auth.me().then((u: User | null) => {
      if (u) dispatch({ type: 'SET_USER', payload: u });
      else dispatch({ type: 'LOGOUT' });
    }).catch(() => dispatch({ type: 'LOGOUT' }));
  }, [state.token, state.user, state.isHydrating]);

  return <AuthContext.Provider value={{ state, dispatch }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
