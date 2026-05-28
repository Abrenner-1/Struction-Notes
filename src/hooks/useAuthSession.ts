import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth, getRedirectResult, logout, onAuthStateChanged } from '../lib/firebase';
import { DEFAULT_USER_NAME, GUEST_USER_ID } from '../lib/projectUtils';

export function useAuthSession() {
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);
  const [bypassedUser, setBypassedUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  const user = useMemo(() => bypassedUser || firebaseUser, [bypassedUser, firebaseUser]);
  const isGuest = user?.uid === GUEST_USER_ID;

  const handleGuestBypass = useCallback(() => {
    setBypassedUser({
      uid: GUEST_USER_ID,
      displayName: 'Guest User',
      email: 'guest@local.dev',
      photoURL: null,
    });
    setLoading(false);
  }, []);

  const handleLogout = useCallback(async () => {
    if (isGuest) {
      setBypassedUser(null);
      return;
    }

    await logout();
  }, [isGuest]);

  useEffect(() => {
    let unmounted = false;
    let redirectChecked = false;
    let authChecked = false;

    const checkComplete = () => {
      if (redirectChecked && authChecked && !unmounted) {
        setLoading(false);
      }
    };

    const handleRedirect = async () => {
      try {
        await getRedirectResult(auth);
      } catch (error: any) {
        if (!unmounted) {
          if (error.code === 'auth/unauthorized-domain') {
            setRedirectError("Unauthorized Domain: Please add 'structionnotes.com' to your Firebase Console -> Authentication -> Settings -> Authorized domains.");
          } else {
            setRedirectError(error.message);
          }
        }
      } finally {
        redirectChecked = true;
        checkComplete();
      }
    };

    handleRedirect();

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!unmounted) {
        setFirebaseUser(nextUser);
        authChecked = true;
        checkComplete();
      }
    });

    return () => {
      unmounted = true;
      unsubscribe();
    };
  }, []);

  return {
    user,
    isGuest,
    loading,
    redirectError,
    displayName: user?.displayName || DEFAULT_USER_NAME,
    handleGuestBypass,
    handleLogout,
  };
}
