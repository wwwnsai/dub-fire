

export default function SwitchButton({
  status,
  switchFunc
}: {
  status?: boolean;
  switchFunc: () => void;
}) {
  return (
    <button className="w-12 h-5 relative" onClick={switchFunc}>
      {/* Background */}
      <div
        className={`w-12 h-5 left-0 top-0 absolute rounded-[50px] transition-colors ${
          status ? 'bg-[#70E340]' : 'bg-[#CAC7C9]'
        }`}
      />
      {/* Knob */}
      <div
        className={`w-6 h-4 top-[2px] absolute bg-white rounded-[50px] transition-all ${
          status ? 'left-[22px]' : 'left-[2px]' 
        }`}
      />
    </button>
  );
}