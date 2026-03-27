import React from 'react'

export default function RemoveTextButton({
    onClick 
}: {
    onClick: () => void;
}) {
  return (
    <button 
        type="button"
        onClick={onClick}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="6" cy="6" r="6" fill="#CAC7C9"/>
        <line x1="8" y1="3.70711" x2="3.70711" y2="8" stroke="white" stroke-linecap="round"/>
        <line x1="8.29289" y1="8" x2="4" y2="3.70711" stroke="white" stroke-linecap="round"/>
      </svg>
    </button>
  )
}
