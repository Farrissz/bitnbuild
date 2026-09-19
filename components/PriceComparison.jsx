import React from 'react';

// Seeded realistic route pricing database
const MOCK_PRICE_DATABASE = {
  "route-1": [
    { mode: 'Bus', price: 2.50, duration: '45 mins', icon: '🚌' },
    { mode: 'Train', price: 4.00, duration: '30 mins', icon: '🚆' },
    { mode: 'Uber', price: 18.50, duration: '20 mins', icon: '🚗' },
  ],
  "route-2": [
    { mode: 'Bus', price: 3.50, duration: '50 mins', icon: '🚌' },
    { mode: 'Train', price: 6.00, duration: '35 mins', icon: '🚆' },
    { mode: 'Uber', price: 24.00, duration: '25 mins', icon: '🚗' },
  ],
  "default": [
    { mode: 'Bus', price: 3.00, duration: '40 mins', icon: '🚌' },
    { mode: 'Train', price: 5.00, duration: '28 mins', icon: '🚆' },
    { mode: 'Uber', price: 20.00, duration: '22 mins', icon: '🚗' },
  ]
};

export default function PriceComparison({ routeId = "route-1" }) {
  // Look up prices by routeId from seeded database
  const prices = MOCK_PRICE_DATABASE[routeId] || MOCK_PRICE_DATABASE["default"];

  return (
    <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '16px', backgroundColor: '#ffffff' }}>
      <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Price Comparison</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {prices.map((item, index) => (
          <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: index === prices.length - 1 ? 'none' : '1px solid #f0f0f0' }}>
            <span>{item.icon} <strong>{item.mode}</strong> <small style={{ color: '#666' }}>({item.duration})</small></span>
            <strong style={{ fontSize: '1.05em', color: '#2e7d32' }}>${item.price.toFixed(2)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
