import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { FiArrowUpRight, FiArrowDownRight, FiActivity, FiCreditCard } from 'react-icons/fi';

const MOCK_DATA = [
  { name: 'Jan', income: 4000, spend: 2400 },
  { name: 'Feb', income: 3000, spend: 1398 },
  { name: 'Mar', income: 2000, spend: 9800 },
  { name: 'Apr', income: 2780, spend: 3908 },
  { name: 'May', income: 1890, spend: 4800 },
  { name: 'Jun', income: 2390, spend: 3800 },
  { name: 'Jul', income: 3490, spend: 4300 },
];

export default function DashboardV2() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show"
      className="space-y-8"
    >
      {/* Header section */}
      <motion.div variants={itemVariants} className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-white mb-2">
            Overview
          </h1>
          <p className="text-textMuted text-sm">Your financial health at a glance.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg bg-surface border border-border text-sm font-medium hover:bg-surfaceHover hover:border-borderHover transition-all">
            Export Report
          </button>
          <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
            Upload Statement
          </button>
        </div>
      </motion.div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'FinPersona Score', value: '784', sub: '+12 pts this month', icon: FiActivity, color: 'text-indigo-400', trend: 'up' },
          { title: 'Monthly Spending', value: '₹42,500', sub: '15% below average', icon: FiCreditCard, color: 'text-emerald-400', trend: 'down' },
          { title: 'Projected Savings', value: '₹12,400', sub: 'Based on current run rate', icon: FiArrowUpRight, color: 'text-cyan-400', trend: 'up' },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="glass-panel p-6 relative overflow-hidden group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                <stat.icon className="text-xl" />
              </div>
              {stat.trend === 'up' ? 
                <span className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full"><FiArrowUpRight className="mr-1"/> Good</span> : 
                <span className="flex items-center text-xs font-medium text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-full"><FiArrowDownRight className="mr-1"/> Optimal</span>
              }
            </div>
            <h3 className="text-textMuted text-sm font-medium mb-1">{stat.title}</h3>
            <div className="text-3xl font-display font-bold text-white mb-2">{stat.value}</div>
            <p className="text-xs text-textMuted">{stat.sub}</p>
            
            {/* Subtle hover glow effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </motion.div>
        ))}
      </div>

      {/* Main Chart Area */}
      <motion.div variants={itemVariants} className="glass-panel p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Cashflow Analysis</h2>
            <p className="text-xs text-textMuted mt-1">Income vs Spending over 6 months</p>
          </div>
          <select className="bg-surface border border-border text-xs rounded-lg px-3 py-1.5 text-textMuted outline-none">
            <option>Last 6 Months</option>
            <option>This Year</option>
          </select>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#A1A1AA', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#A1A1AA', fontSize: 12}} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#EDEDED', fontSize: '13px' }}
              />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="spend" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
