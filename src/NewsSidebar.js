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

const getCategoryCount = (categoryName) => {
    // Static counts to match the image's numbers (10, 2, 1, 2, 2, 1, 1)
    if (categoryName === "All News") return 10;
    if (["Technology", "Sports", "Entertainment", "Business"].includes(categoryName)) return 2;
    if (["Politics", "Health"].includes(categoryName)) return 1;
    return 0;
};

// Map front-end name to the simple backend filter value
const getFilterValue = (categoryName) => 
    categoryName === "All News" ? "general" : categoryName.toLowerCase();


const NewsSidebar = ({ 
  // Props passed from MyGlobe.js
  categories, 
  categoryFilter, 
  setCategoryFilter,
  fetchNews, // The handler to re-fetch news
  sidebarCountry,
  countryNews,
  isLoadingNews,
  onClose // Handler for the "Hide Filters" button
}) => {
  
  const handleCategoryClick = (categoryName) => {
    const filterValue = getFilterValue(categoryName);
    
    // 1. Update the filter state in the parent (MyGlobe)
    setCategoryFilter(filterValue);
    
    // 2. Re-fetch news for the currently selected country with the new filter
    if (sidebarCountry) {
      fetchNews(sidebarCountry, filterValue);
    }
  };

  return (
    <div style={{
      // Full overlay container style
      position: 'absolute',
      top: 0,
      right: 0,
      width: '350px',
      height: '100vh',
      background: '#1c2132', // Dark background color
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
            background: '#4D96FF', // Blue color for button
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
          <span style={{ marginRight: '5px' }}>∇</span> Hide Filters
        </button>
      </div>

      {/* 2. Filter by Category Section */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '15px', 
        background: '#252a41', // Dark card background for the filters
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
                {/* Count Badge */}
                <span style={{ 
                  marginLeft: '8px', 
                  backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : '#252a41',
                  color: isActive ? '#fff' : '#ccc',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.8em'
                }}>
                  {getCategoryCount(cat)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Live News Map Title (Above the imaginary globe placeholder) */}
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
          10 total news
        </span>
      </div>
      
      {/* 4. Country News List (Below the filters/header, inside the sidebar) */}
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
                {/* Ensure news item title is correctly displayed */}
                {newsItem.url ? (
                  <a href={newsItem.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#4D96FF' }}>
                    <strong style={{ display: 'block' }}>{newsItem.title}</strong>
                  </a>
                ) : (
                  <strong style={{ color: '#fff' }}>{newsItem.title}</strong>
                )}
                <small style={{ color: '#aaa', display: 'block', marginTop: '5px' }}>
                  {newsItem.source && `Source: ${newsItem.source} `}
                  {newsItem.published && `| Published: ${newsItem.published}`}
                </small>
              </li>
            ))
          ) : (
            <li style={{ color: '#ccc' }}>No news found for this category/country combination.</li>
          )}
        </ul>
      )}

    </div>
  );
};

export default NewsSidebar;