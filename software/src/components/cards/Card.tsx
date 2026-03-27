import LogoutButton from "../buttons/LogoutButton"
import SwitchButton from "../buttons/SwitchButton";
import { InfoItem } from "../../lib/types";
import { useEffect, useState } from "react";
import RemoveTextButton from "../buttons/RemoveTextButton";

export default function Card({
  infoData,
  switchFunc,
  onChangeText
}: {
  infoData?: InfoItem[];
  switchFunc?: () => void;
  onChangeText?: (values: string[]) => void;
}) {

    const infoLength = infoData ? infoData.length : 0;

    const [infoDescriptions, setInfoDescriptions] = useState<string[]>(infoData ? infoData.map(item => item.description) : []);

    useEffect(() => {
        if (infoData && infoDescriptions.length === 0) {
            setInfoDescriptions(infoData.map(item => item.description));
        }
    }, [infoData]);

    return (
        <div className="w-full h-auto my-8 py-5 px-6 relative rounded-[10px] bg-white shadow-[0px_4px_10px_0px_rgba(0,0,0,0.20)]">
            {infoLength === 1 && infoData ? 
                (infoData[0].editable ?
                    <div className="flex items-center justify-between">
                        <div className="flex justify-start text-sm font-normal sen-regular text-text-secondary">
                            {infoData[0].title}
                        </div>
                        <input 
                            className="flex text-right justify-end text-sm sen-semibold text-text-secondary" 
                            value={infoDescriptions[0]}
                            onChange={(e) => {
                                const newDescriptions = [...infoDescriptions];
                                newDescriptions[0] = e.target.value;
                                setInfoDescriptions(newDescriptions);

                                onChangeText?.(newDescriptions);
                            }}
                        />
                    </div>
                : 
                    <div className=" flex items-center justify-between">
                            <div className="flex justify-start text-sm font-normal sen-regular text-text-secondary">{infoData[0].title}</div>
                            <div className="flex text-right justify-end text-sm sen-semibold text-text-secondary">{infoDescriptions[0]}</div>
                    </div>
                )
            : infoData?.map((card, index) => (
                <div key={index} className={`${index !== infoLength - 1 ? 'mb-4' : ''}`}>
                    <div className={`flex items-center justify-between`}>

                        <div className="whitespace-nowrap flex justify-start text-sm font-normal sen-regular text-text-secondary">
                            {infoData[index].title}
                        </div>
                        
                        {infoData[index].editable ? (
                            <div className="w-full flex justify-end gap-1 items-center">
                                <input 
                                    className="w-full flex text-right justify-end text-sm sen-semibold text-text-secondary
                                        focus:outline-none 
                                        focus:border-none
                                        transition
                                    " 
                                    value={infoDescriptions[index]}
                                    onChange={(e) => {
                                        const newDescriptions = [...infoDescriptions];
                                        newDescriptions[index] = e.target.value;
                                        setInfoDescriptions(newDescriptions);

                                        onChangeText?.(newDescriptions);
                                    }}
                                />
                                <RemoveTextButton 
                                    onClick={() => {
                                        const newDescriptions = [...infoDescriptions];
                                        newDescriptions[index] = "";
                                        setInfoDescriptions(newDescriptions);
                                    }}
                                />
                            </div>
                        ) : (

                        <div className="flex text-right justify-end text-sm sen-semibold text-text-secondary">
                            {infoDescriptions[index]}
                        </div>

                        )}
                    </div>
                    {index !== infoLength - 1 && 
                        <div className="w-full h-[1px] bg-line-light mt-4 rounded-full"></div>
                    }
                </div>
            ))}
        </div>
    )
}
