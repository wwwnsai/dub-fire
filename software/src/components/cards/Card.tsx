import LogoutButton from "../buttons/LogoutButton"
import SwitchButton from "../buttons/SwitchButton";

type InfoItem = { title: string; description: string, editable?: boolean };

export default function Card({
  infoData,
  switchFunc
}: {
  infoData?: InfoItem[];
  switchFunc: () => void;
}) {

    const infoLength = infoData ? infoData.length : 0;
    const editable = infoData ? infoData[0].title === "Email Notification" : false;

    console.log("Info:", infoLength, infoData);

    return (
        <div className="w-full h-auto my-8 py-5 px-6 relative rounded-[10px] bg-white shadow-[0px_4px_10px_0px_rgba(0,0,0,0.20)]">
            {infoLength === 1 && infoData ? 
                <div className=" flex items-center justify-between">
                        <div className="flex justify-start text-sm font-normal sen-regular text-text-secondary">{infoData[0].title}</div>
                        <div className="flex text-right justify-end text-sm sen-semibold text-text-secondary">{infoData[0].description}</div>
                </div>
             : infoData?.map((card, index) => (
                <div key={index} className={`${index !== infoLength - 1 ? 'mb-4' : ''}`}>
                    <div className={`flex items-center justify-between`}>
                        <div className="flex justify-start text-sm font-normal sen-regular text-text-secondary">{infoData[index].title}</div>
                        <div className="flex text-right justify-end text-sm sen-semibold text-text-secondary">{infoData[index].description}</div>
                    </div>
                    {index !== infoLength - 1 && 
                        <div className="w-full h-[1px] bg-line-light mt-4 rounded-full"></div>
                    }
                </div>
            ))}
        </div>
    )
}
