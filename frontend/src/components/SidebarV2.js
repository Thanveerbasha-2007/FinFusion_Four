import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiTrendingUp, FiTarget, FiPieChart, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Overview', path: '/dashboard', icon: FiHome },
  { name: 'Predictions', path: '/predictions', icon: FiTrendingUp },
  { name: 'Recommendations', path: '/recommendations', icon: FiTarget },
  { name: 'Score Breakdown', path: '/score', icon: FiPieChart },
];

export default function SidebarV2() {
  const { logout, user } = useAuth();

  return (
    <div className="w-64 h-screen sticky top-0 bg-surface/40 backdrop-blur-3xl border-r border-border flex flex-col p-4">
      
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-6 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 shadow-glow flex items-center justify-center">
          <span className="font-display font-bold text-white text-lg">F</span>
        </div>
        <span className="font-display font-bold text-xl tracking-tight text-white">WalletWizz</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group ${
                isActive 
                  ? 'text-white bg-white/5' 
                  : 'text-textMuted hover:text-white hover:bg-white/[0.02]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  />
                )}
                <item.icon className={`text-lg transition-transform duration-300 ${isActive ? 'scale-110 text-indigo-400' : 'group-hover:scale-110 group-hover:text-indigo-300'}`} />
                <span className="font-medium text-sm">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="mt-auto pt-4 border-t border-border/50">
        <div className="p-3 flex items-center gap-3 rounded-xl bg-black/20 border border-white/5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-textMuted truncate">{user?.email || 'user@example.com'}</p>
          </div>
          <button onClick={logout} className="p-2 text-textMuted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
            <FiLogOut />
          </button>
        </div>
      </div>
    </div>
  );
}
