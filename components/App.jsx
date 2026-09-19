import React from 'react';
import SplitPayment from './SplitPayment';
import PriceComparison from './PriceComparison';
import ReviewForm from './ReviewForm';

export default function App() {
  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', fontFamily: 'sans-serif', padding: '15px' }}>
      <h1>Person 3 Features</h1>
      <SplitPayment />
      <PriceComparison />
      <ReviewForm />
    </div>
  );
}