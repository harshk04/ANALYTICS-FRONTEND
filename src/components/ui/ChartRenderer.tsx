"use client";

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface ChartRendererProps {
  data: any;
  type: string;
  title?: string;
  className?: string;
  graph_type?: string;
  insight?: string;
}

export default function ChartRenderer({ data, type, title, className = "", graph_type, insight }: ChartRendererProps) {
  const { theme } = useTheme();

  // Indus Labs inspired theme-specific colors
  const getThemeColors = () => {
    if (theme === 'dark') {
      return {
        background: 'var(--background)',
        text: 'var(--text-primary)',
        grid: 'var(--border)',
        colors: [
          '#6366f1',             // Indus Labs primary indigo
          '#8b5cf6',             // Indus Labs purple accent
          '#10b981',             // Indus Labs emerald success
          '#f59e0b',             // Indus Labs amber warning
          '#ef4444',             // Indus Labs red error
          '#06b6d4',             // Indus Labs cyan
          '#ec4899',             // Indus Labs pink
          '#84cc16',             // Indus Labs lime
          '#f97316',             // Indus Labs orange
          '#a855f7'              // Indus Labs violet
        ],
        gradients: [
          'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
          'linear-gradient(135deg, #10b981 0%, #84cc16 100%)',
          'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
          'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
          'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
          'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
          'linear-gradient(135deg, #84cc16 0%, #10b981 100%)',
          'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
          'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)'
        ]
      };
    } else {
      return {
        background: 'var(--background)',
        text: 'var(--text-primary)',
        grid: 'var(--border)',
        colors: [
          '#6366f1',             // Indus Labs primary indigo
          '#8b5cf6',             // Indus Labs purple accent
          '#10b981',             // Indus Labs emerald success
          '#f59e0b',             // Indus Labs amber warning
          '#ef4444',             // Indus Labs red error
          '#06b6d4',             // Indus Labs cyan
          '#ec4899',             // Indus Labs pink
          '#84cc16',             // Indus Labs lime
          '#f97316',             // Indus Labs orange
          '#a855f7'              // Indus Labs violet
        ],
        gradients: [
          'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
          'linear-gradient(135deg, #10b981 0%, #84cc16 100%)',
          'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
          'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
          'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
          'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
          'linear-gradient(135deg, #84cc16 0%, #10b981 100%)',
          'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
          'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)'
        ]
      };
    }
  };

  const themeColors = getThemeColors();

  // Smart formatter that only adds currency symbols for appropriate fields
  const formatValue = (value: any, name?: string | number) => {
    if (typeof value !== 'number') return value;
    
    // Fields that should have currency formatting (excluding generic 'value' for employee/inventory data)
    const currencyFields = ['amount', 'price', 'cost', 'revenue', 'salary', 'wage', 'income', 'total', 'sum'];
    const nameStr = typeof name === 'string' ? name : String(name || '');
    const isCurrencyField = nameStr && currencyFields.some(field => 
      nameStr.toLowerCase().includes(field)
    );
    
    // Check if this is employee data (should not have currency formatting)
    const isEmployeeData = data && data.some((item: any) => 
      item.department || item.employee_name || item.employee_id
    );
    
    // Check if this is inventory data (should not have currency formatting)
    const isInventoryData = data && data.some((item: any) => 
      item.product_name || item.item_name || item.inventory_id || item.stock_id ||
      Object.keys(item).some(key => 
        ['inventory', 'stock', 'quantity', 'count', 'units', 'qty', 'available', 'remaining'].some(field => 
          key.toLowerCase().includes(field)
        )
      )
    );
    
    // Check if the data contains actual currency-related fields (excluding employee and inventory data)
    const hasCurrencyData = !isEmployeeData && !isInventoryData && data && data.some((item: any) => 
      Object.keys(item).some(key => 
        currencyFields.some(field => key.toLowerCase().includes(field)) ||
        (key.toLowerCase().includes('value') && 
         (item[key] > 1000 || // Likely currency if large numbers
          Object.keys(item).some(k => k.toLowerCase().includes('amount') || k.toLowerCase().includes('price'))))
      )
    );
    
    if (isCurrencyField || hasCurrencyData) {
      return `₹${value.toLocaleString()}`;
    }
    
    return value.toLocaleString();
  };

  // Universal data transformation function
  const transformDataForChart = (data: any[]): { data: any[]; xAxisKey: string; yAxisKey: string } => {
    if (!data || data.length === 0) {
      return { data: [], xAxisKey: 'name', yAxisKey: 'value' };
    }
    
    const firstItem = data[0];
    const allKeys = Object.keys(firstItem);
    
    
    // Comprehensive X-axis key detection (categorical data)
    const xAxisKeys = [
      'outlet_name', 'item_name', 'category_name', 'product_name', 'employee_name',
      'product', 'item', 'product_name', 'item_name', 'product_title',
      'department', 'category', 'employee', 'outlet', 'location',
      'sales_month', 'month', 'date', 'year', 'quarter', 'period',
      'name', 'label', 'title', 'description', 'x'
    ];
    
    // Comprehensive Y-axis key detection (numerical data)
    const yAxisKeys = [
      'total_sales', 'total_revenue', 'net_amount', 'amount', 'revenue', 'sales',
      'count', 'quantity', 'number', 'total', 'sum', 'value',
      'price', 'cost', 'profit', 'margin', 'percentage',
      'inventory', 'stock', 'stock_level', 'inventory_level', 'inventory_value',
      'stock_value', 'units', 'qty', 'available', 'remaining',
      'y', 'val', 'data', 'metric'
    ];
    
    // Find the best X-axis key
    let xAxisKey = xAxisKeys.find(key => firstItem.hasOwnProperty(key));
    if (!xAxisKey) {
      // Fallback: find any non-numeric key, but exclude small numbers that might be counts/IDs
      xAxisKey = allKeys.find(key => 
        (typeof firstItem[key] === 'string' || typeof firstItem[key] === 'object') ||
        (typeof firstItem[key] === 'number' && firstItem[key] > 1000) // Only large numbers for categorical
      ) || 'name';
    }
    
    // Find the best Y-axis key
    let yAxisKey = yAxisKeys.find(key => firstItem.hasOwnProperty(key));
    if (!yAxisKey) {
      // Fallback: find any numeric key (including 0 values)
      yAxisKey = allKeys.find(key => 
        typeof firstItem[key] === 'number'
      ) || 'value';
    }
    
    // If still no Y-axis key found, use the last key as fallback
    if (!yAxisKey || !firstItem.hasOwnProperty(yAxisKey)) {
      yAxisKey = allKeys[allKeys.length - 1] || 'value';
    }
    
    // Transform data to ensure consistent structure
    const transformedData = data.map(item => ({
      [xAxisKey]: item[xAxisKey] || 'Unknown',
      [yAxisKey]: typeof item[yAxisKey] === 'number' ? item[yAxisKey] : (typeof item[yAxisKey] === 'string' ? parseFloat(item[yAxisKey]) || 0 : 0)
    }));
    
    
    return { data: transformedData, xAxisKey, yAxisKey };
  };

  // Legacy functions for backward compatibility
  const getXAxisKey = (data: any[]) => {
    const result = transformDataForChart(data);
    return result.xAxisKey;
  };

  const getYAxisKey = (data: any[]) => {
    const result = transformDataForChart(data);
    return result.yAxisKey;
  };

  const renderChart = () => {
    try {
      if (!data || !Array.isArray(data)) {
        return (
          <div className="flex items-center justify-center h-full text-neutral-400">
            No data available
          </div>
        );
      }

    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-xl font-semibold text-gray-300 mb-2">No Data Available</div>
          <div className="text-sm text-gray-500 text-center max-w-xs">
            The chart is ready to display your data. Ask a question to generate visualizations.
          </div>
        </div>
      );
    }

    // Use universal data transformation
    const { data: transformedData, xAxisKey, yAxisKey } = transformDataForChart(data);
    const chartType = graph_type || type;
    
    
    // Create a unique key for the chart to force re-render when data changes
    const chartKey = `${title}-${JSON.stringify(transformedData.slice(0, 2))}`;
    

    switch (chartType.toLowerCase()) {
      case 'bar':
      case 'barchart':
      case 'column':
      case 'groupedbarchart':
      case 'grouped_bar':
      case 'grouped_bar_chart':
        return (
          <ResponsiveContainer key={chartKey} width="100%" height="100%">
            <BarChart data={transformedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} opacity={0.2} />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                tickLine={{ stroke: themeColors.grid }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                tickLine={{ stroke: themeColors.grid }}
                tickFormatter={(value) => formatValue(value)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                  border: `2px solid ${themeColors.colors[0]}`,
                  color: themeColors.text,
                  borderRadius: '16px',
                  boxShadow: theme === 'dark' 
                    ? '0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(96, 165, 250, 0.3)' 
                    : '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(37, 99, 235, 0.3)',
                  fontSize: '14px',
                  fontWeight: '500',
                  backdropFilter: 'blur(10px)'
                }}
                animationDuration={800}
                formatter={(value, name) => [formatValue(Number(value), name), name]}
                cursor={{ fill: themeColors.colors[0], fillOpacity: 0.1 }}
              />
              <Legend 
                wrapperStyle={{ 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: themeColors.text,
                  paddingTop: '10px'
                }}
              />
              <Bar 
                dataKey={yAxisKey} 
                fill={`url(#barGradient-${yAxisKey})`}
                radius={[12, 12, 0, 0]}
                animationBegin={0}
                animationDuration={1200}
                animationEasing="ease-out"
                stroke={themeColors.colors[0]}
                strokeWidth={2}
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}
              />
              <defs>
                <linearGradient id={`barGradient-${yAxisKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={themeColors.colors[0]} stopOpacity={0.9}/>
                  <stop offset="50%" stopColor={themeColors.colors[1] || themeColors.colors[0]} stopOpacity={0.8}/>
                  <stop offset="100%" stopColor={themeColors.colors[2] || themeColors.colors[0]} stopOpacity={0.7}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
      case 'linechart':
      case 'line_chart':
        return (
          <ResponsiveContainer key={chartKey} width="100%" height="100%">
            <LineChart data={transformedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} opacity={0.2} />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                tickLine={{ stroke: themeColors.grid }}
              />
              <YAxis 
                tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                tickLine={{ stroke: themeColors.grid }}
                tickFormatter={(value) => formatValue(value)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                  border: `2px solid ${themeColors.colors[0]}`,
                  color: themeColors.text,
                  borderRadius: '16px',
                  boxShadow: theme === 'dark' 
                    ? '0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(96, 165, 250, 0.3)' 
                    : '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(37, 99, 235, 0.3)',
                  fontSize: '14px',
                  fontWeight: '500',
                  backdropFilter: 'blur(10px)'
                }}
                animationDuration={800}
                formatter={(value, name) => [formatValue(Number(value), name), name]}
                cursor={{ stroke: themeColors.colors[0], strokeWidth: 2, strokeDasharray: '5 5' }}
              />
              <Legend 
                wrapperStyle={{ 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: themeColors.text,
                  paddingTop: '10px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey={yAxisKey} 
                stroke={`url(#lineGradient-${yAxisKey})`}
                strokeWidth={5}
                dot={{ 
                  fill: themeColors.colors[0], 
                  strokeWidth: 4, 
                  r: 8,
                  style: {
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                  }
                }}
                activeDot={{ 
                  r: 12, 
                  stroke: themeColors.colors[0], 
                  strokeWidth: 4, 
                  fill: theme === 'dark' ? '#ffffff' : '#f8fafc',
                  style: {
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                  }
                }}
                animationBegin={0}
                animationDuration={1000}
                animationEasing="ease-out"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                }}
              />
              <defs>
                <linearGradient id={`lineGradient-${yAxisKey}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={themeColors.colors[0]} stopOpacity={0.9}/>
                  <stop offset="50%" stopColor={themeColors.colors[1] || themeColors.colors[0]} stopOpacity={1}/>
                  <stop offset="100%" stopColor={themeColors.colors[2] || themeColors.colors[0]} stopOpacity={0.9}/>
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'piechart':
      case 'pie_chart':
      case 'donut':
      case 'donutchart':
        return (
          <ResponsiveContainer key={chartKey} width="100%" height="100%">
            <PieChart>
              <Pie
                data={transformedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                innerRadius={chartType.toLowerCase().includes('donut') ? 50 : 0}
                fill={themeColors.colors[0]}
                dataKey={yAxisKey}
                animationBegin={0}
                animationDuration={1000}
                animationEasing="ease-out"
                paddingAngle={3}
                cornerRadius={12}
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}
              >
                {transformedData.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#pieGradient-${index})`}
                    stroke={themeColors.background}
                    strokeWidth={3}
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                    }}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                  border: `2px solid ${themeColors.colors[0]}`,
                  color: themeColors.text,
                  borderRadius: '16px',
                  boxShadow: theme === 'dark' 
                    ? '0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(96, 165, 250, 0.3)' 
                    : '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(37, 99, 235, 0.3)',
                  fontSize: '14px',
                  fontWeight: '500',
                  backdropFilter: 'blur(10px)'
                }}
                animationDuration={800}
                formatter={(value, name) => [formatValue(Number(value), name), name]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={40}
                iconType="circle"
                formatter={(value, entry) => [(entry.payload as any)?.[xAxisKey] || value, value]}
                wrapperStyle={{ 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: themeColors.text,
                  paddingTop: '10px'
                }}
              />
              <defs>
                {transformedData.map((entry: any, index: number) => (
                  <linearGradient key={`pieGradient-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={themeColors.colors[index % themeColors.colors.length]} stopOpacity={1}/>
                    <stop offset="50%" stopColor={themeColors.colors[(index + 1) % themeColors.colors.length]} stopOpacity={0.9}/>
                    <stop offset="100%" stopColor={themeColors.colors[index % themeColors.colors.length]} stopOpacity={0.8}/>
                  </linearGradient>
                ))}
              </defs>
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
      case 'areachart':
      case 'area_chart':
      case 'stackedarea':
      case 'stacked_area':
        return (
          <ResponsiveContainer key={chartKey} width="100%" height="100%">
            <AreaChart data={transformedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} opacity={0.2} />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                tickLine={{ stroke: themeColors.grid }}
              />
              <YAxis 
                tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                tickLine={{ stroke: themeColors.grid }}
                tickFormatter={(value) => formatValue(value)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                  border: `2px solid ${themeColors.colors[0]}`,
                  color: themeColors.text,
                  borderRadius: '16px',
                  boxShadow: theme === 'dark' 
                    ? '0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(96, 165, 250, 0.3)' 
                    : '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(37, 99, 235, 0.3)',
                  fontSize: '14px',
                  fontWeight: '500',
                  backdropFilter: 'blur(10px)'
                }}
                animationDuration={800}
                formatter={(value, name) => [formatValue(Number(value), name), name]}
                cursor={{ stroke: themeColors.colors[0], strokeWidth: 2, strokeDasharray: '5 5' }}
              />
              <Legend 
                wrapperStyle={{ 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: themeColors.text,
                  paddingTop: '10px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey={yAxisKey} 
                stroke={`url(#areaGradient-${yAxisKey})`}
                fill={`url(#areaFillGradient-${yAxisKey})`}
                fillOpacity={0.4}
                strokeWidth={4}
                animationBegin={0}
                animationDuration={1000}
                animationEasing="ease-out"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                }}
              />
              <defs>
                <linearGradient id={`areaGradient-${yAxisKey}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={themeColors.colors[0]} stopOpacity={1}/>
                  <stop offset="50%" stopColor={themeColors.colors[1] || themeColors.colors[0]} stopOpacity={0.9}/>
                  <stop offset="100%" stopColor={themeColors.colors[2] || themeColors.colors[0]} stopOpacity={1}/>
                </linearGradient>
                <linearGradient id={`areaFillGradient-${yAxisKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={themeColors.colors[0]} stopOpacity={0.6}/>
                  <stop offset="50%" stopColor={themeColors.colors[1] || themeColors.colors[0]} stopOpacity={0.4}/>
                  <stop offset="100%" stopColor={themeColors.colors[2] || themeColors.colors[0]} stopOpacity={0.2}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'summary_card':
      case 'summary':
        // Check if this should be a proper chart instead of summary card
        const isRevenueData = title?.toLowerCase().includes('revenue') || 
                             title?.toLowerCase().includes('sales') ||
                             data.some((item: any) => 
                               Object.keys(item).some(key => 
                                 ['month', 'date', 'period', 'year', 'quarter'].some(period => 
                                   key.toLowerCase().includes(period)
                                 )
                               )
                             );
        
        // If it's revenue data with multiple data points, always render as a proper chart
        if (isRevenueData && data.length > 1) {
          return (
            <ResponsiveContainer key={chartKey} width="100%" height="100%">
              <LineChart data={transformedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} opacity={0.2} />
                <XAxis 
                  dataKey={xAxisKey} 
                  tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                  tickLine={{ stroke: themeColors.grid }}
                />
                <YAxis 
                  tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                  tickLine={{ stroke: themeColors.grid }}
                  tickFormatter={(value) => formatValue(value)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                    border: `2px solid ${themeColors.colors[0]}`,
                    color: themeColors.text,
                    borderRadius: '16px',
                    boxShadow: theme === 'dark' 
                      ? '0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(96, 165, 250, 0.3)' 
                      : '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(37, 99, 235, 0.3)',
                    fontSize: '14px',
                    fontWeight: '500',
                    backdropFilter: 'blur(10px)'
                  }}
                  animationDuration={800}
                  formatter={(value, name) => [formatValue(Number(value), name), name]}
                  cursor={{ stroke: themeColors.colors[0], strokeWidth: 2, strokeDasharray: '5 5' }}
                />
                <Line 
                  type="monotone" 
                  dataKey={yAxisKey} 
                  stroke={themeColors.colors[0]} 
                  strokeWidth={3}
                  dot={{ fill: themeColors.colors[0], strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: themeColors.colors[0], strokeWidth: 2, fill: themeColors.colors[1] }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          );
        }
        
        // For summary cards, show a beautiful animated single value or bar chart
        if (data.length === 1) {
          const value = data[0][yAxisKey];
          const label = data[0][xAxisKey];
          
          // For revenue data, show more context
          const isRevenueData = title?.toLowerCase().includes('revenue') || 
                               title?.toLowerCase().includes('sales');
          
          // If it's revenue data with only one point, show it as a simple summary
          if (isRevenueData) {
            // For revenue data, only show the main revenue value, ignore other fields
            const revenueValue = data[0][yAxisKey] || data[0]['revenue'] || data[0]['amount'] || data[0]['value'] || value;
            const revenueLabel = data[0][xAxisKey] || 'Revenue';
            
            // Find the count field (like "8") to show as months - be more specific about what constitutes a month count
            const countField = Object.keys(data[0]).find(key => {
              const value = data[0][key];
              const keyLower = key.toLowerCase();
              
              // Only consider fields that explicitly indicate duration/count, not specific month numbers
              const isDurationRelated = ['months', 'periods', 'count', 'duration', 'span', 'length', 'total_months', 'month_count'].some(durationWord => 
                keyLower.includes(durationWord)
              );
              
              // Exclude fields that represent specific months, years, or other non-duration values
              const isExcluded = [
                'id', 'index', 'rank', 'order', 'position', 'revenue', 'amount', 'value', 'total', 'sum', 'price', 'cost',
                'month', 'year', 'day', 'date', 'sales_month', 'revenue_month', 'period_month' // These represent specific time points, not durations
              ].some(excludeWord => 
                keyLower.includes(excludeWord)
              );
              
              const matches = typeof value === 'number' && 
                     value > 0 && 
                     value < 100 && 
                     isDurationRelated && 
                     !isExcluded;
              
              return matches;
            });
            const monthCount = countField ? data[0][countField] : null;
            
            return (
              <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
                <div className="text-8xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
                  {typeof revenueValue === 'number' ? formatValue(revenueValue) : revenueValue}
                </div>
                
                <div className="text-center space-y-2">
                  <div className="text-2xl text-gray-300 capitalize font-medium">
                    {revenueLabel}
                  </div>
                  {monthCount && (
                    <div className="text-lg text-gray-400">
                      {monthCount} months
                    </div>
                  )}
                </div>
                
                <div className="mt-4 w-32 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
              </div>
            );
          }
          
          return (
            <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
              <div className="text-8xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
                {typeof value === 'number' ? formatValue(value) : value}
              </div>
              
              <div className="text-2xl text-gray-300 capitalize font-medium">
                {label || 'Value'}
              </div>
              
              <div className="mt-4 w-32 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
            </div>
          );
        } else {
          // For multiple data points, use an animated bar chart
          
          // For revenue data with multiple points, show a proper bar chart
          const isRevenueData = title?.toLowerCase().includes('revenue') || 
                               title?.toLowerCase().includes('sales');
          
          if (isRevenueData) {
            return (
              <ResponsiveContainer key={chartKey} width="100%" height="100%">
                <BarChart data={transformedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} opacity={0.2} />
                <XAxis 
                  dataKey={xAxisKey} 
                  tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                  tickLine={{ stroke: themeColors.grid }}
                />
                <YAxis 
                  tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                  tickLine={{ stroke: themeColors.grid }}
                  tickFormatter={(value) => formatValue(value)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                    border: `2px solid ${themeColors.colors[0]}`,
                    color: themeColors.text,
                    borderRadius: '16px',
                    boxShadow: theme === 'dark' 
                      ? '0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(96, 165, 250, 0.3)' 
                      : '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(37, 99, 235, 0.3)',
                    fontSize: '14px',
                    fontWeight: '500',
                    backdropFilter: 'blur(10px)'
                  }}
                  animationDuration={800}
                  formatter={(value, name) => [formatValue(Number(value), name), name]}
                  cursor={{ fill: themeColors.colors[0], fillOpacity: 0.1 }}
                />
                <Legend 
                  wrapperStyle={{ 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: themeColors.text,
                    paddingTop: '10px'
                  }}
                />
                <Bar 
                  dataKey={yAxisKey} 
                  fill={`url(#gradient-${yAxisKey})`} 
                  radius={[12, 12, 0, 0]}
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
            );
          }
          
          // Default bar chart for other data
          return (
            <ResponsiveContainer key={chartKey} width="100%" height="100%">
              <BarChart data={transformedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} opacity={0.2} />
                <XAxis 
                  dataKey={xAxisKey} 
                  tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                  tickLine={{ stroke: themeColors.grid }}
                />
                <YAxis 
                  tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                  tickLine={{ stroke: themeColors.grid }}
                  tickFormatter={(value) => formatValue(value)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                    border: `2px solid ${themeColors.colors[0]}`,
                    color: themeColors.text,
                    borderRadius: '16px',
                    boxShadow: theme === 'dark' 
                      ? '0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(96, 165, 250, 0.3)' 
                      : '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(37, 99, 235, 0.3)',
                    fontSize: '14px',
                    fontWeight: '500',
                    backdropFilter: 'blur(10px)'
                  }}
                  animationDuration={800}
                  formatter={(value, name) => [formatValue(Number(value), name), name]}
                  cursor={{ fill: themeColors.colors[0], fillOpacity: 0.1 }}
                />
                <Legend 
                  wrapperStyle={{ 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: themeColors.text,
                    paddingTop: '10px'
                  }}
                />
                <defs>
                  <linearGradient id={`gradient-${yAxisKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={themeColors.colors[0]} stopOpacity={0.9}/>
                    <stop offset="50%" stopColor={themeColors.colors[1] || themeColors.colors[0]} stopOpacity={0.8}/>
                    <stop offset="100%" stopColor={themeColors.colors[2] || themeColors.colors[0]} stopOpacity={0.7}/>
                  </linearGradient>
                </defs>
                <Bar 
                  dataKey={yAxisKey} 
                  fill={`url(#gradient-${yAxisKey})`} 
                  radius={[12, 12, 0, 0]}
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          );
        }

      default:
        
        // Simple fallback that will definitely render
        if (data.length === 0) {
          return (
            <div className="flex items-center justify-center h-full text-red-400">
              No data to display
            </div>
          );
        }
        
        return (
          <ResponsiveContainer key={chartKey} width="100%" height="100%">
            <BarChart data={transformedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fill: themeColors.text }}
                axisLine={{ stroke: themeColors.grid }}
              />
              <YAxis 
                tick={{ fill: themeColors.text }}
                axisLine={{ stroke: themeColors.grid }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: themeColors.background, 
                  border: `1px solid ${themeColors.grid}`,
                  color: themeColors.text,
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey={yAxisKey} fill={themeColors.colors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
    } catch (error) {
      console.error('🚨 Chart rendering error:', error);
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-xl font-semibold text-red-300 mb-2">Chart Error</div>
          <div className="text-sm text-gray-400 text-center max-w-xs">
            Unable to render chart. Please try a different query.
          </div>
        </div>
      );
    }
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gentlePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
        @keyframes subtleGlow {
          0%, 100% { 
            box-shadow: 0 0 8px rgba(99, 102, 241, 0.2), 0 0 16px rgba(99, 102, 241, 0.1); 
          }
          50% { 
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.3), 0 0 24px rgba(99, 102, 241, 0.15); 
          }
        }
        @keyframes smoothFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes gentleScale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes dataEntry {
          from { 
            opacity: 0; 
            transform: scale(0.8) translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-slide-up {
          animation: slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
        }
        .animate-gentle-pulse {
          /* Animation removed for static display */
        }
        .animate-subtle-glow {
          /* Animation removed for static display */
        }
        .animate-smooth-float {
          /* Animation removed for static display */
        }
        .animate-gentle-scale {
          /* Animation removed for static display */
        }
        .animate-shimmer {
          /* Animation removed for static display */
        }
        .animate-data-entry {
          animation: dataEntry 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chart-container {
          background: ${theme === 'dark' 
            ? 'rgba(255, 255, 255, 0.06)' 
            : 'rgba(255, 255, 255, 0.85)'
          };
          border: 1px solid ${theme === 'dark' 
            ? 'rgba(255, 255, 255, 0.12)' 
            : 'rgba(99, 102, 241, 0.15)'
          };
          backdrop-filter: blur(25px);
          border-radius: 16px;
          padding: 20px;
          box-shadow: ${theme === 'dark' 
            ? '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.08)' 
            : '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
          };
          transition: all var(--animation-duration-normal) var(--animation-easing-smooth);
        }
        .chart-container:hover {
          background: ${theme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(255, 255, 255, 0.9)'
          };
          border-color: ${theme === 'dark' 
            ? 'rgba(255, 255, 255, 0.2)' 
            : 'rgba(99, 102, 241, 0.25)'
          };
          box-shadow: ${theme === 'dark' 
            ? '0 12px 40px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.12)' 
            : '0 12px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          };
          backdrop-filter: blur(30px);
          transform: translateY(-2px);
        }
      `}</style>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-center animate-fade-in" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
      )}
      <div className="w-full h-full min-h-[200px] chart-container">
        {renderChart()}
      </div>
    </div>
  );
}