import React from 'react';

export default function PriceComparison() {
  // Mock pricing data for demo lookup
  const prices = [
    { mode: 'Bus', price: 2.50, duration: '45 mins', icon: '🚌' },
    { mode: 'Train', price: 4.00, duration: '30 mins', icon: '🚆' },
    { mode: 'Uber', price: 18.50, duration: '20 mins', icon: '🚗' },
  ];

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '15px' }}>
      <h3>Price Comparison</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {prices.map((item, index) => (
          <li key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span>{item.icon} <strong>{item.mode}</strong> ({item.duration})</span>
            <strong>${item.price.toFixed(2)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}