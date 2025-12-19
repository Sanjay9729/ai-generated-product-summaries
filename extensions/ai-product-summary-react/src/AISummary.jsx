import React, { useEffect, useState } from 'react';
import './AISummary.css';

const AISummary = () => {
  const [productSummary, setProductSummary] = useState('');
  const [enhancedTitle, setEnhancedTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getProductSummary = async () => {
    try {
      setLoading(true);

      // Get product ID from Shopify Analytics (available on product pages)
      const productGid = window.ShopifyAnalytics?.meta?.product?.gid;

      if (!productGid) {
        console.warn('Product GID not found');
        setLoading(false);
        return;
      }

      const shopUrl = window.location.hostname;
      const response = await fetch(
        `https://${shopUrl}/apps/ai-generated-product-summaries/api/get-product-summary?id=${productGid}`
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      if (data.productSummary) {
        setProductSummary(data.productSummary);
        setEnhancedTitle(data.enhancedTitle || '');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching AI product summary:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    getProductSummary();
  }, []);

  if (loading) {
    return (
      <div className="ai-summary-loading">
        <div className="ai-summary-spinner"></div>
        <p>Loading AI-enhanced description...</p>
      </div>
    );
  }

  if (error || !productSummary) {
    return null;
  }

  return (
    <div className="ai-product-summary">
      {enhancedTitle && (
        <h3 className="ai-summary-title">{enhancedTitle}</h3>
      )}
      <div className="ai-summary-description">
        <p>{productSummary}</p>
      </div>
      <div className="ai-summary-badge">
        <span>✨ AI Enhanced Description</span>
      </div>
    </div>
  );
};

export default AISummary;
