import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, TrendingUp, Calendar, Clock, Coffee, Droplets, Save, RefreshCcw, AlertCircle, Settings, LayoutDashboard, History, ArrowLeft, CheckCircle, Filter, X, Search, ChevronDown, Wallet, Eye, EyeOff, LayoutPanelLeft, Lock, User, LogOut } from 'lucide-react';
import { format, startOfWeek, startOfMonth } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const App = () => {
  const [view, setView] = useState('dashboard'); // 'dashboard', 'history', 'settings', 'login'
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  const [expenses, setExpenses] = useState([]);
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [showTodayLog, setShowTodayLog] = useState(true);
  const [stats, setStats] = useState({
    today: { tea: 0, water: 0, amount: 0, tea_amount: 0, water_amount: 0 },
    month: { tea: 0, water: 0, amount: 0, tea_amount: 0, water_amount: 0 }
  });
  const [masterSettings, setMasterSettings] = useState({ tea_price: 10, water_price: 35 });
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0 });
  const [editingExpense, setEditingExpense] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Login Form State
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    tea_cups: 0,
    water_cans: 0,
    tea_price: 10,
    water_price: 35,
    notes: ''
  });

  const [settingsForm, setSettingsForm] = useState({
    tea_price: 10,
    water_price: 35
  });

  const [filterUI, setFilterUI] = useState({
    timeRange: 'all',
    category: 'all',
    startDate: '',
    endDate: ''
  });

  const [appliedFilters, setAppliedFilters] = useState({});

  // Configure axios with token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setView('login');
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchInitialData();
    }
  }, [token]);

  useEffect(() => {
    if (token && view === 'dashboard') {
      fetchStats();
      fetchTodayExpenses();
    } else if (token && view === 'history') {
      fetchStats();
      fetchExpenses();
    }
  }, [view, pagination.page, appliedFilters, token]);

  const fetchInitialData = async () => {
    try {
      const settingsRes = await axios.get(`${API_BASE_URL}/settings`);
      if (settingsRes.data && settingsRes.data.tea_price !== undefined) {
        setMasterSettings(settingsRes.data);
        setSettingsForm(settingsRes.data);
        setFormData(prev => ({
          ...prev,
          tea_price: settingsRes.data.tea_price,
          water_price: settingsRes.data.water_price
        }));
      }
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleApiError = (err) => {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      handleLogout();
      setError('Session expired. Please login again.');
    } else {
      console.error('API Error:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const statsRes = await axios.get(`${API_BASE_URL}/stats`);
      setStats(statsRes.data);
    } catch (err) {
      handleApiError(err);
    }
  };

  const fetchTodayExpenses = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const res = await axios.get(`${API_BASE_URL}/expenses`, {
        params: { startDate: today, endDate: today, limit: 100 }
      });
      setTodayExpenses(res.data.data);
    } catch (err) {
      handleApiError(err);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const activeParams = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'date',
        order: 'DESC',
        ...appliedFilters
      };
      const expRes = await axios.get(`${API_BASE_URL}/expenses`, { params: activeParams });
      setExpenses(expRes.data.data);
      setPagination(prev => ({ ...prev, total: expRes.data.pagination.total }));
    } catch (err) {
      handleApiError(err);
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setToken(token);
      setUser(user);
      setView('dashboard');
      setSuccess('Welcome back, ' + user.username);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setView('login');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'tea_cups' || name === 'water_cans') ? (value === '' ? '' : parseInt(value)) : value
    }));
  };

  const handleFilterUIChange = (e) => {
    const { name, value } = e.target;
    setFilterUI(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    let finalFilters = {};
    const today = format(new Date(), 'yyyy-MM-dd');

    if (filterUI.timeRange === 'today') {
      finalFilters.startDate = today;
      finalFilters.endDate = today;
    } else if (filterUI.timeRange === 'week') {
      finalFilters.startDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      finalFilters.endDate = today;
    } else if (filterUI.timeRange === 'month') {
      finalFilters.startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      finalFilters.endDate = today;
    } else if (filterUI.timeRange === 'custom') {
      if (filterUI.startDate) finalFilters.startDate = filterUI.startDate;
      if (filterUI.endDate) finalFilters.endDate = filterUI.endDate;
    }

    if (filterUI.category === 'tea') finalFilters.minTea = 1;
    else if (filterUI.category === 'water') finalFilters.minWater = 1;

    setAppliedFilters(finalFilters);
    setPagination(p => ({ ...p, page: 1 }));
    setSuccess('Filters Applied');
    setTimeout(() => setSuccess(''), 2000);
  };

  const clearFilters = () => {
    setFilterUI({ timeRange: 'all', category: 'all', startDate: '', endDate: '' });
    setAppliedFilters({});
    setPagination(p => ({ ...p, page: 1 }));
  };

  const quickFilter = (category) => {
    const updatedUI = { ...filterUI, category: category };
    setFilterUI(updatedUI);

    let finalFilters = { ...appliedFilters };
    if (category === 'tea') {
      finalFilters.minTea = 1;
      delete finalFilters.minWater;
    } else if (category === 'water') {
      finalFilters.minWater = 1;
      delete finalFilters.minTea;
    } else {
      delete finalFilters.minTea;
      delete finalFilters.minWater;
    }

    setAppliedFilters(finalFilters);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettingsForm(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/settings`, settingsForm);
      setMasterSettings(settingsForm);
      setFormData(prev => ({ ...prev, tea_price: settingsForm.tea_price, water_price: settingsForm.water_price }));
      setSuccess('Prices Updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      handleApiError(err);
      setError('Update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await axios.put(`${API_BASE_URL}/expenses/${editingExpense.id}`, formData);
        setSuccess('Update Success!');
      } else {
        await axios.post(`${API_BASE_URL}/expenses`, formData);
        setSuccess('Saved!');
      }
      setEditingExpense(null);
      setFormData(prev => ({ ...prev, tea_cups: 0, water_cans: 0, notes: '' }));
      fetchStats();
      fetchTodayExpenses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      handleApiError(err);
      setError('Save failed.');
    }
  };

  const getDisplayTotal = () => {
    if (filterUI.category === 'tea') return stats.month.tea_amount.toFixed(0);
    if (filterUI.category === 'water') return stats.month.water_amount.toFixed(0);
    return stats.month.amount.toFixed(0);
  };

  const getDisplayLabel = () => {
    if (filterUI.category === 'tea') return "Monthly Tea Total";
    if (filterUI.category === 'water') return "Monthly Water Total";
    return "Total Monthly Billing";
  };

  // -----------------------------------------------------------------
  // LOGIN VIEW
  // -----------------------------------------------------------------
  if (!token || view === 'login') {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-800 via-blue-900 to-slate-950">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="bg-white rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10">
            <div className="bg-blue-50/50 p-12 text-center border-b border-blue-100">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="p-4 bg-blue-900 rounded-3xl shadow-xl rotate-3"><Lock className="w-10 h-10 text-white" /></div>
                <h1 className="text-4xl font-black tracking-tighter italic uppercase text-blue-900 leading-none">ANKIOm <br /> <span className="text-blue-400 text-2xl">EXPENSES</span></h1>
              </div>
              <p className="text-blue-900/40 text-[10px] font-black uppercase tracking-[0.3em]">Authorized Access Only</p>
            </div>

            <form onSubmit={handleLogin} className="p-12 space-y-8">
              {error && (
                <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-xs font-black uppercase tracking-wider leading-tight">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em] ml-2">Username</label>
                  <div className="relative group">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 group-focus-within:text-blue-900 transition-colors" />
                    <input
                      type="text"
                      placeholder="Enter Username"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      required
                      className="w-full pl-16 pr-8 py-5 bg-blue-50/30 border border-blue-100 rounded-3xl text-sm font-black text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em] ml-2">Secure Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 group-focus-within:text-blue-900 transition-colors" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      className="w-full pl-16 pr-8 py-5 bg-blue-50/30 border border-blue-100 rounded-3xl text-sm font-black text-blue-950 focus:bg-white focus:border-blue-900 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-white hover:bg-blue-50 text-blue-900 font-black text-sm uppercase tracking-[0.4em] rounded-3xl shadow-2xl border-2 border-blue-900 border-b-8 transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {loading ? <RefreshCcw className="animate-spin" /> : 'AUTHENTICATE'}
              </button>
            </form>
          </div>
          <p className="text-center mt-10 text-white/20 font-black text-[9px] uppercase tracking-[0.5em]">© 2026 ANKIOm INFRASTRUCTURE</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // MAIN APP VIEW (DASHBOARD / HISTORY / SETTINGS)
  // -----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-blue-900">
      {/* NAVBAR */}
      <nav className="bg-blue-900 text-white shadow-xl sticky top-0 z-50 border-b-2 border-blue-950">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg shadow-sm">
              <Wallet className="w-5 h-5 text-blue-900" />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase italic anonymous-pro">ANKIOm <span className="text-blue-400">EXPENSES</span></h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex bg-blue-950/50 p-1 rounded-xl border border-blue-800 gap-1">
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all ${view === 'dashboard' ? 'bg-white text-blue-900 shadow-sm' : 'bg-blue-800/30 text-blue-900 hover:bg-white hover:text-blue-900'}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </button>
              <button
                onClick={() => setView('history')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all ${view === 'history' ? 'bg-white text-blue-900 shadow-sm' : 'bg-blue-800/30 text-blue-900 hover:bg-white hover:text-blue-900'}`}
              >
                <History className="w-3.5 h-3.5" /> History
              </button>
              <button
                onClick={() => setView('settings')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all ${view === 'settings' ? 'bg-white text-blue-900 shadow-sm' : 'bg-blue-800/30 text-blue-900 hover:bg-white hover:text-blue-900'}`}
              >
                <Settings className="w-3.5 h-3.5" /> Settings
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all group"
              title="Logout"
            >
              <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      {view === 'dashboard' && (
        <main className="max-w-7xl w-full mx-auto p-4 lg:p-12 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

            {/* LEFT SIDE: ENTRY FORM */}
            <div className="lg:col-span-5 space-y-8 order-2 lg:order-1">
              {/* TOTAL TODAY CARD */}
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-blue-100 flex items-center justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Today</p>
                  <h2 className="text-5xl font-black text-blue-900 leading-none">₹{stats.today.amount.toFixed(2)}</h2>
                </div>
                <div className="relative z-10 p-4 bg-blue-600 rounded-2xl shadow-lg border border-blue-400/30"><Calendar className="w-8 h-8 text-white" /></div>
              </div>

              {/* DAILY ENTRY FORM */}
              <div className="bg-white rounded-[2rem] shadow-2xl border border-blue-100 overflow-hidden">
                <div className="px-8 py-5 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                  <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">
                    {editingExpense ? 'Modify Entry' : 'Daily Entry'}
                  </h3>
                  {editingExpense && <button onClick={() => setEditingExpense(null)} className="text-[10px] font-black text-red-500 uppercase hover:underline font-black">Cancel</button>}
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  {success && <div className="p-4 bg-green-50 text-green-700 text-[11px] font-black uppercase rounded-xl border border-green-100 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {success}</div>}
                  {error && <div className="p-4 bg-red-50 text-red-700 text-[11px] font-black uppercase rounded-xl border border-red-100 flex items-center gap-2 tracking-wider">{error}</div>}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest pl-1">Date</label>
                      <input type="date" name="date" required value={formData.date} onChange={handleInputChange} className="w-full p-4 bg-blue-50/30 border border-blue-100 rounded-xl text-sm font-black text-blue-950 focus:border-blue-600 transition-all outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest pl-1">Time</label>
                      <input type="time" name="time" required value={formData.time} onChange={handleInputChange} className="w-full p-4 bg-blue-50/30 border border-blue-100 rounded-xl text-sm font-black text-blue-950 focus:border-blue-600 transition-all outline-none" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-blue-50/30 rounded-2xl border border-blue-100 group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-900 rounded-xl shadow-md"><Coffee className="w-5 h-5 text-white" /></div>
                        <div>
                          <p className="text-[11px] font-black text-blue-950 uppercase leading-none">Tea</p>
                          <p className="text-[10px] text-blue-400 font-bold uppercase">₹{masterSettings.tea_price}</p>
                        </div>
                      </div>
                      <input type="number" name="tea_cups" required value={formData.tea_cups} onChange={handleInputChange} min="0" className="w-20 p-3 bg-white border border-blue-200 rounded-xl text-center font-black text-xl text-blue-950 outline-none focus:border-blue-600" />
                    </div>

                    <div className="flex items-center justify-between p-5 bg-blue-50/30 rounded-2xl border border-blue-100 group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-sky-500 rounded-xl shadow-md"><Droplets className="w-5 h-5 text-white" /></div>
                        <div>
                          <p className="text-[11px] font-black text-blue-950 uppercase leading-none">Water</p>
                          <p className="text-[10px] text-blue-400 font-bold uppercase">₹{masterSettings.water_price}</p>
                        </div>
                      </div>
                      <input type="number" name="water_cans" required value={formData.water_cans} onChange={handleInputChange} min="0" className="w-20 p-3 bg-white border border-blue-200 rounded-xl text-center font-black text-xl text-blue-950 outline-none focus:border-blue-600" />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-5 bg-white hover:bg-blue-50 text-blue-900 font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg border-2 border-blue-900 border-b-4 transition-all active:scale-95 flex items-center justify-center gap-3">
                    <Save className="w-5 h-5 text-blue-900" /> Save Record
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT SIDE: TODAY'S LOG (Full View) */}
            <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-900 rounded-xl shadow-lg">
                    <LayoutPanelLeft className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-blue-900 uppercase italic tracking-tighter">Live Consumption Feed</h3>
                </div>
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-blue-100 shadow-sm">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Toggle View</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={showTodayLog} onChange={(e) => setShowTodayLog(e.target.checked)} />
                    <div className="w-11 h-6 bg-blue-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-blue-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {showTodayLog ? (
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-blue-100 overflow-hidden flex flex-col min-h-[500px] animate-in slide-in-from-right-10 duration-500">
                  <div className="p-6 bg-blue-50/30 border-b border-blue-50 flex items-center justify-between">
                    <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest"> {format(new Date(), 'dd MMM yyyy')}</p>
                    <span className="bg-blue-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{todayExpenses.length} ENTRIES</span>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[600px] p-6 space-y-4">
                    {todayExpenses.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-20 opacity-20">
                        <History className="w-16 h-16 mb-4" />
                        <p className="font-black uppercase tracking-[0.3em] text-sm">Waiting for entries...</p>
                      </div>
                    ) : (
                      todayExpenses.map((ex) => (
                        <div key={ex.id} className="bg-slate-50 hover:bg-white hover:shadow-xl hover:border-blue-200 border border-slate-100 p-6 rounded-[1.5rem] transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-6">
                            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                              <Clock className="w-5 h-5 text-blue-600 font-black" />
                            </div>
                            <div>
                              <p className="text-xl font-black text-blue-950 font-mono tracking-tight">{ex.time}</p>
                              <div className="flex gap-4 mt-1.5">
                                {ex.tea_cups > 0 && (
                                  <div className="flex items-center gap-1.5 bg-blue-100/50 px-3 py-1 rounded-lg">
                                    <Coffee className="w-3 h-3 text-blue-900" />
                                    <span className="text-[10px] font-black text-blue-900 uppercase">{ex.tea_cups} Cups</span>
                                  </div>
                                )}
                                {ex.water_cans > 0 && (
                                  <div className="flex items-center gap-1.5 bg-sky-100/50 px-3 py-1 rounded-lg">
                                    <Droplets className="w-3 h-3 text-sky-500" />
                                    <span className="text-[10px] font-black text-sky-600 uppercase">{ex.water_cans} Cans</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-blue-900 italic tracking-tighter leading-none mb-1">₹{parseFloat(ex.total_amount).toFixed(0)}</p>
                            <button onClick={() => { setEditingExpense(ex); setFormData({ ...ex, date: format(new Date(ex.date), 'yyyy-MM-dd') }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="opacity-0 group-hover:opacity-100 text-[10px] font-black text-blue-400 uppercase tracking-widest transition-all hover:text-blue-900">Edit Log</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-[500px] bg-blue-50/20 rounded-[2.5rem] border-2 border-dashed border-blue-100 flex items-center justify-center animate-in fade-in duration-300">
                  <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest text-center max-w-xs leading-relaxed">Today's Feed is currently hidden.<br />Flip the switch above to monitor live consumption.</p>
                </div>
              )}

              <button
                onClick={() => setView('history')}
                className="w-full py-6 bg-white border-2 border-blue-900 rounded-2xl font-black text-[12px] uppercase tracking-[0.4em] text-blue-900 hover:bg-blue-50 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 group"
              >
                <History className="w-6 h-6 group-hover:rotate-12 transition-transform text-blue-900" /> Access Full Archives
              </button>
            </div>
          </div>
        </main>
      )}

      {view === 'history' && (
        <main className="max-w-6xl w-full mx-auto p-4 lg:p-12 animate-in fade-in slide-in-from-right-4 duration-500 h-[calc(100vh-64px)] flex flex-col">

          <div className="bg-blue-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden border-b-8 border-blue-950 mb-10">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
              <div className="text-center md:text-left cursor-pointer group" onClick={() => quickFilter('all')}>
                <p className="text-xs font-black text-blue-300 uppercase tracking-[0.4em] mb-3 group-hover:text-blue-200 transition-colors">
                  {getDisplayLabel()}
                </p>
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <h2 className="text-6xl md:text-7xl font-black italic tracking-tighter leading-none group-hover:scale-105 transition-transform">
                    ₹{getDisplayTotal()}
                  </h2>
                  <div className="bg-white/10 px-3 py-1 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-widest">{format(new Date(), 'MMMM')}</div>
                </div>
              </div>

              <div className="flex gap-4 md:gap-6">
                <div onClick={() => quickFilter('tea')} className={`p-6 md:p-8 rounded-[2.5rem] border text-center min-w-[120px] md:min-w-[140px] backdrop-blur-xl shadow-2xl transition-all cursor-pointer group active:scale-95 ${filterUI.category === 'tea' ? 'bg-white/20 border-white/40 scale-105' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <p className={`text-[10px] font-black uppercase mb-3 tracking-widest transition-colors ${filterUI.category === 'tea' ? 'text-white' : 'text-blue-300 group-hover:text-white'}`}>Tea Cups</p>
                  <div className="flex items-center justify-center gap-2">
                    <Coffee className={`w-5 h-5 ${filterUI.category === 'tea' ? 'text-white' : 'text-blue-400 group-hover:text-white'}`} />
                    <p className="text-3xl md:text-4xl font-black leading-none">{stats.month.tea}</p>
                  </div>
                </div>

                <div onClick={() => quickFilter('water')} className={`p-6 md:p-8 rounded-[2.5rem] border text-center min-w-[120px] md:min-w-[140px] backdrop-blur-xl shadow-2xl transition-all cursor-pointer group active:scale-95 ${filterUI.category === 'water' ? 'bg-white/20 border-white/40 scale-105' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <p className={`text-[10px] font-black uppercase mb-3 tracking-widest transition-colors ${filterUI.category === 'water' ? 'text-white' : 'text-blue-300 group-hover:text-white'}`}>Water Cans</p>
                  <div className="flex items-center justify-center gap-2">
                    <Droplets className={`w-5 h-5 ${filterUI.category === 'water' ? 'text-white' : 'text-sky-300 group-hover:text-white'}`} />
                    <p className="text-3xl md:text-4xl font-black leading-none">{stats.month.water}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button onClick={() => setView('dashboard')} className="p-3 bg-white border border-blue-100 rounded-xl text-blue-900 shadow-sm hover:bg-blue-50 transition-all"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-2xl font-black text-blue-900 uppercase italic tracking-tighter">Detailed History Log</h2>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowFilters(!showFilters)} className={`px-5 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${showFilters ? 'bg-blue-50 border-blue-900 text-blue-900 shadow-md' : 'bg-white border-blue-100 text-blue-900'}`}>
                  <Filter className="w-4 h-4 mr-2 inline text-blue-900" /> Filters
                </button>
                <button onClick={fetchExpenses} className="p-3 bg-white border border-blue-100 rounded-xl text-blue-900 hover:border-blue-300 shadow-sm">
                  <RefreshCcw className={`w-5 h-5 text-blue-900 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-blue-100 overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="flex flex-col flex-1 min-h-0">
                {showFilters && (
                  <div className="p-8 bg-blue-50/20 border-b border-blue-100 space-y-6 animate-in slide-in-from-top duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-900/50 uppercase tracking-widest pl-1">Timeline</label>
                        <div className="relative">
                          <select name="timeRange" value={filterUI.timeRange} onChange={handleFilterUIChange} className="w-full p-4 bg-white border border-blue-100 rounded-xl text-xs font-black text-blue-950 uppercase outline-none focus:border-blue-600 appearance-none shadow-sm cursor-pointer">
                            <option value="all">Full History</option>
                            <option value="today">Today Only</option>
                            <option value="week">Past 7 Days</option>
                            <option value="month">This Month</option>
                            <option value="custom">Custom Range</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-900/50 uppercase tracking-widest ml-1">Category</label>
                        <div className="relative">
                          <select name="category" value={filterUI.category} onChange={handleFilterUIChange} className="w-full p-4 bg-white border border-blue-100 rounded-xl text-xs font-black text-blue-950 uppercase outline-none focus:border-blue-600 appearance-none shadow-sm cursor-pointer">
                            <option value="all">Tea & Water</option>
                            <option value="tea">Only Tea</option>
                            <option value="water">Only Water</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {filterUI.timeRange === 'custom' && (
                      <div className="flex gap-4 p-6 bg-white rounded-2xl border border-blue-100 shadow-xl animate-in zoom-in-95">
                        <input type="date" name="startDate" value={filterUI.startDate} onChange={handleFilterUIChange} className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-blue-900 outline-none" />
                        <input type="date" name="endDate" value={filterUI.endDate} onChange={handleFilterUIChange} className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-blue-900 outline-none" />
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-blue-100/50">
                      <button onClick={clearFilters} className="text-xs font-black uppercase text-blue-300 hover:text-red-500 transition-all underline decoration-2 underline-offset-4">Reset Parameters</button>
                      <button onClick={applyFilters} className="px-12 py-4 bg-white hover:bg-blue-50 text-blue-900 font-black text-[12px] uppercase tracking-[0.2em] rounded-xl shadow-lg border-2 border-blue-900 border-b-4 transition-all active:scale-95 uppercase">Apply Changes</button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto bg-white sticky top-0 z-30">
                  <table className="w-full text-left table-fixed">
                    <thead>
                      <tr className="bg-blue-50/50 border-b border-blue-100">
                        <th className="w-[30%] pl-10 py-6 text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">Transaction Date</th>
                        <th className="w-[30%] px-6 py-6 text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">Inventory Log</th>
                        <th className="w-[25%] px-6 py-6 text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">Grand Total</th>
                        <th className="w-[15%] pr-10"></th>
                      </tr>
                    </thead>
                  </table>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
                  <table className="w-full text-left table-fixed">
                    <tbody className="divide-y divide-blue-50">
                      {expenses.length === 0 ? (
                        <tr><td colSpan="4" className="px-10 py-48 text-center text-blue-200 font-black uppercase text-sm tracking-[0.4em]">No financial records found</td></tr>
                      ) : expenses.map(ex => (
                        <tr key={ex.id} className="hover:bg-blue-50/40 transition-all group">
                          <td className="pl-10 py-8">
                            <p className="text-xl font-black text-blue-950 leading-none mb-1.5">{format(new Date(ex.date), 'MMMM dd, yyyy')}</p>
                            <span className="text-[11px] font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md uppercase tracking-widest">{ex.time}</span>
                          </td>
                          <td className="px-6 py-8">
                            <div className="flex gap-4">
                              {ex.tea_cups > 0 && <span className="bg-blue-900 text-white px-4 py-2.5 rounded-xl text-[11px] font-black shadow-md border-b-4 border-blue-950">☕ {ex.tea_cups} <span className="opacity-40 ml-1 font-black">CUPS</span></span>}
                              {ex.water_cans > 0 && <span className="bg-sky-500 text-white px-4 py-2.5 rounded-xl text-[11px] font-black shadow-md border-b-4 border-sky-600">💧 {ex.water_cans} <span className="opacity-40 ml-1 font-black">CANS</span></span>}
                            </div>
                          </td>
                          <td className="px-6 py-8 text-3xl font-black text-blue-900 italic tracking-tighter">₹{parseFloat(ex.total_amount).toFixed(0)}</td>
                          <td className="pr-10 py-8 text-right opacity-0 group-hover:opacity-100 transition-all">
                            <div className="flex justify-end gap-3">
                              <button onClick={() => { setEditingExpense(ex); setFormData({ ...ex, date: format(new Date(ex.date), 'yyyy-MM-dd') }); setView('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-3 bg-white border border-blue-100 text-blue-900 rounded-xl shadow-sm hover:bg-blue-50 transition-all"><Edit2 className="w-4 h-4 text-blue-900" /></button>
                              <button onClick={async () => { if (confirm('Delete record?')) { await axios.delete(`${API_BASE_URL}/expenses/${ex.id}`); fetchExpenses(); fetchStats(); } }} className="p-3 bg-white border border-blue-100 text-red-500 rounded-xl shadow-sm hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4 text-red-600" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-8 bg-slate-50 border-t border-blue-100 flex justify-between items-center text-[11px] font-black text-blue-300 tracking-widest">
                  <span className="uppercase">{pagination.total} TOTAL ENTRIES</span>
                  <div className="flex gap-3">
                    <button disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} className="px-8 py-3 bg-white border border-blue-100 rounded-xl text-blue-900 shadow-md hover:bg-blue-50 transition-all font-black disabled:opacity-20 uppercase tracking-widest">Previous</button>
                    <button disabled={pagination.page * pagination.limit >= pagination.total} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} className="px-8 py-3 bg-white border border-blue-100 rounded-xl text-blue-900 shadow-md hover:bg-blue-50 transition-all font-black disabled:opacity-20 uppercase tracking-widest">Next Page</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {view === 'settings' && (
        <main className="max-w-xl w-full mx-auto p-4 lg:p-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-blue-100 overflow-hidden text-center">
            <div className="bg-blue-900 p-12 text-white relative">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className="p-3 bg-white rounded-xl shadow-lg rotate-3 transition-transform hover:rotate-6"><Settings className="w-8 h-8 text-blue-900" /></div>
                <h2 className="text-4xl font-black tracking-tight italic uppercase">Master Control</h2>
              </div>
              <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest">Rate & Price Configuration</p>
            </div>

            <form onSubmit={saveSettings} className="p-12 space-y-10">
              {success && <div className="p-4 bg-green-50 text-green-700 text-[11px] font-black uppercase rounded-xl border border-green-100 shadow-sm">{success}</div>}

              <div className="space-y-8">
                <div className="flex items-center gap-6 p-10 bg-blue-50/40 rounded-[2rem] border border-blue-200 group transition-all hover:bg-blue-50">
                  <div className="bg-blue-900 p-6 rounded-2xl shadow-xl transition-transform group-hover:scale-110"><Coffee className="w-10 h-10 text-white" /></div>
                  <div className="flex-1 text-left">
                    <label className="text-[11px] font-black text-blue-900/40 uppercase mb-2 block tracking-widest">Tea Unit Rate</label>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-blue-900">₹</span>
                      <input type="number" name="tea_price" value={settingsForm.tea_price} onChange={handleSettingsChange} step="0.5" className="bg-transparent text-6xl font-black text-blue-950 outline-none w-full" style={{ color: '#172554' }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 p-10 bg-sky-50/40 rounded-[2rem] border border-blue-200 group transition-all hover:bg-sky-50">
                  <div className="bg-sky-500 p-6 rounded-2xl shadow-xl transition-transform group-hover:scale-110"><Droplets className="w-10 h-10 text-white" /></div>
                  <div className="flex-1 text-left">
                    <label className="text-[11px] font-black text-blue-900/40 uppercase mb-2 block tracking-widest">Water Unit Rate</label>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-blue-900">₹</span>
                      <input type="number" name="water_price" value={settingsForm.water_price} onChange={handleSettingsChange} step="1" className="bg-transparent text-6xl font-black text-sky-950 outline-none w-full" style={{ color: '#172554' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex flex-col gap-6">
                <button type="submit" className="w-full py-6 bg-white hover:bg-blue-50 text-blue-900 font-black text-sm uppercase tracking-[0.3em] rounded-2xl shadow-2xl border-2 border-blue-900 border-b-8 transition-all active:scale-95 leading-none">
                  COMMIT CHANGES
                </button>
                <button type="button" onClick={() => setView('dashboard')} className="text-blue-400 font-black text-xs uppercase tracking-[0.4em] hover:text-blue-900 flex items-center justify-center gap-3 transition-all hover:gap-5">
                  <ArrowLeft className="w-5 h-5" /> EXIT CONTROL
                </button>
              </div>
            </form>
          </div>
        </main>
      )}
    </div>
  );
};

export default App;
