// src/components/NewsSidebar.js

import React from 'react';

// --- Icon & Data Helpers ---
const getCategoryIcon = (category) => {
  switch (category) {
    case 'All News': return '📰';
    case 'Technology': return '💻';
    case 'Sports': return '⚽';
    case 'Entertainment': return '🎬';
    case 'Business': return '💼';
    case 'Politics': return '🏛️';
    case 'Health': return '⚕️';
    default: return '📍';
  }
};

// Map front-end name to the simple backend filter value
const getFilterValue = (categoryName) => 
    categoryName === "All News" ? "general" : categoryName.toLowerCase();


const NewsSidebar = ({ 
  // Props
  categories, 
  categoryFilter, 
  setCategoryFilter,
  onClose,
  sidebarCountry,
  countryNews,
  isLoadingNews,
}) => {
  
  const handleCategoryClick = (categoryName) => {
    const filterValue = getFilterValue(categoryName);
    setCategoryFilter(filterValue);
  };

  return (
    <div style={{
      // Full overlay container style
      position: 'absolute',
      top: 0,
      right: 0,
      width: '350px',
      height: '100vh',
      background: '#1c2132', 
      zIndex: 10,
      boxShadow: '-4px 0 10px rgba(0,0,0,0.5)',
      padding: '24px',
      overflowY: 'auto',
      color: '#e0e0e0',
      fontFamily: 'sans-serif'
    }}>
      
      {/* 1. Header and Hide Filters Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: 0, color: '#fff' }}>
          Geophic News
        </h1>
        <button 
          onClick={onClose} 
          style={{ 
            background: '#4D96FF', 
            color: 'white', 
            border: 'none', 
            padding: '8px 15px', 
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.9em'
          }}
        >
          <span style={{ marginRight: '5px' }}>∇</span> Hide Sidebar
        </button>
      </div>

      {/* 2. Filter by Category Section */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '15px', 
        background: '#252a41', 
        borderRadius: '8px' 
      }}>
        <h3 style={{ 
          color: '#fff', 
          fontSize: '1.1em', 
          marginBottom: '15px', 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <span style={{ marginRight: '8px', color: '#4D96FF' }}>∇</span> Filter by Category
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {categories.map((cat) => {
            const filterValue = getFilterValue(cat);
            const isActive = categoryFilter === filterValue;
            
            return (
              <button
                key={cat}
                style={{
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  fontWeight: '600',
                  backgroundColor: isActive ? '#4D96FF' : '#3c415e',
                  color: isActive ? '#fff' : '#ccc',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: isActive ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none',
                }}
                onClick={() => handleCategoryClick(cat)}
              >
                <span style={{ marginRight: '6px' }}>{getCategoryIcon(cat)}</span>
                {cat}
                {/* ⚡ THE COUNT BADGE IS REMOVED HERE */}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Live News Map Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ color: '#fff', fontSize: '1.2em', fontWeight: 'bold', margin: 0 }}>
          Live News Map
        </h3>
        <span style={{ color: '#aaa', fontSize: '0.9em', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
          <span style={{ 
            display: 'inline-block', 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: '#4D96FF', 
            marginRight: '5px' 
          }}></span>
          {/* Note: Kept the "10 total news" text below the map title as seen in the original image */}
          10 total news 
        </span>
      </div>
      
      {/* 4. Country News List */}
      <h2 style={{ color: '#fff', borderBottom: '1px solid #3c415e', paddingBottom: '10px', marginBottom: '15px', marginTop: '30px' }}>
        News for {sidebarCountry} ({categoryFilter !== 'general' ? categoryFilter : 'General'})
      </h2>
      
      {isLoadingNews ? (
        <p style={{ color: '#ccc' }}>Loading news...</p>
      ) : (
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {countryNews.length > 0 ? (
            countryNews.map((newsItem, idx) => (
              <li key={idx} style={{ marginBottom: "15px", background: '#3c415e', padding: '12px', borderRadius: '6px' }}>
                {newsItem.url ? (
                  <a href={newsItem.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#4D96FF' }}>
                    <strong style={{ display: 'block' }}>{newsItem.title}</strong>
                  </a>
                ) : (
                  <strong style={{ color: newsItem.title.startsWith("Error:") ? '#FF6B6B' : '#fff' }}>{newsItem.title}</strong>
                )}
                {(newsItem.source || newsItem.published) && (
                  <small style={{ color: '#aaa', display: 'block', marginTop: '5px' }}>
                    {newsItem.source && `Source: ${newsItem.source} `}
                    {newsItem.published && `| Published: ${newsItem.published}`}
                  </small>
                )}
              </li>
            ))
          ) : (
            <li style={{ color: '#ccc' }}>
              No news found for this category/country.
            </li>
          )}
        </ul>
      )}

    </div>
  );
};

export default NewsSidebar;