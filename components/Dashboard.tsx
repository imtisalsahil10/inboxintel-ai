import React from 'react';
import { Email, Priority } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { ShieldAlert, TrendingUp, Mail, CheckCircle } from 'lucide-react';

interface DashboardProps {
  emails: Email[];
}

const Dashboard: React.FC<DashboardProps> = ({ emails }) => {
  const analyzedCount = emails.filter(e => e.analysis).length;
  if (analyzedCount === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <TrendingUp size={48} className="mb-4 opacity-50" />
              <p>Process your inbox with AI to see analytics.</p>
          </div>
      )
  }

  // Calculate Stats
  const highPriority = emails.filter(e => e.analysis?.priority === Priority.HIGH).length;
  const avgUrgency = emails.reduce((acc, curr) => acc + (curr.analysis?.urgencyScore || 0), 0) / (analyzedCount || 1);
  
  const pieData = [
    { name: 'High', value: highPriority },
    { name: 'Medium', value: emails.filter(e => e.analysis?.priority === Priority.MEDIUM).length },
    { name: 'Low', value: emails.filter(e => e.analysis?.priority === Priority.LOW).length },
  ];

  const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

  // Data for Category Chart
  const categoryCounts = emails.reduce((acc, curr) => {
      const cat = curr.analysis?.category || 'Unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  const barData = Object.keys(categoryCounts).map(key => ({
      name: key.replace('_', ' '),
      value: categoryCounts[key]
  }));

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Inbox Intelligence Overview</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Analyzed</p>
                    <p className="text-2xl font-bold text-gray-900">{analyzedCount}</p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Mail size={20} />
                </div>
            </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Action Required</p>
                    <p className="text-2xl font-bold text-gray-900">{highPriority}</p>
                </div>
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <ShieldAlert size={20} />
                </div>
            </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Avg Urgency</p>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(avgUrgency)}<span className="text-sm text-gray-400 font-normal">/100</span></p>
                </div>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <TrendingUp size={20} />
                </div>
            </div>
        </div>

         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">System Status</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">Operational</p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckCircle size={20} />
                </div>
            </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Priority Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Priority Distribution</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-[-20px] text-xs text-gray-500">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>High</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Medium</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Low</div>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Email Categories</h3>
             <ResponsiveContainer width="100%" height="90%">
                <BarChart data={barData} layout="vertical" margin={{ left: 40 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
