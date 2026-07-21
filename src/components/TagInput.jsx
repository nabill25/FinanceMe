import React, { useState } from 'react';
import { X, Tag } from 'lucide-react';
import './TagInput.css';

export default function TagInput({ tags, onChange }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    let newTag = inputValue.trim().replace(/^#+/, '').replace(/,/g, '');
    if (newTag && !tags.includes(newTag)) {
      onChange([...tags, newTag]);
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="tag-input-container">
      <div className="tag-list">
        {tags.map((tag, index) => (
          <span key={index} className="tag-chip">
            <span className="tag-hash">#</span>{tag}
            <button 
              type="button" 
              className="tag-remove-btn"
              onClick={() => removeTag(index)}
              aria-label={`Hapus tag ${tag}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <div className="tag-input-wrapper">
          {tags.length === 0 && !inputValue && <Tag size={14} className="tag-icon-placeholder" />}
          <input
            type="text"
            className="tag-input-field"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? "Ketik tag & Spasi..." : ""}
          />
        </div>
      </div>
    </div>
  );
}
