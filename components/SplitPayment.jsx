import React, { useState } from 'react';

export default function SplitPayment({ defaultTotal = 20.00 }) {
  const [totalCost, setTotalCost] = useState(defaultTotal);
  const [peopleCount, setPeopleCount] = useState(2);

  // Requirement #4: Pure UI calculation (total cost ÷ number of people)
  const costPerPerson = peopleCount > 0 ? (totalCost / peopleCount).toFixed(2) : '0.00';

  return (
    <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
      <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Group Payment Split</h3>
      
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Total Trip Price ($): </label>
        <input 
          type="number" 
          step="0.01"
          min="0"
          value={totalCost} 
          onChange={(e) => setTotalCost(Math.max(0, Number(e.target.value)))} 
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
        <label style={{ fontWeight: 'bold', marginRight: '12px' }}>Number of People: </label>
        <button 
          onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
          style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
        >-</button>
        <span style={{ margin: '0 12px', fontWeight: 'bold', fontSize: '1.1em' }}>{peopleCount}</span>
        <button 
          onClick={() => setPeopleCount(peopleCount + 1)}
          style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
        >+</button>
      </div>

      <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />
      
      <div style={{ backgroundColor: '#e8f5e9', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
        <h4 style={{ margin: 0, color: '#2e7d32' }}>Each Person Pays: ${costPerPerson}</h4>
      </div>
    </div>
  );
}
