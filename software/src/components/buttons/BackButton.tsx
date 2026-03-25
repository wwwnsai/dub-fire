

const BackButton = ({color, className, onClick} : {color: string, className?: string, onClick?: () => void}) => {
    let colorHex = '#ffffff';
    if (color === 'red') {
        colorHex = '#BB2234';
    } else if (color === 'black') {
        colorHex = '#000000';
    } else if (color === 'orange') {
        colorHex = '#FB8603';
    } else if (color === 'gray') {
        colorHex = '#5A5A5A';
    }
    return (
        <button 
            className={`w-7 h-7 relative ${className || ''}`}
            onClick={onClick}
        >
            <div 
                className="w-7 h-7 flex justify-center items-center left-0 top-0 absolute bg-white/70 rounded-full shadow-[0px_3px_15px_0px_rgba(0,0,0,0.25)] backdrop-blur-[2px]
                    hover:shadow-[0px_3px_15px_0px_rgba(0,0,0,0.35)] transition
                ">
                <svg width="9" height="15" viewBox="0 0 9 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.292893 6.65691C-0.097631 7.04743 -0.097631 7.6806 0.292893 8.07112L6.65685 14.4351C7.04738 14.8256 7.68054 14.8256 8.07107 14.4351C8.46159 14.0446 8.46159 13.4114 8.07107 13.0209L2.41421 7.36401L8.07107 1.70716C8.46159 1.31664 8.46159 0.68347 8.07107 0.292946C7.68054 -0.0975785 7.04738 -0.0975785 6.65685 0.292946L0.292893 6.65691ZM2 7.36401L2 6.36401H1L1 7.36401V8.36401H2V7.36401Z" 
                        fill={colorHex}
                    />
                </svg>
            </div>
        </button>
    );
};

export default BackButton;