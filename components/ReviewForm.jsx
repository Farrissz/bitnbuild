import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';

export default function ReviewForm({ routeId = "route-1", userId = "user-123" }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Requirement #3: Fetch reviews for a given routeId from Firestore
  useEffect(() => {
    if (!db) return; // Guard clause if Firebase config is loading
    
    const q = query(
      collection(db, "reviews"),
      where("routeId", "==", routeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(fetchedReviews);
    }, (error) => {
      console.warn("Firestore offline or not initialized, using local fallback state.");
    });

    return () => unsubscribe();
  }, [routeId]);

  // Requirement #1 & #3: Write to Firestore reviews collection (routeId, userId, rating, comment)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    const newReview = {
      routeId,
      userId,
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      if (db) {
        await addDoc(collection(db, "reviews"), newReview);
      } else {
        // Fallback for isolated testing
        setReviews(prev => [newReview, ...prev]);
      }
      setComment('');
    } catch (err) {
      console.error("Error writing review to Firestore: ", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '16px', backgroundColor: '#ffffff' }}>
      <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Route Reviews</h3>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '8px', fontWeight: 'bold' }}>Rating: </label>
          <select 
            value={rating} 
            onChange={(e) => setRating(Number(e.target.value))}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {[5, 4, 3, 2, 1].map((num) => (
              <option key={num} value={num}>{num} ⭐</option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <textarea 
            placeholder="Write a review for this route..." 
            value={comment} 
            onChange={(e) => setComment(e.target.value)}
            style={{ width: '100%', height: '65px', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ padding: '8px 16px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>

      <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />
      
      <h4 style={{ margin: '0 0 12px 0' }}>Feedback for Route ({reviews.length})</h4>
      {reviews.length === 0 ? (
        <p style={{ color: '#777', fontSize: '0.9em' }}>No reviews yet. Be the first to leave feedback!</p>
      ) : (
        reviews.map((rev, i) => (
          <div key={rev.id || i} style={{ backgroundColor: '#f8f9fa', padding: '10px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <strong>User: {rev.userId}</strong>
              <span>{'⭐'.repeat(rev.rating)}</span>
            </div>
            <p style={{ margin: 0, color: '#333' }}>{rev.comment}</p>
          </div>
        ))
      )}
    </div>
  );
}
