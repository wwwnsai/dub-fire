

export default function DeleteButton({onDelete}: {onDelete: () => void}) {
  return (
    <button 
        className="w-3 h-3 relative"
        onClick={onDelete}
    >
        <div className="w-3 h-3 left-0 top-0 absolute bg-background rounded-full"></div>
        <div className="w-[5.07px] h-0.5 left-[8px] top-[4.41px] absolute origin-top-left rotate-[135deg] bg-background outline outline-1 outline-offset-[-0.50px] outline-white"></div>
        <div className="w-[5.07px] h-0.5 left-[7.59px] top-[8px] absolute origin-top-left rotate-[-135deg] bg-background outline outline-1 outline-offset-[-0.50px] outline-white"></div>
    </button>
  )
}
