import { InfoItem } from "../../lib/types";
import { useEffect, useState } from "react";
import RemoveTextButton from "../buttons/RemoveTextButton";
import NotiReqSwitchButton from "../buttons/NotiReqSwitchButton";

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

  const [infoDescriptions, setInfoDescriptions] = useState<string[]>([]);

  useEffect(() => {
    if (infoData) {
      setInfoDescriptions(infoData.map(item => item.description));
    }
  }, [infoData]);

  return (
    <div className="w-full h-auto my-8 py-5 px-6 rounded-[10px] bg-white shadow-[0px_4px_10px_rgba(0,0,0,0.20)]">
      
      {infoData?.map((item, index) => (
        <div key={index} className={`${index !== infoLength - 1 ? 'mb-4' : ''}`}>
          
          <div className="flex items-center justify-between">
            
            {/* Title */}
            <div className="whitespace-nowrap text-sm sen-regular text-text-secondary">
              {item.title}
            </div>

            {/* Right Side */}
            {item.editable ? (
              <div className="w-full flex justify-end gap-2 items-center">
                
                <input
                  className="
                    w-full text-right text-sm sen-semibold text-text-secondary
                    focus:outline-none border-none border-transparent
                    focus:border-none
                    transition
                  "
                  value={infoDescriptions[index] || ""}
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

                    onChangeText?.(newDescriptions); 
                  }}
                />
              </div>
            ) : item.title === "Enable Notification" ? (
              <NotiReqSwitchButton />
            ) : (
              <div className="text-sm sen-semibold text-text-secondary">
                {infoDescriptions[index]}
              </div>
            )}
          </div>

          {/* Divider */}
          {index !== infoLength - 1 && (
            <div className="w-full h-[1px] bg-line-light mt-4 rounded-full"></div>
          )}
        </div>
      ))}
    </div>
  );
}