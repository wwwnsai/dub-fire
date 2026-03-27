
import { InfoItem } from "../../lib/types";

export default function ButtonCard({
    title,
    triggerFunc,
    color = "text-text-secondary"
}: {
    title: string;
    triggerFunc: () => void;
    color?: string;
}) {

  return (
    <button
        className="w-full h-auto mb-8 py-5 px-6 relative rounded-[10px] bg-white shadow-[0px_4px_10px_0px_rgba(0,0,0,0.20)]
            hover:shadow-[0px_5px_15px_0px_rgba(0,0,0,0.20) transition
        "
        onClick={triggerFunc}
    >
        <div className="flex items-center justify-between">
            <div className={`flex justify-start text-sm font-normal sen-bold ${color}`}>
                {title}
            </div>
        </div>   
    </button>
  )
}
