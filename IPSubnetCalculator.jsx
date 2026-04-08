```react
import React, { useState, useEffect } from 'react';
import { Info, ShieldAlert, Cpu } from 'lucide-react';

// IP 和子网掩码计算辅助函数
const ipToInt = (ip) => {
  return ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct || 0, 10), 0) >>> 0;
};

const intToIp = (int) => {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255
  ].join('.');
};

const getMaskInt = (cidr) => {
  return cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
};

const toBinaryString = (int) => {
  return int.toString(2).padStart(32, '0');
};

export default function App() {
  const [octets, setOctets] = useState(['192', '168', '1', '100']);
  const [cidr, setCidr] = useState(24);
  const [results, setResults] = useState(null);

  // 当 IP 或 CIDR 改变时重新计算
  useEffect(() => {
    const ipStr = octets.map(o => o === '' ? '0' : o).join('.');
    const ipInt = ipToInt(ipStr);
    const maskInt = getMaskInt(cidr);
    
    // 二进制与运算计算网络地址
    const networkInt = (ipInt & maskInt) >>> 0;
    // 计算广播地址
    const broadcastInt = (networkInt | (~maskInt)) >>> 0;
    
    // 计算主机范围
    const firstHostInt = networkInt + 1;
    const lastHostInt = broadcastInt - 1;
    
    // 特殊情况处理 (如 /31 和 /32)
    let usableCount = 0;
    let usableRange = '无可用主机';
    if (cidr <= 30) {
      usableCount = broadcastInt - networkInt - 1;
      usableRange = `${intToIp(firstHostInt)} - ${intToIp(lastHostInt)}`;
    } else if (cidr === 31) {
      // 现代网络中 /31 常用于点对点链路
      usableCount = 2;
      usableRange = `${intToIp(networkInt)} - ${intToIp(broadcastInt)} (点对点链路)`;
    } else if (cidr === 32) {
      usableCount = 1;
      usableRange = `${intToIp(networkInt)} (单机路由)`;
    }

    setResults({
      ipStr,
      ipInt,
      maskStr: intToIp(maskInt),
      maskInt,
      networkStr: intToIp(networkInt),
      networkInt,
      broadcastStr: intToIp(broadcastInt),
      broadcastInt,
      usableCount,
      usableRange
    });
  }, [octets, cidr]);

  const handleOctetChange = (index, value) => {
    const newOctets = [...octets];
    // 只允许数字，且范围在 0-255 之间
    if (value === '') {
      newOctets[index] = '';
    } else {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 0 && num <= 255) {
        newOctets[index] = num.toString();
      }
    }
    setOctets(newOctets);
  };

  // 渲染 32 位二进制，并进行着色划分
  const renderBinaryArray = (intVal, highlightNetwork = false) => {
    const binStr = toBinaryString(intVal);
    const bits = binStr.split('');
    
    return (
      <div className="flex flex-wrap gap-[2px] font-mono text-sm sm:text-base">
        {bits.map((bit, idx) => {
          const isNetworkBit = idx < cidr;
          const addDot = idx === 7 || idx === 15 || idx === 23;
          
          let bgColor = 'bg-slate-700 text-slate-300'; // 默认暗色
          if (highlightNetwork) {
            bgColor = isNetworkBit 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' // 网络位颜色
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'; // 主机位颜色
          }

          return (
            <React.Fragment key={idx}>
              <span className={`flex items-center justify-center w-5 h-6 sm:w-6 sm:h-7 rounded-sm ${bgColor}`}>
                {bit}
              </span>
              {addDot && <span className="text-slate-500 font-bold mx-1 flex items-end pb-1">.</span>}
              {/* 网络边界指示线 */}
              {idx === cidr - 1 && cidr !== 32 && cidr !== 0 && (
                <div className="w-[2px] h-8 bg-orange-500 mx-[2px] shadow-[0_0_8px_rgba(249,115,22,0.8)] z-10 hidden sm:block"></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  if (!results) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <Cpu className="text-blue-400 w-8 h-8" />
            IP 网段划分与二进制推演
          </h1>
          <p className="text-slate-400">交互式学习 IP 地址的“网络位”与“主机位”是如何通过子网掩码计算得出的</p>
        </div>

        {/* 控制面板 */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* IP 输入 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-400 uppercase tracking-wider">
                IP 地址 (IPv4)
              </label>
              <div className="flex items-center gap-2">
                {octets.map((octet, idx) => (
                  <React.Fragment key={idx}>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={octet}
                      onChange={(e) => handleOctetChange(idx, e.target.value)}
                      className="w-16 sm:w-20 bg-slate-900 border border-slate-600 rounded-lg text-center py-2 text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    {idx < 3 && <span className="text-slate-500 font-bold text-xl">.</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* 子网掩码滑块 */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="block text-sm font-medium text-slate-400 uppercase tracking-wider">
                  子网掩码 (CIDR)
                </label>
                <div className="text-2xl font-bold text-blue-400 font-mono">
                  /{cidr}
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="32"
                value={cidr}
                onChange={(e) => setCidr(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="text-right text-sm font-mono text-slate-400">
                {results.maskStr}
              </div>
            </div>
          </div>
        </div>

        {/* 二进制计算核心推演区 */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 relative overflow-hidden">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <ShieldAlert className="text-orange-400 w-5 h-5" />
            底层二进制计算 (AND 运算)
          </h2>
          
          {/* 图例 */}
          <div className="flex items-center gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/50 inline-block"></span>
              <span className="text-blue-300">网络部分 (Network)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/50 inline-block"></span>
              <span className="text-emerald-300">主机部分 (Host)</span>
            </div>
          </div>

          <div className="space-y-6 overflow-x-auto pb-4">
            {/* IP Row */}
            <div>
              <div className="text-slate-400 text-sm mb-1 font-mono w-24 inline-block">IP 地址</div>
              {renderBinaryArray(results.ipInt, true)}
            </div>
            
            {/* Mask Row */}
            <div>
              <div className="text-slate-400 text-sm mb-1 font-mono w-24 inline-block">子网掩码</div>
              {renderBinaryArray(results.maskInt, true)}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700 border-dashed my-2"></div>

            {/* Result Row */}
            <div className="relative">
              <div className="text-blue-400 text-sm font-bold mb-1 font-mono w-24 inline-block">网络地址</div>
              {renderBinaryArray(results.networkInt, true)}
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                按位与(AND)运算：只有当 IP 和掩码的对应位都为 1 时，结果才为 1。主机位全被清零。
              </div>
            </div>
          </div>
        </div>

        {/* 结果数据面板 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="网络地址 (Network)" 
            value={results.networkStr} 
            desc="网段的起点，不可分配给主机"
            color="border-blue-500/30"
          />
          <StatCard 
            title="广播地址 (Broadcast)" 
            value={results.broadcastStr} 
            desc="网段的终点，用于发送给所有主机"
            color="border-purple-500/30"
          />
          <StatCard 
            title="可用主机数量" 
            value={results.usableCount.toLocaleString()} 
            desc={`2^(32 - ${cidr}) - 2`}
            color="border-emerald-500/30"
            isHighlight
          />
          <StatCard 
            title="可用 IP 范围" 
            value={results.usableRange} 
            desc="可分配给设备使用的 IP"
            color="border-amber-500/30"
          />
        </div>

      </div>
    </div>
  );
}

// 可复用的统计卡片组件
function StatCard({ title, value, desc, color, isHighlight }) {
  return (
    <div className={`bg-slate-800 rounded-xl p-5 border-t-4 shadow-lg ${color}`}>
      <h3 className="text-slate-400 text-sm font-medium mb-2">{title}</h3>
      <div className={`text-lg sm:text-xl font-bold font-mono mb-2 break-words ${isHighlight ? 'text-emerald-400' : 'text-slate-100'}`}>
        {value}
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

```
