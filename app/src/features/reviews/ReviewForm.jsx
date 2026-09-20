import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { shortName } from '../../lib/format';

// Without Firebase, reviews are kept on this device so the flow still works in a demo.
const LOCAL_KEY = 'sst-local-reviews';
const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch { return {}; }
};
const writeLocal = (all) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
};

const byNewest = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt));

export default function ReviewForm({ routeId, userId, onToast }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Fetch reviews for a given routeId from Firestore (or local storage in demo mode)
  useEffect(() => {
    if (!routeId) return undefined;
    if (!db) {
      setReviews((readLocal()[routeId] || []).sort(byNewest));
      return undefined;
    }

    const q = query(collection(db, "reviews"), where("routeId", "==", routeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLoadError('');
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort(byNewest));
    }, (error) => {
      console.warn("Firestore reviews listener failed:", error);
      setLoadError(error.message);
    });

    return () => unsubscribe();
  }, [routeId]);

  // Write to the reviews collection (routeId, userId, rating, comment)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { onToast?.('Pick a star rating first.'); return; }
    if (!comment.trim()) { onToast?.('Add a short comment about the transfer.'); return; }

    setIsSubmitting(true);
    const newReview = {
      routeId,
      userId: userId || 'anonymous',
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      if (db) {
        await addDoc(collection(db, "reviews"), newReview);
      } else {
        const all = readLocal();
        all[routeId] = [newReview, ...(all[routeId] || [])];
        writeLocal(all);
        setReviews(all[routeId]);
      }
      setComment('');
      setRating(0);
      onToast?.('Review posted.');
    } catch (err) {
      console.error("Error writing review to Firestore: ", err);
      onToast?.(`Review not posted: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-spidey-cardbg border border-spidey-border rounded-2xl p-4 mb-5">
        <h3 className="text-xs font-bold text-slate-300 mb-2.5">Rate your transfer experience</h3>
        <div className="flex gap-2 text-xl mb-3" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => setRating(n)}
              className={`transition-colors ${n <= rating ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400/70'}`}
            >
              <i className="fa-solid fa-star" aria-hidden="true" />
            </button>
          ))}
        </div>
        <textarea
          rows={2}
          placeholder="Was the bus timed correctly with the train arrival?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full bg-spidey-dark border border-spidey-border rounded-xl p-3 text-xs outline-none text-white focus:border-spidey-red resize-none mb-3"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-xs transition-colors border border-spidey-border"
        >
          {isSubmitting ? 'Posting…' : 'Post review'}
        </button>
        {!db && (
          <p className="text-[10px] text-slate-500 mt-2">
            Reviews are saved on this device only. Add Firebase keys in app/.env to share them with everyone.
          </p>
        )}
      </form>

      <h3 className="font-bold text-slate-300 mb-2.5 text-xs">
        Crowdsourced logs <span className="text-slate-500 font-medium">({reviews.length})</span>
      </h3>
      {loadError && <p className="text-[11px] text-amber-400 mb-2">Couldn’t load reviews: {loadError}</p>}
      {reviews.length === 0 ? (
        <p className="text-[11px] text-slate-400 bg-spidey-cardbg/60 border border-dashed border-spidey-border rounded-xl p-3.5">
          No reviews for this route yet. Rate the transfer after your trip to help the next rider.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {reviews.map((rev, i) => (
            <div key={rev.id || `${rev.createdAt}-${i}`} className="bg-spidey-cardbg border border-spidey-border p-3.5 rounded-xl">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-white">
                  {rev.userId === userId ? 'You' : shortName(rev.userId)}
                </span>
                <span className="text-amber-400 text-[10px]" aria-label={`${rev.rating} out of 5`}>
                  {Array.from({ length: rev.rating }, (_, k) => <i key={k} className="fa-solid fa-star" aria-hidden="true" />)}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">{rev.comment}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
