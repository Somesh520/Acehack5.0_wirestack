import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProfilePage from './ProfilePage';

/**
 * PublicProfilePage — Wrapper for viewing profiles without authentication
 * Route: /profile/:username
 */
export default function PublicProfilePage() {
  const { username } = useParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Pre-validate username exists before rendering ProfilePage
    if (username) {
      fetch(`/api/v1/public/profile/${username}`)
        .then(res => {
          if (res.status === 404) {
            setNotFound(true);
          }
          setLoading(false);
        })
        .catch(() => {
          setNotFound(true);
          setLoading(false);
        });
    }
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBFF] p-4">
        <div className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono">
          <div className="animate-pulse font-black uppercase text-sm">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBFF] p-4">
        <div className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono max-w-md">
          <h1 className="text-2xl font-black uppercase mb-3">Profile Not Found</h1>
          <p className="text-sm text-black/70 mb-4">
            The profile <code className="bg-[#f0f0f0] px-2 py-1 border border-black">{username}</code> doesn't exist or has been removed.
          </p>
          <Link
            to="/"
            className="inline-block border-3 border-black bg-[#CCFF00] px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FBFF] via-[#F6FFF9] to-[#FFFDF4] p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <ProfilePage isPublic={true} username={username} />
      </div>
    </div>
  );
}
