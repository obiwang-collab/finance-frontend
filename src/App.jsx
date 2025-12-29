import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';
const REFRESH_INTERVAL = 60000; // 60 秒

function App() {
  const [data, setData] = useState({
    bondSpread: [],
    fx: [],
    commodities: { gold: [], oil: [] }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [period, setPeriod] = useState('5d');

  // 數據抓取函數
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/all?period=${period}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
      } else {
        throw new Error('API 返回失敗狀態');
      }
    } catch (err) {
      console.error('數據抓取錯誤:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 初始加載和自動刷新
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [period]);

  // 合併利差與匯率數據（用於雙 Y 軸圖表）
  const getCombinedSpreadFxData = () => {
    if (!data.bondSpread.length || !data.fx.length) return [];

    const spreadMap = new Map(
      data.bondSpread.map(item => [item.date.split(' ')[0], item])
    );

    return data.fx.map(fxItem => {
      const dateKey = fxItem.date.split(' ')[0];
      const spreadItem = spreadMap.get(dateKey);

      return {
        date: dateKey,
        spread: spreadItem?.spread || 0,
        rate: fxItem.rate,
        us10y: spreadItem?.us10y || 0,
        jp10y: spreadItem?.jp10y || 0
      };
    });
  };

  // 統計卡片組件
  const StatCard = ({ title, value, change, icon: Icon, color }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '↗' : '↘'} {Math.abs(change).toFixed(2)}
            </p>
          )}
        </div>
        <Icon className={`w-12 h-12 ${color} opacity-20`} />
      </div>
    </div>
  );

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toFixed(4)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const combinedData = getCombinedSpreadFxData();
  const latestSpread = data.bondSpread[data.bondSpread.length - 1];
  const latestFx = data.fx[data.fx.length - 1];
  const latestGold = data.commodities.gold[data.commodities.gold.length - 1];
  const latestOil = data.commodities.oil[data.commodities.oil.length - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                金融市場監控儀表板
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 週期選擇器 */}
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="1d">1 天</option>
                <option value="5d">5 天</option>
                <option value="1mo">1 個月</option>
                <option value="3mo">3 個月</option>
                <option value="6mo">6 個月</option>
              </select>

              {/* 刷新按鈕 */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? '加載中...' : '刷新'}</span>
              </button>
            </div>
          </div>

          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-2">
              最後更新: {lastUpdate.toLocaleString('zh-TW')}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 錯誤提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">錯誤: {error}</p>
          </div>
        )}

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="美日利差"
            value={latestSpread ? `${latestSpread.spread.toFixed(2)}%` : '--'}
            change={latestSpread?.spread}
            icon={TrendingUp}
            color="text-blue-600"
          />
          <StatCard
            title="USD/JPY"
            value={latestFx ? latestFx.rate.toFixed(2) : '--'}
            change={latestFx?.rate - (data.fx[0]?.rate || 0)}
            icon={DollarSign}
            color="text-green-600"
          />
          <StatCard
            title="黃金 (USD/oz)"
            value={latestGold ? `$${latestGold.price.toFixed(2)}` : '--'}
            change={latestGold?.change}
            icon={Activity}
            color="text-yellow-600"
          />
          <StatCard
            title="原油 (USD/barrel)"
            value={latestOil ? `$${latestOil.price.toFixed(2)}` : '--'}
            change={latestOil?.change}
            icon={Activity}
            color="text-orange-600"
          />
        </div>

        {/* 圖表區域 */}
        <div className="space-y-8">
          {/* 雙 Y 軸圖表：美日利差 vs USD/JPY */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              美日利差 vs USD/JPY 匯率
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  yAxisId="left"
                  label={{ value: '利差 (%)', angle: -90, position: 'insideLeft' }}
                  domain={['auto', 'auto']}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'USD/JPY', angle: 90, position: 'insideRight' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="spread"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="美日利差"
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="USD/JPY"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 大宗商品圖表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 黃金 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                黃金價格走勢
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.commodities.gold}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#eab308"
                    strokeWidth={2}
                    name="黃金價格"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 原油 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                原油價格走勢
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.commodities.oil}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="原油價格"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12 py-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>© 2024 金融市場監控系統 | 數據每 60 秒自動刷新</p>
          <p className="mt-1">Data source: Yahoo Finance API</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
