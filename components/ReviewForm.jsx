import React, { useState } from 'react';

export default function ReviewForm() {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState([
    { rating: 5, comment: 'Train was on time and very clean!', user: 'Alex' }
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setReviews([{ rating, comment, user: 'You' }, ...reviews]);
    setComment('');
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '15px' }}>
      <h3>Route Reviews</h3>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Rating: </label>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((num) => (
              <option key={num} value={num}>{num} ⭐</option>
            ))}
          </select>
        </div>
        
        <div style={{ marginTop: '10px' }}>
          <textarea 
            placeholder="Write a review..." 
            value={comment} 
            onChange={(e) => setComment(e.target.value)}
            style={{ width: '100%', height: '60px' }}
          />
        </div>
        <button type="submit" style={{ marginTop: '5px' }}>Submit Review</button>
      </form>

      <hr />
      
      <h4>Recent Feedback</h4>
      {reviews.map((rev, i) => (
        <div key={i} style={{ backgroundColor: '#f9f9f9', padding: '8px', marginBottom: '8px', borderRadius: '4px' }}>
          <strong>{rev.user}</strong> — {'⭐'.repeat(rev.rating)}
          <p style={{ margin: '4px 0 0 0' }}>{rev.comment}</p>
        </div>
      ))}
    </div>
  );
}