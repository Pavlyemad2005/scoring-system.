'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  // Login States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState('');
  
  // Leaderboard States
  const [players, setPlayers] = useState([]);
  const [loginError, setLoginError] = useState('');
  
  // Custom increments state for each team (Key: teamId, Value: number)
  const [customAmounts, setCustomAmounts] = useState({});

  // 1. Check localStorage on mount to persist login
  useEffect(() => {
    const savedLogin = localStorage.getItem('isLoggedIn');
    const savedUsername = localStorage.getItem('username');
    const savedRole = localStorage.getItem('userRole');

    if (savedLogin === 'true' && savedUsername && savedRole) {
      setIsLoggedIn(true);
      setUsername(savedUsername);
      setUserRole(savedRole);
    }
  }, []);

  // Fetch Leaderboard Data
  async function fetchLeaderboard() {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*');

    if (!error && data) setPlayers(data);
  }

  useEffect(() => {
    if (isLoggedIn) {
      fetchLeaderboard();
    }
  }, [isLoggedIn]);

  // Handle Login
  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      setLoginError('Invalid username or password!');
    } else {
      setUserRole(data.role);
      setIsLoggedIn(true);
      
      // Save data to localStorage to prevent logout on refresh
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', username);
      localStorage.setItem('userRole', data.role);
    }
  }

  // Update Points dynamically with custom amounts
  async function updatePoints(id, currentPoints, direction) {
    // Get the custom amount typed for this team, default to 1 if empty or invalid
    const amountInput = customAmounts[id];
    const step = amountInput !== undefined && amountInput !== '' ? Math.max(0, parseInt(amountInput) || 0) : 1;
    
    const change = direction === 'up' ? step : -step;
    const newPoints = Math.max(0, currentPoints + change);

    const { error } = await supabase
      .from('leaderboard')
      .update({ points: newPoints })
      .eq('id', id);

    if (!error) {
      fetchLeaderboard();
      // Clear the input field for that team after successful update
      setCustomAmounts(prev => ({ ...prev, [id]: '' }));
    }
  }

  // Handle local change for input text field per team
  function handleAmountInputChange(id, value) {
    setCustomAmounts(prev => ({ ...prev, [id]: value }));
  }

  // Update Points Directly by Typing in the points box itself
  async function handleDirectPointsChange(id, value) {
    const newPoints = Math.max(0, parseInt(value) || 0);
    const { error } = await supabase
      .from('leaderboard')
      .update({ points: newPoints })
      .eq('id', id);

    if (!error) fetchLeaderboard();
  }

  // Logout
  function handleLogout() {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setUserRole('');
    // Clear localStorage values
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
  }

  // أسماء فرق ألفا الحقيقية للفصل التام
  const alphaNames = ['anchors', 'heroes', 'pirates', 'seahorse', 'seals', 'whales'];

  const alphaTeams = players
    .filter(p => alphaNames.includes(p.name?.toLowerCase().trim()))
    .sort((a, b) => b.points - a.points);

  const betaTeams = players
    .filter(p => !alphaNames.includes(p.name?.toLowerCase().trim()))
    .sort((a, b) => b.points - a.points);

  // 1. LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 p-8 rounded-2xl w-full max-w-md shadow-lg">
          <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">Scoring System</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="Enter password"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-sm font-medium text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold transition-colors mt-2">
              Sign In
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 2. MAIN DASHBOARD
  return (
    <main className="min-h-screen bg-[#F8F9FA] text-gray-900 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">System Standings</h1>
            <p className="text-gray-500 mt-1">
              Logged in as: <span className="text-blue-600 font-bold">{username}</span> ({userRole === 'admin' ? 'Admin Mode' : 'View Mode'})
            </p>
          </div>
          <button onClick={handleLogout} className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm">
            Sign Out
          </button>
        </header>

        {/* ALPHA GROUP */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-extrabold text-white tracking-wide">Alpha Group</h2>
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-bold uppercase">6 Teams</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase text-gray-500 tracking-wider">
                  <th className="px-6 py-4 w-20 text-center">Rank</th>
                  <th className="px-6 py-4">Team Name</th>
                  <th className="px-6 py-4 text-center w-36">Points</th>
                  {userRole === 'admin' && <th className="px-6 py-4 text-center w-56">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alphaTeams.map((player, index) => (
                  <tr key={player.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-100 text-gray-600' : index === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-400'}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800 text-lg">{player.name}</td>
                    <td className="px-6 py-4 text-center">
                      {userRole === 'admin' ? (
                        <input 
                          type="number"
                          key={player.id + '-' + player.points}
                          defaultValue={player.points}
                          onBlur={(e) => handleDirectPointsChange(player.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleDirectPointsChange(player.id, e.target.value);
                              e.target.blur();
                            }
                          }}
                          className="w-20 text-center text-lg font-bold font-mono text-blue-600 bg-blue-50 border border-blue-200 rounded-xl py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="inline-block text-lg font-bold font-mono text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1 rounded-xl min-w-[70px]">
                          {player.points}
                        </span>
                      )}
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number"
                            placeholder="Val"
                            value={customAmounts[player.id] || ''}
                            onChange={(e) => handleAmountInputChange(player.id, e.target.value)}
                            className="w-16 text-center text-sm font-semibold border border-gray-300 rounded-xl py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                          <button onClick={() => updatePoints(player.id, player.points, 'up')} className="bg-blue-600 hover:bg-blue-700 text-white w-9 h-9 rounded-xl font-bold text-xl transition-all shadow-sm active:scale-95">+</button>
                          <button onClick={() => updatePoints(player.id, player.points, 'down')} className="bg-gray-100 hover:bg-gray-200 text-gray-600 w-9 h-9 rounded-xl font-bold text-xl transition-all active:scale-95">-</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BETA GROUP */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-extrabold text-white tracking-wide">Beta Group</h2>
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-bold uppercase">6 Teams</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase text-gray-500 tracking-wider">
                  <th className="px-6 py-4 w-20 text-center">Rank</th>
                  <th className="px-6 py-4">Team Name</th>
                  <th className="px-6 py-4 text-center w-36">Points</th>
                  {userRole === 'admin' && <th className="px-6 py-4 text-center w-56">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {betaTeams.map((player, index) => (
                  <tr key={player.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-100 text-gray-600' : index === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-400'}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800 text-lg">{player.name}</td>
                    <td className="px-6 py-4 text-center">
                      {userRole === 'admin' ? (
                        <input 
                          type="number"
                          key={player.id + '-' + player.points}
                          defaultValue={player.points}
                          onBlur={(e) => handleDirectPointsChange(player.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleDirectPointsChange(player.id, e.target.value);
                              e.target.blur();
                            }
                          }}
                          className="w-20 text-center text-lg font-bold font-mono text-red-600 bg-red-50 border border-red-200 rounded-xl py-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      ) : (
                        <span className="inline-block text-lg font-bold font-mono text-red-600 bg-red-50 border border-red-100 px-4 py-1 rounded-xl min-w-[70px]">
                          {player.points}
                        </span>
                      )}
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number"
                            placeholder="Val"
                            value={customAmounts[player.id] || ''}
                            onChange={(e) => handleAmountInputChange(player.id, e.target.value)}
                            className="w-16 text-center text-sm font-semibold border border-gray-300 rounded-xl py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                          />
                          <button onClick={() => updatePoints(player.id, player.points, 'up')} className="bg-red-600 hover:bg-red-700 text-white w-9 h-9 rounded-xl font-bold text-xl transition-all shadow-sm active:scale-95">+</button>
                          <button onClick={() => updatePoints(player.id, player.points, 'down')} className="bg-gray-100 hover:bg-gray-200 text-gray-600 w-9 h-9 rounded-xl font-bold text-xl transition-all active:scale-95">-</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}