import LogoutButton from "../buttons/LogoutButton"
import SwitchButton from "../buttons/SwitchButton";

type InfoItem = { title: string; description: string };
type InfoCard = Record<string, InfoItem>;

export default function InfoCards({
  infoData,
  switchFunc
}: {
  infoData?: InfoCard[];
  switchFunc: () => void;
}) {

  return (
    <div>
        {infoData?.map((card, index) => (
            <div key={index} className="bg-white rounded-xl px-4 py-2 mb-4">
                <div className={"flex flex-col"}>
                    {Object.values(card).map((item, idx) => 
                        item.title === "Logout" ? (
                            <div key={idx}>
                                <LogoutButton /> 
                            </div>
                        ) : (
                            <div key={idx} className={`flex justify-between w-full ${idx < Object.values(card).length - 1 ? 'border-b' : ''} py-2 rounded`}>
                                <h3 
                                    className={`${item.title === "Email Notification" ? 'sen-regular' : 'sen-semibold'}`}
                                >
                                    {item.title}
                                </h3>
                                {item.title === "Email Notification" ? (console.log('Email Notification status:', item.description), 
                                    <SwitchButton status={item.description === "On"} switchFunc={switchFunc} />
                                ) : (
                                    <p className="sen-regular text-text-secondary">{item.description}</p>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>
        ))}
    </div>
  )
}
