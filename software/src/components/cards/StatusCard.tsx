import React from 'react'

export default function StatusCard({ isSafe }: { isSafe: boolean }) {



  return (
    <div 
        data-property-1={isSafe ? "safe" : "fire detected"} 
        className={`mt-2 mb-8 w-full h-48 relative shadow-[0px_4px_10px_0px_rgba(0,0,0,0.20)] absolute bg-gradient-to-l ${isSafe ? 'from-text-secondary to-secondary-navy' : 'from-secondary-light to-primary-light'} rounded-[10px]`}
    >
        <div className="flex flex-col px-6 py-6">
            <div className="flex justify-start text-line-light text-md sen-regular mb-10">Current status</div>
            <div className="flex justify-start items-center text-white text-4xl sen-semibold">{isSafe ? "safe" : "fire detected"}</div>
        </div>
    </div>
  )
}
