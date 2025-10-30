import LogoutButton from "../buttons/LogoutButton"

type InfoItem = { title: string; description: string };
type InfoCard = Record<string, InfoItem>;

export default function InfoCards({infoData}: {infoData?: InfoCard[]}) {

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
                                {item.description === "Switch" ? (
                                    // <Switch
                                    //     checked={item.description === "On"}
                                    //     onChange={() => handleToggle(item.id)}
                                    // />
                                    <p className="sen-regular text-text-secondary">Switch</p>
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
