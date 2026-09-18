import React, { useState } from 'react';

export default function SplitPayment() {
  const [totalCost, setTotalCost] = useState(20);
  const [peopleCount, setPeopleCount] = useState(2);

  const costPerPerson = peopleCount > 0 ? (totalCost / peopleCount).toFixed(2) : 0;

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Group Payment Split</h3>
      
      <div>
        <label>Total Trip Price ($): </label>
        <input 
          type="number" 
          value={totalCost} 
          onChange={(e) => setTotalCost(Number(e.target.value))} 
        />
      </div>

      <div style={{ marginTop: '10px' }}>
        <label>Number of People: </label>
        <button onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}>-</button>
        <span style={{ margin: '0 10px' }}>{peopleCount}</span>
        <button onClick={() => setPeopleCount(peopleCount + 1)}>+</button>
      </div>

      <hr />
      <h4>Each Person Pays: ${costPerPerson}</h4>
    </div>
  );
}