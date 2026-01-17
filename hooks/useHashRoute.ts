import { useState, useEffect } from 'react';

/**
 * Simple hash-based routing hook.
 * Parses window.location.hash and updates on hashchange events.
 *
 * Returns the path portion after the hash, e.g.:
 * - URL: "http://localhost/#/student" -> returns "/student"
 * - URL: "http://localhost/#/" -> returns "/"
 * - URL: "http://localhost/" -> returns "/"
 */
function useHashRoute(): string {
  const getHashRoute = () => {
    const hash = window.location.hash;
    // Remove the leading # and return the path
    // If no hash or just "#", return "/"
    return hash.slice(1) || '/';
  };

  const [route, setRoute] = useState<string>(getHashRoute);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getHashRoute());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
}

export default useHashRoute;
