{/* <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
  <circle cx="5" cy="5" r="5" fill="#CAC7C9"/>
  <circle cx="21" cy="5" r="5" fill="#CAC7C9"/>
  <circle cx="21" cy="21" r="5" fill="#CAC7C9"/>
  <circle cx="5" cy="21" r="5" fill="#CAC7C9"/>
</svg> */}

const MenuButton = () => {
    return (
        <button className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
                <circle cx="5" cy="5" r="5" fill="#CAC7C9"/>
                <circle cx="21" cy="5" r="5" fill="#CAC7C9"/>
                <circle cx="21" cy="21" r="5" fill="#CAC7C9"/>
                <circle cx="5" cy="21" r="5" fill="#CAC7C9"/>
            </svg>
            <span className="text-gray-800">Menu</span>
        </button>
    );
}
