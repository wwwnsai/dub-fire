const BackButton = ({color} : {color: string}) => {
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
        <svg width="9" height="15" viewBox="0 0 9 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.292893 6.65685C-0.0976311 7.04737 -0.0976311 7.68054 0.292893 8.07106L6.65685 14.435C7.04738 14.8255 7.68054 14.8255 8.07107 14.435C8.46159 14.0445 8.46159 13.4113 8.07107 13.0208L2.41421 7.36395L8.07107 1.7071C8.46159 1.31657 8.46159 0.683409 8.07107 0.292885C7.68054 -0.0976395 7.04738 -0.0976395 6.65685 0.292885L0.292893 6.65685ZM2 7.36395L2 6.36395H1L1 7.36395V8.36395H2V7.36395Z" 
                fill={colorHex}
            />
        </svg>
    );
};

export default BackButton;