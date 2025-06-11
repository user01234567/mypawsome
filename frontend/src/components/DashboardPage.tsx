import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchTierlists, TierlistSummary, getCurrentUser } from '../api'; // make sure getCurrentUser is imported!
import NewTierlistModal, { TierDef } from './NewTierlistModal';
import { createTierlist } from '../api';
import { TopbarContext } from '../App';

const DashboardPage: React.FC = () => {
  const [tierlists, setTierlists] = useState<TierlistSummary[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  const { setTopbarContent } = useContext(TopbarContext);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadUser() {
      const u = await getCurrentUser();
      if (!u) {
        // Redirect to backend login if not authenticated
        window.location.href = 'http://192.168.178.249:13371/auth/login';
      } else {
        setUser(u);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      setTopbarContent(
        <span>
          ✨ Welcome, <b>{user.username}</b>! ✨
        </span>
      );
    }
    // Clean up topbar on unmount
    return () => setTopbarContent("Welcome, Senpai~! 🌱");
  }, [setTopbarContent, user]);

  useEffect(() => {
    async function load() {
      const data = await fetchTierlists();
      setTierlists(data);
    }
    load();
  }, []);

  const handleCreateTierlist = async (name: string, tiers: TierDef[]) => {
    try {
      await createTierlist(name, tiers);
      setShowNewModal(false);
      const data = await fetchTierlists();
      setTierlists(data);
    } catch (err: any) {
      alert('Failed to create tierlist: ' + (err?.message || err));
    }
  };

  if (!user) {
    return <div className="p-4">Loading uwu...</div>;
  }

  return (
    <div className="page-root">
      <div className="dashboard-container">
        <button
          className="new-tierlist-btn"
          onClick={() => setShowNewModal(true)}
        >
          + New Tierlist
        </button>
        {showNewModal && (
          <NewTierlistModal
            onClose={() => setShowNewModal(false)}
            onCreate={handleCreateTierlist}
          />
        )}

        {tierlists.length === 0 ? (
          <div className="dashboard-empty">
            <span role="img" aria-label="empty">🦝</span>
            No tierlists yet, senpai~! Make your first one and become the President of the Neon Squirrel Council.
          </div>
        ) : (
          <div className="dashboard-card-list">
            {tierlists.map((tl) => (
              <Link to={`/tierlists/${tl.id}`} key={tl.id} className="dashboard-card hover:scale-105 transition-transform">
                <div className="dashboard-card-title">{tl.name}</div>
                <div className="dashboard-card-id">ID: {tl.id}</div>
                <div className="dashboard-card-footer flex gap-1 items-center text-xs text-gray-400 mt-auto">
                  <span role="img" aria-label="paw">🐾</span>
                  Tierlist ready for animal ranking!
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
